import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine, QrCode, LogIn, LogOut, Clock, Users2, FileText, X, Camera,
  CameraOff, Trash2, Contact, Upload, CheckCircle2, AlertTriangle, Maximize2,
  UserPlus, HeartHandshake, DoorOpen, Radio, Power, Plus,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import {
  PageHeader, Card, CardHeader, Button, Badge, Input, Select, Table, Th, Td,
  StatCard, EmptyState, ConfirmDialog, Field, Modal,
} from '@/components/ui';
import { fmtDate, initials, readFileAsDataURL, slugify, todayISO, downloadListePDF } from '@/lib/utils';
import { roleLabel } from '@/lib/labels';
import { badgeQrDataUrl, downloadBadgePDF, downloadVisiteurBadgePDF, parseBadgeQr, visiteurQrDataUrl } from '@/lib/badge';
import type { CategoriePresence, Pointage, Staff, Visiteur } from '@/types';

const fmtHeure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const fmtDuree = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h} h ${String(m).padStart(2, '0')}`;
};
const depuis = (iso: string, refMs: number) => {
  const min = Math.max(0, Math.round((refMs - new Date(iso).getTime()) / 60_000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
};

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Personne résolue (employé, accompagnant ou visiteur) pour l'affichage. */
type Personne = {
  key: string; // categorie:id (unique par personne)
  kind: 'staff' | 'visiteur';
  id: string;
  categorie: CategoriePresence;
  nom: string;
  prenom: string;
  code: string;
  sousTitre: string;
  photoUrl?: string;
};

const CAT_META: Record<CategoriePresence, { fr: string; en: string; tone: 'green' | 'amber' | 'purple'; icon: typeof Users2 }> = {
  employe: { fr: 'Employés', en: 'Employees', tone: 'green', icon: Users2 },
  accompagnant: { fr: 'Accompagnateurs', en: 'Companions', tone: 'amber', icon: HeartHandshake },
  visiteur: { fr: 'Visiteurs', en: 'Visitors', tone: 'purple', icon: DoorOpen },
};
const catLabel = (c: CategoriePresence, en: boolean) => (en ? CAT_META[c].en : CAT_META[c].fr);
const catLabelSing = (c: CategoriePresence, en: boolean) => (c === 'employe' ? (en ? 'Employee' : 'Employé') : c === 'accompagnant' ? (en ? 'Companion' : 'Accompagnant') : (en ? 'Visitor' : 'Visiteur'));

/** Regroupe les pointages d'une personne par jour et apparie entrées/sorties. */
function joursTravailles(evts: Pointage[]) {
  const byDay = new Map<string, Pointage[]>();
  for (const e of evts) {
    const day = e.horodatage.slice(0, 10);
    (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(e);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, list]) => {
      const sorted = list.slice().sort((a, b) => a.horodatage.localeCompare(b.horodatage));
      const entrees = sorted.filter((e) => e.type === 'entree');
      const sorties = sorted.filter((e) => e.type === 'sortie');
      let dureeMs = 0;
      let enCours: string | null = null;
      let anomalies = 0;
      for (const e of sorted) {
        if (e.type === 'entree') { if (enCours) anomalies++; enCours = e.horodatage; }
        else if (enCours) { dureeMs += new Date(e.horodatage).getTime() - new Date(enCours).getTime(); enCours = null; }
        else anomalies++;
      }
      return { day, entrees, sorties, dureeMs, incomplet: enCours !== null, anomalies };
    });
}

export default function PointagePage() {
  const store = useStore();
  const { staff, visiteurs, pointages, settings, addPointage, deletePointage, updateStaff, logAction } = store;
  const { canWrite } = useAuth();
  const { lang } = useT();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const editable = canWrite('grh');

  const [borneOpen, setBorneOpen] = useState(false);
  const [tab, setTab] = useState<'presents' | 'journal' | 'releves' | 'visiteurs' | 'badges'>('presents');
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth());
  const [annee, setAnnee] = useState(now.getFullYear());
  const [delTarget, setDelTarget] = useState<Pointage | null>(null);
  const [tick, setTick] = useState(Date.now());

  // Rafraîchissement « temps réel » : horloge interne toutes les 20 s + synchro
  // inter-onglets (borne sur un onglet/tablette, tableau des présents sur un autre).
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 20_000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'clinikdia-store') { useStore.persist?.rehydrate?.(); setTick(Date.now()); }
    };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage); };
  }, []);

  // ── Résolution des personnes ──
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const visiteurById = useMemo(() => new Map(visiteurs.map((v) => [v.id, v])), [visiteurs]);

  const personneDe = (p: Pointage): Personne | null => {
    if (p.staffId) {
      const s = staffById.get(p.staffId);
      if (!s) return null;
      return { key: `employe:${s.id}`, kind: 'staff', id: s.id, categorie: 'employe', nom: s.nom, prenom: s.prenom, code: s.code, sousTitre: roleLabel[s.role].label, photoUrl: s.photoUrl };
    }
    if (p.visiteurId) {
      const v = visiteurById.get(p.visiteurId);
      if (!v) return null;
      const st = v.categorie === 'accompagnant' ? (v.patientAccompagne ? `Accompagne ${v.patientAccompagne}` : 'Accompagnant') : (v.motif || 'Visiteur');
      return { key: `${v.categorie}:${v.id}`, kind: 'visiteur', id: v.id, categorie: v.categorie, nom: v.nom, prenom: v.prenom ?? '', code: v.code, sousTitre: st, photoUrl: v.photoUrl };
    }
    return null;
  };

  const today = todayISO();
  const duJour = useMemo(() => pointages.filter((p) => p.horodatage.startsWith(today)), [pointages, today]);

  // ── Présents en temps réel : dernier événement du jour = entrée ──
  const presents = useMemo(() => {
    const last = new Map<string, { p: Pointage; personne: Personne }>();
    for (const p of duJour) {
      const personne = personneDe(p);
      if (!personne) continue;
      const cur = last.get(personne.key);
      if (!cur || p.horodatage > cur.p.horodatage) last.set(personne.key, { p, personne });
    }
    const dedans = [...last.values()].filter((x) => x.p.type === 'entree');
    return {
      employe: dedans.filter((x) => x.personne.categorie === 'employe').sort((a, b) => a.p.horodatage.localeCompare(b.p.horodatage)),
      accompagnant: dedans.filter((x) => x.personne.categorie === 'accompagnant').sort((a, b) => a.p.horodatage.localeCompare(b.p.horodatage)),
      visiteur: dedans.filter((x) => x.personne.categorie === 'visiteur').sort((a, b) => a.p.horodatage.localeCompare(b.p.horodatage)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duJour, staffById, visiteurById, tick]);

  const totalPresents = presents.employe.length + presents.accompagnant.length + presents.visiteur.length;
  const badgesPhotos = staff.filter((s) => s.actif && s.photoUrl).length;

  // ── Relevé mensuel (employés) ──
  const prefix = `${annee}-${String(mois + 1).padStart(2, '0')}`;
  const duMois = pointages.filter((p) => p.horodatage.startsWith(prefix) && p.categorie === 'employe');
  const MOIS = lang === 'en' ? MOIS_EN : MOIS_FR;
  const periodeLabel = `${MOIS[mois]} ${annee}`;
  const releves = useMemo(() =>
    staff.filter((s) => s.actif).map((s) => {
      const jours = joursTravailles(duMois.filter((p) => p.staffId === s.id));
      return { s, jours, totalMs: jours.reduce((a, j) => a + j.dureeMs, 0) };
    }), [staff, duMois]);

  const exportReleve = (s: Staff) => {
    const jours = joursTravailles(duMois.filter((p) => p.staffId === s.id));
    const totalMs = jours.reduce((a, j) => a + j.dureeMs, 0);
    downloadListePDF(`pointage-${slugify(`${s.prenom}-${s.nom}`)}-${slugify(periodeLabel)}`, {
      settings, orientation: 'portrait',
      titre: `${L('Relevé de pointage','Time-clock report')} — ${s.prenom} ${s.nom} (${s.code})`,
      periode: periodeLabel,
      headers: [L('Date','Date'), L('Entrée(s)','In'), L('Sortie(s)','Out'), L('Temps de présence','Presence time'), L('Observation','Note')],
      aligns: ['left', 'left', 'left', 'right', 'left'],
      rows: jours.map((j) => [
        fmtDate(j.day),
        j.entrees.map((e) => `${fmtHeure(e.horodatage)}${e.methode === 'manuel' ? ' (m)' : ''}`).join(' · ') || '—',
        j.sorties.map((e) => `${fmtHeure(e.horodatage)}${e.methode === 'manuel' ? ' (m)' : ''}`).join(' · ') || '—',
        j.dureeMs ? fmtDuree(j.dureeMs) : '—',
        j.incomplet ? L('Sortie manquante','Missing exit') : j.anomalies ? L('Pointage irrégulier','Irregular punch') : '',
      ]),
      synthese: [
        { label: L('Jours travaillés','Days worked'), value: String(jours.length) },
        { label: L('Temps de présence total','Total presence time'), value: fmtDuree(totalMs) },
        { label: L('Pointages','Punches'), value: String(duMois.filter((p) => p.staffId === s.id).length) },
      ],
    });
  };

  const exportReleveGlobal = () => {
    downloadListePDF(`pointage-global-${slugify(periodeLabel)}`, {
      settings, orientation: 'portrait',
      titre: L('Relevé de pointage — synthèse du personnel','Time-clock report — staff summary'),
      periode: periodeLabel,
      headers: [L('Employé','Employee'), L('Fonction','Role'), L('Jours travaillés','Days worked'), L('Temps de présence','Presence time'), L('Pointages','Punches')],
      aligns: ['left', 'left', 'right', 'right', 'right'],
      rows: releves.map(({ s, jours, totalMs }) => [
        `${s.role === 'nephrologue' ? 'Dr ' : ''}${s.prenom} ${s.nom} (${s.code})`,
        roleLabel[s.role].label, String(jours.length),
        totalMs ? fmtDuree(totalMs) : '—',
        String(duMois.filter((p) => p.staffId === s.id).length),
      ]),
    });
  };

  return (
    <div>
      <PageHeader
        title={L('Borne de pointage','Time clock')}
        subtitle={`${totalPresents} ${L('présent(s) en temps réel','on-site now')} · ${duJour.length} ${L("pointage(s) aujourd'hui",'punch(es) today')}`}
        action={<Button onClick={() => setBorneOpen(true)}><Maximize2 size={16} /> {L('Ouvrir la borne','Open station')}</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={L('Employés présents','Employees on site')} value={presents.employe.length} icon={<Users2 size={18} />} tone="green" hint={`${L('sur','of')} ${staff.filter((s) => s.actif).length} ${L('actifs','active')}`} />
        <StatCard label={L('Accompagnateurs','Companions')} value={presents.accompagnant.length} icon={<HeartHandshake size={18} />} tone="amber" hint={L('dans les murs','on premises')} />
        <StatCard label={L('Visiteurs','Visitors')} value={presents.visiteur.length} icon={<DoorOpen size={18} />} tone="purple" hint={L('dans les murs','on premises')} />
        <StatCard label={L('Total présents','Total on site')} value={totalPresents} icon={<Radio size={18} />} tone="blue" hint={L('temps réel','real time')} />
      </div>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {([
          { id: 'presents', label: L('Présents (temps réel)','On site (live)'), icon: Radio },
          { id: 'journal', label: L('Journal du jour','Daily log'), icon: ScanLine },
          { id: 'releves', label: L('Relevés mensuels','Monthly reports'), icon: FileText },
          { id: 'visiteurs', label: L('Visiteurs & accompagnants','Visitors & companions'), icon: Contact },
          { id: 'badges', label: L('Badges employés','Staff badges'), icon: Contact },
        ] as const).map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' + (tab === tb.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            <tb.icon size={16} /> {tb.label}
          </button>
        ))}
      </div>

      {/* ── Présents en temps réel ── */}
      {tab === 'presents' && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            {L('Mise à jour automatique','Auto refresh')} · {new Date(tick).toLocaleTimeString(lang === 'en' ? 'en-US' : 'fr-FR')}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {(['employe', 'accompagnant', 'visiteur'] as const).map((cat) => {
              const meta = CAT_META[cat];
              const metaLabel = catLabel(cat, lang === 'en');
              const list = presents[cat];
              return (
                <Card key={cat} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={'flex h-8 w-8 items-center justify-center rounded-lg ' + (cat === 'employe' ? 'bg-emerald-50 text-emerald-600' : cat === 'accompagnant' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600')}>
                        <meta.icon size={16} />
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{metaLabel}</span>
                    </div>
                    <Badge tone={meta.tone}>{list.length}</Badge>
                  </div>
                  <div className="max-h-[28rem] divide-y divide-slate-50 overflow-y-auto">
                    {list.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-slate-400">{L('Aucun présent','Nobody on site')}</div>
                    ) : list.map(({ p, personne }) => (
                      <div key={personne.key} className="flex items-center gap-3 px-5 py-3">
                        <PersonAvatar p={personne} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-800">{personne.prenom} {personne.nom}</div>
                          <div className="truncate text-xs text-slate-400">{personne.sousTitre}</div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><LogIn size={12} /> {fmtHeure(p.horodatage)}</div>
                          <div className="text-[11px] text-slate-400">{L('depuis','for')} {depuis(p.horodatage, tick)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Journal du jour ── */}
      {tab === 'journal' && (
        <Card>
          <CardHeader title={L('Pointages du jour','Today\'s punches')} subtitle={fmtDate(today)} />
          {duJour.length === 0 ? (
            <EmptyState icon={<ScanLine size={22} />} title={L('Aucun pointage aujourd\'hui','No punches today')} hint={L('Ouvrez la borne pour que le personnel et les visiteurs badgent leurs entrées et sorties.','Open the station so staff and visitors can badge in and out.')} />
          ) : (
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr><Th>{L('Heure','Time')}</Th><Th>{L('Personne','Person')}</Th><Th>{L('Catégorie','Category')}</Th><Th>{L('Type','Type')}</Th><Th>{L('Méthode','Method')}</Th>{editable && <Th className="text-right">{L('Actions','Actions')}</Th>}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {duJour.slice().sort((a, b) => b.horodatage.localeCompare(a.horodatage)).map((p) => {
                  const pers = personneDe(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <Td className="font-mono font-medium">{fmtHeure(p.horodatage)}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <PersonAvatar p={pers} />
                          <div>
                            <div className="font-medium text-slate-800">{pers ? `${pers.prenom} ${pers.nom}` : '—'}</div>
                            <div className="text-xs text-slate-400">{pers?.code}</div>
                          </div>
                        </div>
                      </Td>
                      <Td><Badge tone={CAT_META[p.categorie].tone}>{catLabelSing(p.categorie, lang === 'en')}</Badge></Td>
                      <Td>{p.type === 'entree' ? <Badge tone="green">{L('Entrée','In')}</Badge> : <Badge tone="slate">{L('Sortie','Out')}</Badge>}</Td>
                      <Td className="text-slate-500">{p.methode === 'qr' ? L('Badge QR','QR badge') : L('Saisie manuelle','Manual entry')}</Td>
                      {editable && (
                        <Td>
                          <div className="flex justify-end">
                            <button title={L('Supprimer ce pointage','Delete this punch')} onClick={() => setDelTarget(p)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* ── Relevés mensuels ── */}
      {tab === 'releves' && (
        <Card>
          <CardHeader
            title={L('Relevés mensuels du personnel','Staff monthly reports')}
            subtitle={L('Jours travaillés, entrées/sorties et temps de présence par employé','Days worked, in/out and presence time per employee')}
            action={
              <div className="flex items-center gap-2">
                <Select value={mois} onChange={(e) => setMois(Number(e.target.value))} className="!w-36">
                  {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </Select>
                <Select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="!w-24">
                  {[annee - 2, annee - 1, annee, annee + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y} value={y}>{y}</option>)}
                </Select>
                <Button size="sm" variant="secondary" onClick={exportReleveGlobal}><FileText size={15} /> {L('Synthèse PDF','Summary PDF')}</Button>
              </div>
            }
          />
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>{L('Employé','Employee')}</Th><Th>{L('Fonction','Role')}</Th><Th>{L('Jours travaillés','Days worked')}</Th><Th>{L('Temps de présence','Presence time')}</Th><Th className="text-right">{L('Relevé','Report')}</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {releves.map(({ s, jours, totalMs }) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar p={{ kind: 'staff', photoUrl: s.photoUrl, nom: s.nom, prenom: s.prenom, categorie: 'employe' } as Personne} />
                      <div>
                        <div className="font-medium text-slate-800">{s.role === 'nephrologue' ? 'Dr ' : ''}{s.prenom} {s.nom}</div>
                        <div className="text-xs text-slate-400">{s.code}</div>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge tone={roleLabel[s.role].tone}>{roleLabel[s.role].label}</Badge></Td>
                  <Td className="font-semibold">{jours.length}</Td>
                  <Td>{totalMs ? fmtDuree(totalMs) : '—'}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => exportReleve(s)} disabled={jours.length === 0}><FileText size={14} /> PDF</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── Visiteurs & accompagnants ── */}
      {tab === 'visiteurs' && <VisiteursTab editable={editable} />}

      {/* ── Badges employés ── */}
      {tab === 'badges' && <BadgesTab staff={staff.filter((s) => s.actif)} editable={editable} onPhoto={(id, url) => { updateStaff(id, { photoUrl: url }); logAction('update', 'grh', 'Photo de badge mise à jour'); }} />}

      <ConfirmDialog
        open={!!delTarget}
        title={L('Supprimer ce pointage','Delete this punch')}
        message={<span className="font-semibold text-slate-700">{delTarget && `${personneDe(delTarget)?.prenom ?? ''} ${personneDe(delTarget)?.nom ?? ''} — ${delTarget.type === 'entree' ? L('entrée','in') : L('sortie','out')} ${L('à','at')} ${fmtHeure(delTarget.horodatage)}`}</span>}
        onConfirm={() => delTarget && deletePointage(delTarget.id)}
        onClose={() => setDelTarget(null)}
      />

      {borneOpen && (
        <BorneKiosque
          staff={staff.filter((s) => s.actif)}
          visiteurs={visiteurs.filter((v) => v.actif)}
          pointages={pointages}
          settings={{ nom: settings.nom }}
          onClose={() => setBorneOpen(false)}
          onPointage={(evt) => addPointage(evt)}
        />
      )}
    </div>
  );
}

function PersonAvatar({ p }: { p?: Personne | null }) {
  const ring = p?.categorie === 'accompagnant' ? 'bg-amber-100 text-amber-700' : p?.categorie === 'visiteur' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700';
  const cls = `flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${ring}`;
  if (!p) return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">?</span>;
  return p.photoUrl
    ? <img src={p.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
    : <span className={cls}>{initials(p.nom, p.prenom)}</span>;
}

// ─── Onglet Visiteurs & accompagnants ────────────────────────────────────────
const MAX_PHOTO = 1024 * 1024;
const emptyVis = { nom: '', prenom: '', categorie: 'accompagnant' as 'accompagnant' | 'visiteur', motif: '', patientAccompagne: '', telephone: '', photoUrl: '' };

function VisiteursTab({ editable }: { editable: boolean }) {
  const { visiteurs, settings, addVisiteur, updateVisiteur, deleteVisiteur } = useStore();
  const { lang } = useT();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyVis });
  const [del, setDel] = useState<Visiteur | null>(null);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let dead = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const v of visiteurs) out[v.id] = await visiteurQrDataUrl(v.id);
      if (!dead) setQrs(out);
    })();
    return () => { dead = true; };
  }, [visiteurs]);

  const uploadForm = async (file?: File | null) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_PHOTO) { setError(L('Photo trop volumineuse (max 1 Mo).','Photo too large (max 1 MB).')); return; }
    set('photoUrl', await readFileAsDataURL(file));
  };

  const submit = () => {
    if (!form.nom.trim()) return;
    addVisiteur({
      nom: form.nom.trim(), prenom: form.prenom.trim() || undefined, categorie: form.categorie,
      motif: form.motif.trim() || undefined, patientAccompagne: form.patientAccompagne.trim() || undefined,
      telephone: form.telephone.trim() || undefined, photoUrl: form.photoUrl || undefined,
    });
    setForm({ ...emptyVis });
    setOpen(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{L('Créez une carte temporaire (accompagnant d\'un patient ou visiteur) avec code QR de pointage, puis téléchargez-la.','Create a temporary card (patient companion or visitor) with a check-in QR code, then download it.')}</p>
        {editable && <Button onClick={() => { setForm({ ...emptyVis }); setOpen(true); }}><UserPlus size={16} /> {L('Nouvelle carte','New card')}</Button>}
      </div>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

      {visiteurs.length === 0 ? (
        <EmptyState icon={<Contact size={22} />} title={L('Aucune carte visiteur','No visitor card')} hint={L('Créez une carte pour un accompagnant ou un visiteur.','Create a card for a companion or a visitor.')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiteurs.map((v) => {
            const accent = v.categorie === 'accompagnant' ? 'bg-amber-600' : 'bg-indigo-600';
            return (
              <Card key={v.id} className={'p-4 ' + (v.actif ? '' : 'opacity-60')}>
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                  <div className={'px-3 py-1.5 ' + accent}>
                    <div className="text-[11px] font-bold text-white">{settings.nom}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/80">{v.categorie === 'accompagnant' ? L('Accompagnant','Companion') : L('Visiteur','Visitor')}</div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3">
                    {v.photoUrl ? (
                      <img src={v.photoUrl} alt="" className="h-16 shrink-0 rounded border border-slate-200 object-cover" style={{ width: '3.25rem' }} />
                    ) : (
                      <span className={'flex h-16 shrink-0 items-center justify-center rounded border text-sm font-bold ' + (v.categorie === 'accompagnant' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700')} style={{ width: '3.25rem' }}>
                        {initials(v.nom, v.prenom ?? '')}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-800">{v.prenom} {v.nom}</div>
                      <div className="font-mono text-[11px] font-bold text-slate-500">{v.code}</div>
                      {v.categorie === 'accompagnant' && v.patientAccompagne && <div className="truncate text-[11px] text-slate-500">↳ {v.patientAccompagne}</div>}
                      {v.motif && <div className="truncate text-[11px] text-slate-400">{v.motif}</div>}
                    </div>
                    {qrs[v.id] && <img src={qrs[v.id]} alt="QR" className="h-14 w-14 shrink-0" />}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" className="flex-1" onClick={() => downloadVisiteurBadgePDF(v, settings)}><Contact size={14} /> {L('Carte PDF','Card PDF')}</Button>
                  {editable && (
                    <>
                      <button title={v.actif ? L('Révoquer la carte','Revoke card') : L('Réactiver','Reactivate')} onClick={() => updateVisiteur(v.id, { actif: !v.actif })}
                        className={'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ' + (v.actif ? 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600' : 'border-emerald-300 bg-emerald-50 text-emerald-600')}>
                        <Power size={15} />
                      </button>
                      <button title={L('Supprimer','Delete')} onClick={() => setDel(v)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={L('Nouvelle carte visiteur / accompagnant','New visitor / companion card')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{L('Annuler','Cancel')}</Button><Button onClick={submit}><Plus size={16} /> {L('Créer la carte','Create card')}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={L('Catégorie','Category')} className="col-span-2">
            <Select value={form.categorie} onChange={(e) => set('categorie', e.target.value)}>
              <option value="accompagnant">{L("Accompagnant d'un patient",'Patient companion')}</option>
              <option value="visiteur">{L('Visiteur','Visitor')}</option>
            </Select>
          </Field>
          <Field label={L('Prénom','First name')}><Input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Field>
          <Field label={L('Nom','Last name')}><Input value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          {form.categorie === 'accompagnant' && (
            <Field label={L('Patient accompagné','Patient accompanied')} className="col-span-2"><Input value={form.patientAccompagne} onChange={(e) => set('patientAccompagne', e.target.value)} placeholder={L('Nom du patient','Patient name')} /></Field>
          )}
          <Field label={L('Motif de la visite','Reason for visit')} className="col-span-2"><Input value={form.motif} onChange={(e) => set('motif', e.target.value)} placeholder={L('Ex. accompagnement séance, rendez-vous…','E.g. session support, appointment…')} /></Field>
          <Field label={L('Téléphone','Phone')}><Input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></Field>
          <Field label={L('Photo (optionnelle)','Photo (optional)')}>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <Upload size={15} /> {form.photoUrl ? L('Photo ajoutée','Photo added') : L('Téléverser','Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadForm(e.target.files?.[0])} />
            </label>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!del} title={L('Supprimer la carte','Delete card')} message={<span className="font-semibold text-slate-700">{del?.prenom} {del?.nom} ({del?.code})</span>}
        onConfirm={() => del && deleteVisiteur(del.id)} onClose={() => setDel(null)} />
    </div>
  );
}

// ─── Onglet Badges employés ──────────────────────────────────────────────────
function BadgesTab({ staff, editable, onPhoto }: { staff: Staff[]; editable: boolean; onPhoto: (id: string, url: string) => void }) {
  const { settings } = useStore();
  const { lang } = useT();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let dead = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const s of staff) out[s.id] = await badgeQrDataUrl(s.id);
      if (!dead) setQrs(out);
    })();
    return () => { dead = true; };
  }, [staff]);

  const upload = async (s: Staff, file?: File | null) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_PHOTO) { setError(`${L('Photo trop volumineuse pour','Photo too large for')} ${s.prenom} ${s.nom} (max 1 Mo).`); return; }
    onPhoto(s.id, await readFileAsDataURL(file));
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">{L("Ajoutez une photo d'identité puis téléchargez le badge (carte 85,6 × 54 mm) avec le code QR personnel de pointage.",'Add an ID photo then download the badge (85.6 × 54 mm card) with the personal check-in QR code.')}</p>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="bg-brand-600 px-3 py-1.5">
                <div className="text-[11px] font-bold text-white">{settings.nom}</div>
                <div className="text-[8px] uppercase tracking-wider text-teal-100">{L('Badge personnel — pointage','Staff badge — time clock')}</div>
              </div>
              <div className="flex items-center gap-3 bg-white p-3">
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt="" className="h-16 shrink-0 rounded border border-slate-200 object-cover" style={{ width: '3.25rem' }} />
                ) : (
                  <span className="flex h-16 shrink-0 items-center justify-center rounded border border-teal-100 bg-teal-50 text-sm font-bold text-brand-700" style={{ width: '3.25rem' }}>
                    {initials(s.nom, s.prenom)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-800">{s.role === 'nephrologue' ? 'Dr ' : ''}{s.prenom} {s.nom.toUpperCase()}</div>
                  <div className="truncate text-[11px] text-slate-500">{roleLabel[s.role].label}</div>
                  <div className="mt-0.5 font-mono text-[11px] font-bold text-brand-700">{s.code}</div>
                </div>
                {qrs[s.id] && <img src={qrs[s.id]} alt="QR" className="h-14 w-14 shrink-0" />}
              </div>
              <div className="bg-brand-600 py-0.5 text-center text-[7px] text-teal-100">{settings.adresse}</div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {editable && (
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                  <Upload size={14} /> {s.photoUrl ? L('Changer la photo','Change photo') : L('Ajouter une photo','Add a photo')}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(s, e.target.files?.[0])} />
                </label>
              )}
              <Button size="sm" className="flex-1" onClick={() => downloadBadgePDF(s, settings)}><Contact size={14} /> {L('Badge PDF','Badge PDF')}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Borne kiosque (plein écran, tablette) ───────────────────────────────────
type Splash = { p: Personne; type: 'entree' | 'sortie'; heure: string } | { error: string };

function BorneKiosque({ staff, visiteurs, pointages, settings, onClose, onPointage }: {
  staff: Staff[];
  visiteurs: Visiteur[];
  pointages: Pointage[];
  settings: { nom: string };
  onClose: () => void;
  onPointage: (evt: Omit<Pointage, 'id'>) => Pointage;
}) {
  const { lang } = useT();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const [horloge, setHorloge] = useState(new Date());
  const [camState, setCamState] = useState<'starting' | 'on' | 'off'>('starting');
  const [splash, setSplash] = useState<Splash | null>(null);
  const [code, setCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScan = useRef<Map<string, number>>(new Map());
  const splashRef = useRef<ReturnType<typeof setTimeout>>();
  const pointagesRef = useRef(pointages);
  pointagesRef.current = pointages;

  useEffect(() => {
    const t = setInterval(() => setHorloge(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const montrerSplash = (sp: Splash) => {
    clearTimeout(splashRef.current);
    setSplash(sp);
    splashRef.current = setTimeout(() => setSplash(null), 3000);
  };

  const pointer = (p: Personne, methode: 'qr' | 'manuel') => {
    const last = lastScan.current.get(p.key) ?? 0;
    if (Date.now() - last < 60_000) return; // anti-rebond 60 s
    lastScan.current.set(p.key, Date.now());

    const today = new Date().toISOString().slice(0, 10);
    const idField = p.kind === 'staff' ? 'staffId' : 'visiteurId';
    const derniers = pointagesRef.current
      .filter((x) => x[idField] === p.id && x.horodatage.startsWith(today))
      .sort((a, b) => b.horodatage.localeCompare(a.horodatage));
    const type: 'entree' | 'sortie' = derniers[0]?.type === 'entree' ? 'sortie' : 'entree';
    const evt = onPointage({
      categorie: p.categorie,
      staffId: p.kind === 'staff' ? p.id : undefined,
      visiteurId: p.kind === 'visiteur' ? p.id : undefined,
      type, horodatage: new Date().toISOString(), methode,
    });
    montrerSplash({ p, type, heure: fmtHeure(evt.horodatage) });
  };

  const persDeStaff = (s: Staff): Personne => ({ key: `employe:${s.id}`, kind: 'staff', id: s.id, categorie: 'employe', nom: s.nom, prenom: s.prenom, code: s.code, sousTitre: roleLabel[s.role].label, photoUrl: s.photoUrl });
  const persDeVis = (v: Visiteur): Personne => ({ key: `${v.categorie}:${v.id}`, kind: 'visiteur', id: v.id, categorie: v.categorie, nom: v.nom, prenom: v.prenom ?? '', code: v.code, sousTitre: v.motif ?? '', photoUrl: v.photoUrl });

  const scanTexte = (texte: string, methode: 'qr' | 'manuel') => {
    const parsed = parseBadgeQr(texte);
    if (parsed?.kind === 'staff') { const s = staff.find((x) => x.id === parsed.id); if (s) return pointer(persDeStaff(s), methode); }
    if (parsed?.kind === 'visiteur') { const v = visiteurs.find((x) => x.id === parsed.id); if (v) return pointer(persDeVis(v), methode); }
    // Saisie manuelle par matricule / code
    const t = texte.trim().toLowerCase();
    const s = staff.find((x) => x.code.toLowerCase() === t);
    if (s) return pointer(persDeStaff(s), methode);
    const v = visiteurs.find((x) => x.code.toLowerCase() === t);
    if (v) return pointer(persDeVis(v), methode);
    montrerSplash({ error: L('Badge inconnu. Présentez une carte valide ou saisissez votre code.','Unknown badge. Present a valid card or type your code.') });
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval>;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCamState('on');
        const { default: jsQR } = await import('jsqr');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        timer = setInterval(() => {
          if (!video.videoWidth) return;
          const w = 320;
          const h = Math.round((video.videoHeight / video.videoWidth) * w);
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const qr = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (qr?.data) scanTexte(qr.data, 'qr');
        }, 350);
      } catch { setCamState('off'); }
    })();
    return () => { stop = true; clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManuel = () => {
    if (!code.trim()) return;
    scanTexte(code, 'manuel');
    setCode('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600"><ScanLine size={22} /></span>
          <div>
            <div className="text-sm font-bold">{settings.nom}</div>
            <div className="text-xs text-slate-400">{L('Borne de pointage — personnel & visiteurs','Time clock — staff & visitors')}</div>
          </div>
        </div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/20"><X size={20} /></button>
      </div>

      <div className="text-center">
        <div className="font-mono text-6xl font-bold tabular-nums tracking-tight sm:text-7xl">
          {horloge.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="mt-1 text-sm capitalize text-slate-400">
          {horloge.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-md flex-1 px-6">
        <div className="relative overflow-hidden rounded-3xl border-2 border-brand-500/40 bg-black" style={{ aspectRatio: '4 / 3' }}>
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {camState !== 'on' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-800 text-slate-400">
              {camState === 'starting' ? <Camera size={36} className="animate-pulse" /> : <CameraOff size={36} />}
              <span className="text-sm">{camState === 'starting' ? L('Démarrage de la caméra…','Starting camera…') : L('Caméra indisponible — utilisez la saisie manuelle','Camera unavailable — use manual entry')}</span>
            </div>
          )}
          {camState === 'on' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-44 w-44 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-slate-400">
          <QrCode size={16} /> {L('Présentez le code QR de votre badge ou carte devant la caméra','Present your badge or card QR code to the camera')}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitManuel()}
            placeholder={L('Ou saisissez votre code (ex. INF-01 / VIS-0001)','Or type your code (e.g. INF-01 / VIS-0001)')}
            className="!border-white/20 !bg-white/10 text-white placeholder:text-slate-500" />
          <Button onClick={submitManuel}>{L('Valider','Submit')}</Button>
        </div>
      </div>

      <div className="pb-4 text-center text-xs text-slate-600">{L('Un badgeage alterne automatiquement entrée puis sortie.','Each scan alternates automatically between in and out.')}</div>

      {splash && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/85 p-6 backdrop-blur-sm">
          {'error' in splash ? (
            <div className="w-full max-w-sm rounded-3xl bg-red-500/15 p-8 text-center ring-1 ring-red-400/40">
              <AlertTriangle size={44} className="mx-auto text-red-400" />
              <div className="mt-3 text-lg font-semibold text-red-200">{splash.error}</div>
            </div>
          ) : (
            <div className={'w-full max-w-sm rounded-3xl p-8 text-center ring-1 ' + (splash.type === 'entree' ? 'bg-emerald-500/15 ring-emerald-400/40' : 'bg-slate-500/15 ring-slate-400/40')}>
              {splash.p.photoUrl ? (
                <img src={splash.p.photoUrl} alt="" className="mx-auto h-20 w-20 rounded-full border-2 border-white/40 object-cover" />
              ) : (
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">{initials(splash.p.nom, splash.p.prenom)}</span>
              )}
              <div className="mt-3 text-xl font-bold">{splash.p.prenom} {splash.p.nom}</div>
              <div className="text-xs uppercase tracking-wide text-slate-400">{catLabelSing(splash.p.categorie, lang === 'en')}</div>
              <div className={'mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ' + (splash.type === 'entree' ? 'bg-emerald-500/25 text-emerald-200' : 'bg-slate-500/25 text-slate-200')}>
                {splash.type === 'entree' ? <LogIn size={16} /> : <LogOut size={16} />}
                {splash.type === 'entree' ? L('Entrée enregistrée','Check-in recorded') : L('Sortie enregistrée','Check-out recorded')} {L('à','at')} {splash.heure}
              </div>
              <CheckCircle2 size={30} className={'mx-auto mt-4 ' + (splash.type === 'entree' ? 'text-emerald-400' : 'text-slate-300')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
