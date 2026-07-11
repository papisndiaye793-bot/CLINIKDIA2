import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine, QrCode, LogIn, LogOut, Clock, Users2, FileText, X, Camera,
  CameraOff, Trash2, Contact, Upload, CheckCircle2, AlertTriangle, Maximize2,
  UserPlus, HeartHandshake, DoorOpen, Radio, Power, Plus,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
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

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

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

const CAT_META: Record<CategoriePresence, { label: string; tone: 'green' | 'amber' | 'purple'; icon: typeof Users2 }> = {
  employe: { label: 'Employés', tone: 'green', icon: Users2 },
  accompagnant: { label: 'Accompagnateurs', tone: 'amber', icon: HeartHandshake },
  visiteur: { label: 'Visiteurs', tone: 'purple', icon: DoorOpen },
};

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
      titre: `Relevé de pointage — ${s.prenom} ${s.nom} (${s.code})`,
      periode: periodeLabel,
      headers: ['Date', 'Entrée(s)', 'Sortie(s)', 'Temps de présence', 'Observation'],
      aligns: ['left', 'left', 'left', 'right', 'left'],
      rows: jours.map((j) => [
        fmtDate(j.day),
        j.entrees.map((e) => `${fmtHeure(e.horodatage)}${e.methode === 'manuel' ? ' (m)' : ''}`).join(' · ') || '—',
        j.sorties.map((e) => `${fmtHeure(e.horodatage)}${e.methode === 'manuel' ? ' (m)' : ''}`).join(' · ') || '—',
        j.dureeMs ? fmtDuree(j.dureeMs) : '—',
        j.incomplet ? 'Sortie manquante' : j.anomalies ? 'Pointage irrégulier' : '',
      ]),
      synthese: [
        { label: 'Jours travaillés', value: String(jours.length) },
        { label: 'Temps de présence total', value: fmtDuree(totalMs) },
        { label: 'Pointages', value: String(duMois.filter((p) => p.staffId === s.id).length) },
      ],
    });
  };

  const exportReleveGlobal = () => {
    downloadListePDF(`pointage-global-${slugify(periodeLabel)}`, {
      settings, orientation: 'portrait',
      titre: 'Relevé de pointage — synthèse du personnel',
      periode: periodeLabel,
      headers: ['Employé', 'Fonction', 'Jours travaillés', 'Temps de présence', 'Pointages'],
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
        title="Borne de pointage"
        subtitle={`${totalPresents} présent(s) en temps réel · ${duJour.length} pointage(s) aujourd'hui`}
        action={<Button onClick={() => setBorneOpen(true)}><Maximize2 size={16} /> Ouvrir la borne</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employés présents" value={presents.employe.length} icon={<Users2 size={18} />} tone="green" hint={`sur ${staff.filter((s) => s.actif).length} actifs`} />
        <StatCard label="Accompagnateurs" value={presents.accompagnant.length} icon={<HeartHandshake size={18} />} tone="amber" hint="dans les murs" />
        <StatCard label="Visiteurs" value={presents.visiteur.length} icon={<DoorOpen size={18} />} tone="purple" hint="dans les murs" />
        <StatCard label="Total présents" value={totalPresents} icon={<Radio size={18} />} tone="blue" hint="temps réel" />
      </div>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {([
          { id: 'presents', label: 'Présents (temps réel)', icon: Radio },
          { id: 'journal', label: 'Journal du jour', icon: ScanLine },
          { id: 'releves', label: 'Relevés mensuels', icon: FileText },
          { id: 'visiteurs', label: 'Visiteurs & accompagnants', icon: Contact },
          { id: 'badges', label: 'Badges employés', icon: Contact },
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
            Mise à jour automatique · {new Date(tick).toLocaleTimeString('fr-FR')}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {(['employe', 'accompagnant', 'visiteur'] as const).map((cat) => {
              const meta = CAT_META[cat];
              const list = presents[cat];
              return (
                <Card key={cat} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={'flex h-8 w-8 items-center justify-center rounded-lg ' + (cat === 'employe' ? 'bg-emerald-50 text-emerald-600' : cat === 'accompagnant' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600')}>
                        <meta.icon size={16} />
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{meta.label}</span>
                    </div>
                    <Badge tone={meta.tone}>{list.length}</Badge>
                  </div>
                  <div className="max-h-[28rem] divide-y divide-slate-50 overflow-y-auto">
                    {list.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-slate-400">Aucun présent</div>
                    ) : list.map(({ p, personne }) => (
                      <div key={personne.key} className="flex items-center gap-3 px-5 py-3">
                        <PersonAvatar p={personne} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-800">{personne.prenom} {personne.nom}</div>
                          <div className="truncate text-xs text-slate-400">{personne.sousTitre}</div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><LogIn size={12} /> {fmtHeure(p.horodatage)}</div>
                          <div className="text-[11px] text-slate-400">depuis {depuis(p.horodatage, tick)}</div>
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
          <CardHeader title="Pointages du jour" subtitle={fmtDate(today)} />
          {duJour.length === 0 ? (
            <EmptyState icon={<ScanLine size={22} />} title="Aucun pointage aujourd'hui" hint="Ouvrez la borne pour que le personnel et les visiteurs badgent leurs entrées et sorties." />
          ) : (
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr><Th>Heure</Th><Th>Personne</Th><Th>Catégorie</Th><Th>Type</Th><Th>Méthode</Th>{editable && <Th className="text-right">Actions</Th>}</tr>
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
                      <Td><Badge tone={CAT_META[p.categorie].tone}>{p.categorie === 'employe' ? 'Employé' : p.categorie === 'accompagnant' ? 'Accompagnant' : 'Visiteur'}</Badge></Td>
                      <Td>{p.type === 'entree' ? <Badge tone="green">Entrée</Badge> : <Badge tone="slate">Sortie</Badge>}</Td>
                      <Td className="text-slate-500">{p.methode === 'qr' ? 'Badge QR' : 'Saisie manuelle'}</Td>
                      {editable && (
                        <Td>
                          <div className="flex justify-end">
                            <button title="Supprimer ce pointage" onClick={() => setDelTarget(p)}
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
            title="Relevés mensuels du personnel"
            subtitle="Jours travaillés, entrées/sorties et temps de présence par employé"
            action={
              <div className="flex items-center gap-2">
                <Select value={mois} onChange={(e) => setMois(Number(e.target.value))} className="!w-36">
                  {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </Select>
                <Select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="!w-24">
                  {[annee - 2, annee - 1, annee, annee + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y} value={y}>{y}</option>)}
                </Select>
                <Button size="sm" variant="secondary" onClick={exportReleveGlobal}><FileText size={15} /> Synthèse PDF</Button>
              </div>
            }
          />
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>Employé</Th><Th>Fonction</Th><Th>Jours travaillés</Th><Th>Temps de présence</Th><Th className="text-right">Relevé</Th></tr>
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
        title="Supprimer ce pointage"
        message={<span className="font-semibold text-slate-700">{delTarget && `${personneDe(delTarget)?.prenom ?? ''} ${personneDe(delTarget)?.nom ?? ''} — ${delTarget.type === 'entree' ? 'entrée' : 'sortie'} à ${fmtHeure(delTarget.horodatage)}`}</span>}
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
    if (file.size > MAX_PHOTO) { setError('Photo trop volumineuse (max 1 Mo).'); return; }
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
        <p className="text-sm text-slate-500">Créez une carte temporaire (accompagnant d'un patient ou visiteur) avec code QR de pointage, puis téléchargez-la.</p>
        {editable && <Button onClick={() => { setForm({ ...emptyVis }); setOpen(true); }}><UserPlus size={16} /> Nouvelle carte</Button>}
      </div>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

      {visiteurs.length === 0 ? (
        <EmptyState icon={<Contact size={22} />} title="Aucune carte visiteur" hint="Créez une carte pour un accompagnant ou un visiteur." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiteurs.map((v) => {
            const accent = v.categorie === 'accompagnant' ? 'bg-amber-600' : 'bg-indigo-600';
            return (
              <Card key={v.id} className={'p-4 ' + (v.actif ? '' : 'opacity-60')}>
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                  <div className={'px-3 py-1.5 ' + accent}>
                    <div className="text-[11px] font-bold text-white">{settings.nom}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/80">{v.categorie === 'accompagnant' ? 'Accompagnant' : 'Visiteur'}</div>
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
                  <Button size="sm" className="flex-1" onClick={() => downloadVisiteurBadgePDF(v, settings)}><Contact size={14} /> Carte PDF</Button>
                  {editable && (
                    <>
                      <button title={v.actif ? 'Révoquer la carte' : 'Réactiver'} onClick={() => updateVisiteur(v.id, { actif: !v.actif })}
                        className={'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ' + (v.actif ? 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600' : 'border-emerald-300 bg-emerald-50 text-emerald-600')}>
                        <Power size={15} />
                      </button>
                      <button title="Supprimer" onClick={() => setDel(v)}
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

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle carte visiteur / accompagnant"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit}><Plus size={16} /> Créer la carte</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Catégorie" className="col-span-2">
            <Select value={form.categorie} onChange={(e) => set('categorie', e.target.value)}>
              <option value="accompagnant">Accompagnant d'un patient</option>
              <option value="visiteur">Visiteur</option>
            </Select>
          </Field>
          <Field label="Prénom"><Input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Field>
          <Field label="Nom"><Input value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          {form.categorie === 'accompagnant' && (
            <Field label="Patient accompagné" className="col-span-2"><Input value={form.patientAccompagne} onChange={(e) => set('patientAccompagne', e.target.value)} placeholder="Nom du patient" /></Field>
          )}
          <Field label="Motif de la visite" className="col-span-2"><Input value={form.motif} onChange={(e) => set('motif', e.target.value)} placeholder="Ex. accompagnement séance, rendez-vous…" /></Field>
          <Field label="Téléphone"><Input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></Field>
          <Field label="Photo (optionnelle)">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <Upload size={15} /> {form.photoUrl ? 'Photo ajoutée' : 'Téléverser'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadForm(e.target.files?.[0])} />
            </label>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!del} title="Supprimer la carte" message={<span className="font-semibold text-slate-700">{del?.prenom} {del?.nom} ({del?.code})</span>}
        onConfirm={() => del && deleteVisiteur(del.id)} onClose={() => setDel(null)} />
    </div>
  );
}

// ─── Onglet Badges employés ──────────────────────────────────────────────────
function BadgesTab({ staff, editable, onPhoto }: { staff: Staff[]; editable: boolean; onPhoto: (id: string, url: string) => void }) {
  const { settings } = useStore();
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
    if (file.size > MAX_PHOTO) { setError(`Photo trop volumineuse pour ${s.prenom} ${s.nom} (max 1 Mo).`); return; }
    onPhoto(s.id, await readFileAsDataURL(file));
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">Ajoutez une photo d'identité puis téléchargez le badge (carte 85,6 × 54 mm) avec le code QR personnel de pointage.</p>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="bg-brand-600 px-3 py-1.5">
                <div className="text-[11px] font-bold text-white">{settings.nom}</div>
                <div className="text-[8px] uppercase tracking-wider text-teal-100">Badge personnel — pointage</div>
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
                  <Upload size={14} /> {s.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(s, e.target.files?.[0])} />
                </label>
              )}
              <Button size="sm" className="flex-1" onClick={() => downloadBadgePDF(s, settings)}><Contact size={14} /> Badge PDF</Button>
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
    montrerSplash({ error: 'Badge inconnu. Présentez une carte valide ou saisissez votre code.' });
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
            <div className="text-xs text-slate-400">Borne de pointage — personnel & visiteurs</div>
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
              <span className="text-sm">{camState === 'starting' ? 'Démarrage de la caméra…' : 'Caméra indisponible — utilisez la saisie manuelle'}</span>
            </div>
          )}
          {camState === 'on' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-44 w-44 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-slate-400">
          <QrCode size={16} /> Présentez le code QR de votre badge ou carte devant la caméra
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitManuel()}
            placeholder="Ou saisissez votre code (ex. INF-01 / VIS-0001)"
            className="!border-white/20 !bg-white/10 text-white placeholder:text-slate-500" />
          <Button onClick={submitManuel}>Valider</Button>
        </div>
      </div>

      <div className="pb-4 text-center text-xs text-slate-600">Un badgeage alterne automatiquement entrée puis sortie.</div>

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
              <div className="text-xs uppercase tracking-wide text-slate-400">{splash.p.categorie === 'employe' ? 'Employé' : splash.p.categorie === 'accompagnant' ? 'Accompagnant' : 'Visiteur'}</div>
              <div className={'mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ' + (splash.type === 'entree' ? 'bg-emerald-500/25 text-emerald-200' : 'bg-slate-500/25 text-slate-200')}>
                {splash.type === 'entree' ? <LogIn size={16} /> : <LogOut size={16} />}
                {splash.type === 'entree' ? 'Entrée enregistrée' : 'Sortie enregistrée'} à {splash.heure}
              </div>
              <CheckCircle2 size={30} className={'mx-auto mt-4 ' + (splash.type === 'entree' ? 'text-emerald-400' : 'text-slate-300')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
