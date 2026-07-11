import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine, QrCode, LogIn, LogOut, Clock, Users2, FileText, X, Camera,
  CameraOff, Trash2, Contact, Upload, CheckCircle2, AlertTriangle, Maximize2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import {
  PageHeader, Card, CardHeader, Button, Badge, Input, Select, Table, Th, Td,
  StatCard, EmptyState, ConfirmDialog,
} from '@/components/ui';
import { fmtDate, initials, readFileAsDataURL, slugify, todayISO, downloadListePDF } from '@/lib/utils';
import { roleLabel } from '@/lib/labels';
import { badgeQrDataUrl, downloadBadgePDF, parseBadgeQr } from '@/lib/badge';
import type { Pointage, Staff } from '@/types';

const fmtHeure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const fmtDuree = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h} h ${String(m).padStart(2, '0')}`;
};

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** Regroupe les pointages d'un employé par jour et apparie entrées/sorties. */
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
      // Appariement chronologique entrée → sortie
      let dureeMs = 0;
      let enCours: string | null = null;
      let anomalies = 0;
      for (const e of sorted) {
        if (e.type === 'entree') {
          if (enCours) anomalies++; // double entrée sans sortie
          enCours = e.horodatage;
        } else if (enCours) {
          dureeMs += new Date(e.horodatage).getTime() - new Date(enCours).getTime();
          enCours = null;
        } else {
          anomalies++; // sortie sans entrée
        }
      }
      const incomplet = enCours !== null;
      return { day, entrees, sorties, dureeMs, incomplet, anomalies };
    });
}

export default function PointagePage() {
  const { staff, pointages, settings, addPointage, deletePointage, updateStaff, logAction } = useStore();
  const { canWrite } = useAuth();
  const editable = canWrite('grh');

  const [borneOpen, setBorneOpen] = useState(false);
  const [tab, setTab] = useState<'journal' | 'releves' | 'badges'>('journal');
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth());
  const [annee, setAnnee] = useState(now.getFullYear());
  const [delTarget, setDelTarget] = useState<Pointage | null>(null);

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const today = todayISO();
  const duJour = pointages.filter((p) => p.horodatage.startsWith(today));

  // Employés actuellement « dans les murs » : dernier événement du jour = entrée
  const presents = useMemo(() => {
    const last = new Map<string, Pointage>();
    for (const p of duJour) {
      const cur = last.get(p.staffId);
      if (!cur || p.horodatage > cur.horodatage) last.set(p.staffId, p);
    }
    return [...last.values()].filter((p) => p.type === 'entree');
  }, [duJour]);

  const badgesPhotos = staff.filter((s) => s.actif && s.photoUrl).length;

  // ── Relevé mensuel ──
  const prefix = `${annee}-${String(mois + 1).padStart(2, '0')}`;
  const duMois = pointages.filter((p) => p.horodatage.startsWith(prefix));
  const releves = useMemo(() => {
    return staff
      .filter((s) => s.actif)
      .map((s) => {
        const jours = joursTravailles(duMois.filter((p) => p.staffId === s.id));
        const totalMs = jours.reduce((a, j) => a + j.dureeMs, 0);
        return { s, jours, totalMs };
      })
      .filter((r) => r.jours.length > 0 || true);
  }, [staff, duMois]);

  const periodeLabel = `${MOIS[mois]} ${annee}`;

  const exportReleve = (s: Staff) => {
    const jours = joursTravailles(duMois.filter((p) => p.staffId === s.id));
    const totalMs = jours.reduce((a, j) => a + j.dureeMs, 0);
    downloadListePDF(`pointage-${slugify(`${s.prenom}-${s.nom}`)}-${slugify(periodeLabel)}`, {
      settings,
      orientation: 'portrait',
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
      settings,
      orientation: 'portrait',
      titre: 'Relevé de pointage — synthèse du personnel',
      periode: periodeLabel,
      headers: ['Employé', 'Fonction', 'Jours travaillés', 'Temps de présence', 'Pointages'],
      aligns: ['left', 'left', 'right', 'right', 'right'],
      rows: releves.map(({ s, jours, totalMs }) => [
        `${s.role === 'nephrologue' ? 'Dr ' : ''}${s.prenom} ${s.nom} (${s.code})`,
        roleLabel[s.role].label,
        String(jours.length),
        totalMs ? fmtDuree(totalMs) : '—',
        String(duMois.filter((p) => p.staffId === s.id).length),
      ]),
    });
  };

  return (
    <div>
      <PageHeader
        title="Borne de pointage"
        subtitle={`${presents.length} présent(s) · ${duJour.length} pointage(s) aujourd'hui`}
        action={
          <Button onClick={() => setBorneOpen(true)}>
            <Maximize2 size={16} /> Ouvrir la borne
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Présents actuellement" value={presents.length} icon={<Users2 size={18} />} tone="green" hint={`sur ${staff.filter((s) => s.actif).length} actifs`} />
        <StatCard label="Pointages du jour" value={duJour.length} icon={<ScanLine size={18} />} tone="blue" />
        <StatCard label="Pointages du mois" value={duMois.length} icon={<Clock size={18} />} tone="purple" hint={periodeLabel} />
        <StatCard label="Badges avec photo" value={`${badgesPhotos}/${staff.filter((s) => s.actif).length}`} icon={<Contact size={18} />} tone="teal" />
      </div>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {([
          { id: 'journal', label: "Journal du jour", icon: ScanLine },
          { id: 'releves', label: 'Relevés mensuels', icon: FileText },
          { id: 'badges', label: 'Badges', icon: Contact },
        ] as const).map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' + (tab === tb.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            <tb.icon size={16} /> {tb.label}
          </button>
        ))}
      </div>

      {/* ── Journal du jour ── */}
      {tab === 'journal' && (
        <Card>
          <CardHeader title="Pointages du jour" subtitle={fmtDate(today)} />
          {duJour.length === 0 ? (
            <EmptyState icon={<ScanLine size={22} />} title="Aucun pointage aujourd'hui" hint="Ouvrez la borne pour que le personnel badge ses entrées et sorties." />
          ) : (
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr><Th>Heure</Th><Th>Employé</Th><Th>Type</Th><Th>Méthode</Th>{editable && <Th className="text-right">Actions</Th>}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {duJour.slice().sort((a, b) => b.horodatage.localeCompare(a.horodatage)).map((p) => {
                  const s = staffById.get(p.staffId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <Td className="font-mono font-medium">{fmtHeure(p.horodatage)}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <StaffAvatar s={s} />
                          <div>
                            <div className="font-medium text-slate-800">{s ? `${s.prenom} ${s.nom}` : '—'}</div>
                            <div className="text-xs text-slate-400">{s?.code}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>{p.type === 'entree' ? <Badge tone="green">Entrée</Badge> : <Badge tone="amber">Sortie</Badge>}</Td>
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
            title="Relevés mensuels"
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
                      <StaffAvatar s={s} />
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
                      <Button size="sm" variant="outline" onClick={() => exportReleve(s)} disabled={jours.length === 0}>
                        <FileText size={14} /> PDF
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── Badges ── */}
      {tab === 'badges' && <BadgesTab staff={staff.filter((s) => s.actif)} editable={editable} onPhoto={(id, url) => { updateStaff(id, { photoUrl: url }); logAction('update', 'grh', 'Photo de badge mise à jour'); }} />}

      <ConfirmDialog
        open={!!delTarget}
        title="Supprimer ce pointage"
        message={<span className="font-semibold text-slate-700">{delTarget && `${staffById.get(delTarget.staffId)?.prenom ?? ''} ${staffById.get(delTarget.staffId)?.nom ?? ''} — ${delTarget.type === 'entree' ? 'entrée' : 'sortie'} à ${fmtHeure(delTarget.horodatage)}`}</span>}
        onConfirm={() => delTarget && deletePointage(delTarget.id)}
        onClose={() => setDelTarget(null)}
      />

      {borneOpen && (
        <BorneKiosque
          staff={staff.filter((s) => s.actif)}
          pointages={pointages}
          settings={{ nom: settings.nom }}
          onClose={() => setBorneOpen(false)}
          onPointage={(staffId, type, methode) => {
            const evt = addPointage({ staffId, type, horodatage: new Date().toISOString(), methode });
            return evt;
          }}
        />
      )}
    </div>
  );
}

function StaffAvatar({ s }: { s?: Staff }) {
  const cls = 'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-semibold text-brand-700';
  if (!s) return <span className={cls}>?</span>;
  return s.photoUrl
    ? <img src={s.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
    : <span className={cls}>{initials(s.nom, s.prenom)}</span>;
}

// ─── Onglet Badges : photos + aperçu + téléchargement ────────────────────────
const MAX_PHOTO = 1024 * 1024; // 1 Mo

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
      <p className="mb-4 text-sm text-slate-500">
        Ajoutez une photo d'identité puis téléchargez le badge (format carte 85,6 × 54 mm) avec le code QR personnel de pointage.
      </p>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <Card key={s.id} className="p-4">
            {/* Aperçu du badge */}
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="bg-brand-600 px-3 py-1.5">
                <div className="text-[11px] font-bold text-white">{settings.nom}</div>
                <div className="text-[8px] uppercase tracking-wider text-teal-100">Badge personnel — pointage</div>
              </div>
              <div className="flex items-center gap-3 bg-white p-3">
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt="" className="h-16 w-13 shrink-0 rounded border border-slate-200 object-cover" style={{ width: '3.25rem' }} />
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

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              {editable && (
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                  <Upload size={14} /> {s.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(s, e.target.files?.[0])} />
                </label>
              )}
              <Button size="sm" className="flex-1" onClick={() => downloadBadgePDF(s, settings)}>
                <Contact size={14} /> Badge PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Borne kiosque (plein écran, tablette) ───────────────────────────────────
type Splash = { s: Staff; type: 'entree' | 'sortie'; heure: string } | { error: string };

function BorneKiosque({ staff, pointages, settings, onClose, onPointage }: {
  staff: Staff[];
  pointages: Pointage[];
  settings: { nom: string };
  onClose: () => void;
  onPointage: (staffId: string, type: 'entree' | 'sortie', methode: 'qr' | 'manuel') => Pointage;
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

  /** Enregistre le pointage (bascule entrée/sortie) et affiche la confirmation. */
  const pointer = (s: Staff, methode: 'qr' | 'manuel') => {
    // Anti-rebond : ignore un même badge pendant 60 s
    const last = lastScan.current.get(s.id) ?? 0;
    if (Date.now() - last < 60_000) return;
    lastScan.current.set(s.id, Date.now());

    const today = new Date().toISOString().slice(0, 10);
    const duJour = pointagesRef.current
      .filter((p) => p.staffId === s.id && p.horodatage.startsWith(today))
      .sort((a, b) => b.horodatage.localeCompare(a.horodatage));
    const type: 'entree' | 'sortie' = duJour[0]?.type === 'entree' ? 'sortie' : 'entree';
    const evt = onPointage(s.id, type, methode);
    montrerSplash({ s, type, heure: fmtHeure(evt.horodatage) });
  };

  const montrerSplash = (sp: Splash) => {
    clearTimeout(splashRef.current);
    setSplash(sp);
    splashRef.current = setTimeout(() => setSplash(null), 3000);
  };

  const scanTexte = (texte: string, methode: 'qr' | 'manuel') => {
    const id = parseBadgeQr(texte);
    const s = staff.find((x) => x.id === id) ?? staff.find((x) => x.code.toLowerCase() === texte.trim().toLowerCase());
    if (s) pointer(s, methode);
    else montrerSplash({ error: 'Badge inconnu. Présentez un badge valide ou saisissez votre matricule.' });
  };

  // ── Caméra + décodage QR ──
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
      } catch {
        setCamState('off');
      }
    })();
    return () => {
      stop = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManuel = () => {
    if (!code.trim()) return;
    scanTexte(code, 'manuel');
    setCode('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900 text-white">
      {/* Bandeau */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600"><ScanLine size={22} /></span>
          <div>
            <div className="text-sm font-bold">{settings.nom}</div>
            <div className="text-xs text-slate-400">Borne de pointage du personnel</div>
          </div>
        </div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/20">
          <X size={20} />
        </button>
      </div>

      {/* Horloge */}
      <div className="text-center">
        <div className="font-mono text-6xl font-bold tabular-nums tracking-tight sm:text-7xl">
          {horloge.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="mt-1 text-sm capitalize text-slate-400">
          {horloge.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Zone caméra */}
      <div className="mx-auto mt-6 w-full max-w-md flex-1 px-6">
        <div className="relative overflow-hidden rounded-3xl border-2 border-brand-500/40 bg-black" style={{ aspectRatio: '4 / 3' }}>
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {camState !== 'on' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-800 text-slate-400">
              {camState === 'starting' ? <Camera size={36} className="animate-pulse" /> : <CameraOff size={36} />}
              <span className="text-sm">{camState === 'starting' ? 'Démarrage de la caméra…' : 'Caméra indisponible — utilisez la saisie manuelle'}</span>
            </div>
          )}
          {/* Viseur */}
          {camState === 'on' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-44 w-44 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-slate-400">
          <QrCode size={16} /> Présentez le code QR de votre badge devant la caméra
        </p>

        {/* Saisie manuelle */}
        <div className="mt-4 flex items-center gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManuel()}
            placeholder="Ou saisissez votre matricule (ex. INF-01)"
            className="!border-white/20 !bg-white/10 text-white placeholder:text-slate-500"
          />
          <Button onClick={submitManuel}>Valider</Button>
        </div>
      </div>

      <div className="pb-4 text-center text-xs text-slate-600">Un badgeage alterne automatiquement entrée puis sortie.</div>

      {/* Splash de confirmation */}
      {splash && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/85 p-6 backdrop-blur-sm">
          {'error' in splash ? (
            <div className="w-full max-w-sm rounded-3xl bg-red-500/15 p-8 text-center ring-1 ring-red-400/40">
              <AlertTriangle size={44} className="mx-auto text-red-400" />
              <div className="mt-3 text-lg font-semibold text-red-200">{splash.error}</div>
            </div>
          ) : (
            <div className={'w-full max-w-sm rounded-3xl p-8 text-center ring-1 ' + (splash.type === 'entree' ? 'bg-emerald-500/15 ring-emerald-400/40' : 'bg-amber-500/15 ring-amber-400/40')}>
              {splash.s.photoUrl ? (
                <img src={splash.s.photoUrl} alt="" className="mx-auto h-20 w-20 rounded-full border-2 border-white/40 object-cover" />
              ) : (
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">{initials(splash.s.nom, splash.s.prenom)}</span>
              )}
              <div className="mt-3 text-xl font-bold">{splash.s.prenom} {splash.s.nom}</div>
              <div className={'mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ' + (splash.type === 'entree' ? 'bg-emerald-500/25 text-emerald-200' : 'bg-amber-500/25 text-amber-200')}>
                {splash.type === 'entree' ? <LogIn size={16} /> : <LogOut size={16} />}
                {splash.type === 'entree' ? 'Entrée enregistrée' : 'Sortie enregistrée'} à {splash.heure}
              </div>
              <CheckCircle2 size={30} className={'mx-auto mt-4 ' + (splash.type === 'entree' ? 'text-emerald-400' : 'text-amber-400')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
