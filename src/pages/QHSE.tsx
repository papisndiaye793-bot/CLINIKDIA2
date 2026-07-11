import { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Flame,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Gauge,
  ClipboardCheck,
  CalendarClock,
  Droplet,
  Award,
  FileText,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Table,
  Th,
  Td,
  StatCard,
  RowActions,
  ConfirmDialog,
  DefList,
  DefRow,
  EmptyState,
} from '@/components/ui';
import { fmtDate, todayISO, downloadDashboardPDF, slugify } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import type { Extincteur, StatutConformite, Controle, DomaineQHSE, Certification, StatutCertification } from '@/types';

const tabs = [
  { id: 'apercu', key: 'qh.tab.overview', icon: Gauge },
  { id: 'incendie', key: 'qh.tab.fire', icon: Flame },
  { id: 'controles', key: 'qh.tab.checks', icon: ClipboardCheck },
  { id: 'certifications', key: 'qh.tab.certs', icon: Award },
] as const;

const CONF_COLORS: Record<StatutConformite, string> = {
  conforme: '#10b981',
  a_controler: '#f59e0b',
  non_conforme: '#ef4444',
};

export default function QHSE() {
  const {
    extincteurs, addExtincteur, updateExtincteur, deleteExtincteur,
    controles, addControle, updateControle, deleteControle,
    certifications, addCertification, updateCertification, deleteCertification,
    staff, settings, logAction,
  } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const editable = canWrite('qhse');
  const deletable = canDelete('qhse');

  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('apercu');

  // ─── Statistiques globales ─────────────────────────────────────────────
  const allStatuts = [...extincteurs.map((e) => e.statut), ...controles.map((c) => c.statut)];
  const total = allStatuts.length || 1;
  const conformes = allStatuts.filter((s) => s === 'conforme').length;
  const aControler = allStatuts.filter((s) => s === 'a_controler').length;
  const nonConformes = allStatuts.filter((s) => s === 'non_conforme').length;
  const taux = Math.round((conformes / total) * 100);

  const pieData = [
    { key: 'conforme', name: t('qh.compliant'), value: conformes },
    { key: 'a_controler', name: t('qh.toCheck'), value: aControler },
    { key: 'non_conforme', name: t('qh.nonCompliant'), value: nonConformes },
  ].filter((d) => d.value > 0);

  const exportPDF = () => {
    const today = todayISO();
    const extRetard = extincteurs.filter((e) => e.dateProchainControle < today).length;
    const ctlRetard = controles.filter((c) => c.dateProchainControle < today).length;
    const retards = extRetard + ctlRetard;
    const certsExpirees = certifications.filter((c) => c.dateExpiration && c.dateExpiration < today).length;
    const certsValides = certifications.filter((c) => c.statut === 'valide').length;

    const kpis = [
      { label: t('qh.rate'), value: `${taux}%`, hint: `${conformes}/${total} ${t('qh.compliant').toLowerCase()}` },
      { label: t('qh.compliant'), value: String(conformes) },
      { label: t('qh.toCheck'), value: String(aControler) },
      { label: t('qh.nonCompliant'), value: String(nonConformes) },
    ];

    const conformitePoints = [
      `Le taux de conformité global est de ${taux} % (${conformes} éléments conformes sur ${total} contrôlés : extincteurs et contrôles réglementaires).`,
      taux >= 80
        ? 'Le niveau de conformité est satisfaisant et conforme aux exigences réglementaires ; maintenir le rythme des contrôles périodiques.'
        : taux >= 60
          ? 'Le niveau de conformité est perfectible : planifier rapidement les contrôles des éléments non conformes ou en attente.'
          : "Le niveau de conformité est insuffisant et expose l'établissement à un risque réglementaire : un plan d'action correctif prioritaire est requis.",
    ];

    const echeancesPoints = [
      retards === 0
        ? 'Aucun contrôle en retard : les échéances de vérification sont respectées.'
        : `${retards} contrôle(s) en retard (${extRetard} extincteur(s), ${ctlRetard} contrôle(s) réglementaire(s)) — à régulariser sans délai.`,
      `${nonConformes} élément(s) non conforme(s) et ${aControler} à contrôler nécessitent une action de mise en conformité.`,
    ];

    const incendiePoints = [
      `Parc de sécurité incendie : ${extincteurs.length} extincteur(s) recensé(s), dont ${extincteurs.filter((e) => e.statut === 'conforme').length} conforme(s).`,
      extRetard
        ? `${extRetard} extincteur(s) au-delà de leur date de prochain contrôle : vérification à programmer avec le prestataire agréé.`
        : "Tous les extincteurs sont dans leur période de validité de contrôle.",
    ];

    const certPoints = [
      `${certifications.length} certification(s) suivie(s), dont ${certsValides} en cours de validité.`,
      certsExpirees
        ? `${certsExpirees} certification(s) expirée(s) : engager le renouvellement auprès des organismes concernés.`
        : 'Aucune certification expirée à ce jour.',
    ];

    downloadDashboardPDF(`qhse-tableau-de-bord-${slugify(todayISO())}`, {
      settings,
      titre: t('qh.title'),
      date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      kpis,
      analyse: [
        { titre: 'Conformité globale', points: conformitePoints },
        { titre: 'Échéances & non-conformités', points: echeancesPoints },
        { titre: 'Sécurité incendie', points: incendiePoints },
        { titre: 'Certifications', points: certPoints },
      ],
    });
  };

  return (
    <div>
      <PageHeader
        title={t('qh.title')}
        subtitle={t('qh.subtitle')}
        action={<Button variant="secondary" onClick={exportPDF}><FileText size={16} /> {t('common.downloadPdf')}</Button>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('qh.rate')} value={`${taux}%`} icon={<Gauge size={18} />} tone={taux >= 80 ? 'green' : taux >= 60 ? 'amber' : 'red'} hint={`${conformes}/${total}`} />
        <StatCard label={t('qh.compliant')} value={conformes} icon={<ShieldCheck size={18} />} tone="green" />
        <StatCard label={t('qh.toCheck')} value={aControler} icon={<AlertTriangle size={18} />} tone="amber" />
        <StatCard label={t('qh.nonCompliant')} value={nonConformes} icon={<AlertTriangle size={18} />} tone={nonConformes ? 'red' : 'green'} />
      </div>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' + (tab === tb.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}
          >
            <tb.icon size={16} /> {t(tb.key)}
          </button>
        ))}
      </div>

      {tab === 'apercu' && (
        <ApercuTab extincteurs={extincteurs} controles={controles} pieData={pieData} taux={taux} onGo={setTab} />
      )}
      {tab === 'incendie' && (
        <IncendieTab
          extincteurs={extincteurs}
          editable={editable}
          deletable={deletable}
          add={addExtincteur}
          update={updateExtincteur}
          remove={deleteExtincteur}
          log={logAction}
        />
      )}
      {tab === 'controles' && (
        <ControlesTab
          controles={controles}
          staff={staff}
          editable={editable}
          deletable={deletable}
          add={addControle}
          update={updateControle}
          remove={deleteControle}
          log={logAction}
        />
      )}
      {tab === 'certifications' && (
        <CertificationsTab
          certifications={certifications}
          editable={editable}
          deletable={deletable}
          add={addCertification}
          update={updateCertification}
          remove={deleteCertification}
          log={logAction}
        />
      )}
    </div>
  );
}

// ─── Vue d'ensemble ───────────────────────────────────────────────────────
function ApercuTab({
  extincteurs,
  controles,
  pieData,
  taux,
  onGo,
}: {
  extincteurs: Extincteur[];
  controles: Controle[];
  pieData: { key: string; name: string; value: number }[];
  taux: number;
  onGo: (t: 'incendie' | 'controles') => void;
}) {
  const { t } = useT();
  const L = useLabels();
  type Item = { id: string; ref: string; label: string; statut: StatutConformite; date: string; kind: 'incendie' | 'controles' };
  const items: Item[] = [
    ...extincteurs.map((e) => ({ id: e.id, ref: e.code, label: `${t('qh.extinguisher')} — ${e.emplacement}`, statut: e.statut, date: e.dateProchainControle, kind: 'incendie' as const })),
    ...controles.map((c) => ({ id: c.id, ref: c.code, label: c.libelle, statut: c.statut, date: c.dateProchainControle, kind: 'controles' as const })),
  ];
  const today = todayISO();
  const prioritaires = items
    .filter((i) => i.statut !== 'conforme' || i.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const prochains = [...items].filter((i) => i.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader title={t('qh.distribution')} />
        <div className="relative h-60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {pieData.map((d) => (
                  <Cell key={d.key} fill={CONF_COLORS[d.key as StatutConformite]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 top-[-30px] flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-slate-800">{taux}%</div>
            <div className="text-xs text-slate-400">{t('qh.compliant')}</div>
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title={t('qh.priorityActions')} subtitle={t('qh.prioritySub')} action={<AlertTriangle size={18} className="text-amber-500" />} />
        {prioritaires.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={22} />} title={t('qh.allCompliant')} hint={t('qh.noAction')} />
        ) : (
          <div className="divide-y divide-slate-100">
            {prioritaires.map((i) => {
              const st = L.statutConformite[i.statut];
              const enRetard = i.date < today;
              return (
                <button key={i.id} onClick={() => onGo(i.kind)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                  <span className={'flex h-8 w-8 items-center justify-center rounded-lg ' + (i.statut === 'non_conforme' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600')}>
                    {i.kind === 'incendie' ? <Flame size={16} /> : <Droplet size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700">{i.ref} — {i.label}</div>
                    <div className="text-xs text-slate-400">{t('qh.dueDate')} : {fmtDate(i.date)} {enRetard && <span className="font-medium text-red-500">· {t('qh.overdue')}</span>}</div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader title={t('qh.nextChecks')} subtitle={t('qh.nextChecksSub')} action={<CalendarClock size={18} className="text-brand-500" />} />
        {prochains.length === 0 ? (
          <EmptyState icon={<CalendarClock size={22} />} title={t('qh.noCheck')} />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {prochains.map((i) => (
              <div key={i.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">{i.ref}</span>
                  <Badge tone={L.statutConformite[i.statut].tone}>{L.statutConformite[i.statut].label}</Badge>
                </div>
                <div className="mt-1 truncate text-sm font-medium text-slate-700">{i.label}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400"><CalendarClock size={12} /> {fmtDate(i.date)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Onglet Sécurité incendie (extincteurs) ───────────────────────────────
const emptyExt = (n: number) => ({
  code: `EXT-${String(n).padStart(2, '0')}`,
  type: 'Poudre ABC',
  capacite: '6 kg',
  emplacement: '',
  dateInstallation: todayISO(),
  dateDernierControle: todayISO(),
  dateProchainControle: '',
  statut: 'conforme' as StatutConformite,
});

function IncendieTab({
  extincteurs, editable, deletable, add, update, remove, log,
}: {
  extincteurs: Extincteur[];
  editable: boolean;
  deletable: boolean;
  add: (e: Omit<Extincteur, 'id'>) => void;
  update: (id: string, e: Partial<Extincteur>) => void;
  remove: (id: string) => void;
  log: (a: 'create' | 'update' | 'delete', m: string, d: string) => void;
}) {
  const { t } = useT();
  const L = useLabels();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<Extincteur | null>(null);
  const [del, setDel] = useState<Extincteur | null>(null);
  const [form, setForm] = useState(emptyExt(1));
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditingId(null); setForm(emptyExt(extincteurs.length + 1)); setOpen(true); };
  const openEdit = (e: Extincteur) => { setEditingId(e.id); setForm({ ...e }); setOpen(true); };
  const submit = () => {
    if (!form.emplacement) return;
    if (editingId) { update(editingId, form); log('update', 'qhse', `Extincteur ${form.code} mis à jour`); }
    else { add(form); log('create', 'qhse', `Extincteur ${form.code} ajouté`); }
    setOpen(false); setEditingId(null);
  };

  return (
    <Card>
      <CardHeader
        title={t('qh.extRegister')}
        subtitle={`${extincteurs.length}`}
        action={editable ? <Button size="sm" onClick={openCreate}><Plus size={16} /> {t('qh.newExt')}</Button> : undefined}
      />
      <Table>
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr><Th>{t('cf.code')}</Th><Th>{t('cf.type')}</Th><Th>{t('qh.capacity')}</Th><Th>{t('qh.location')}</Th><Th>{t('qh.lastCheck')}</Th><Th>{t('qh.next')}</Th><Th>{t('qh.compliance')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {extincteurs.map((e) => {
            const st = L.statutConformite[e.statut];
            const enRetard = e.dateProchainControle < todayISO();
            return (
              <tr key={e.id} className="hover:bg-slate-50">
                <Td className="font-medium">{e.code}</Td>
                <Td>{e.type}</Td>
                <Td>{e.capacite}</Td>
                <Td className="max-w-xs whitespace-normal text-slate-600">{e.emplacement}</Td>
                <Td>{fmtDate(e.dateDernierControle)}</Td>
                <Td><span className={enRetard ? 'font-medium text-red-600' : ''}>{fmtDate(e.dateProchainControle)}</span></Td>
                <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                <Td>
                  <RowActions
                    onView={() => setView(e)}
                    onEdit={editable ? () => openEdit(e) : undefined}
                    onDelete={deletable ? () => setDel(e) : undefined}
                    extra={editable && e.statut !== 'conforme' ? (
                      <button title={t('qh.markChecked')} onClick={() => { update(e.id, { statut: 'conforme', dateDernierControle: todayISO() }); log('update', 'qhse', `Contrôle effectué : ${e.code}`); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600">
                        <CheckCircle2 size={15} />
                      </button>
                    ) : undefined}
                  />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? t('qh.editExt') : t('qh.newExt')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {editingId ? t('common.save') : t('common.add')}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('cf.code')}><Input value={form.code} onChange={(e) => set('code', e.target.value)} /></Field>
          <Field label={t('cf.type')}><Select value={form.type} onChange={(e) => set('type', e.target.value)}>{['Poudre ABC', 'CO2', 'Eau pulvérisée', 'Mousse'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label={t('qh.capacity')}><Input value={form.capacite} onChange={(e) => set('capacite', e.target.value)} /></Field>
          <Field label={t('common.status')}><Select value={form.statut} onChange={(e) => set('statut', e.target.value)}>{Object.entries(L.statutConformite).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          <Field label={t('qh.location')} className="col-span-2"><Input value={form.emplacement} onChange={(e) => set('emplacement', e.target.value)} /></Field>
          <Field label={t('qh.installDate')}><Input type="date" value={form.dateInstallation} onChange={(e) => set('dateInstallation', e.target.value)} /></Field>
          <Field label={t('qh.lastCheck')}><Input type="date" value={form.dateDernierControle} onChange={(e) => set('dateDernierControle', e.target.value)} /></Field>
          <Field label={t('qh.nextCheck')} className="col-span-2"><Input type="date" value={form.dateProchainControle} onChange={(e) => set('dateProchainControle', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={`${t('qh.extinguisher')} ${view?.code ?? ''}`}>
        {view && (
          <DefList>
            <DefRow label={t('cf.type')} value={view.type} />
            <DefRow label={t('qh.capacity')} value={view.capacite} />
            <DefRow label={t('qh.location')} value={view.emplacement} />
            <DefRow label={t('qh.installDate')} value={fmtDate(view.dateInstallation)} />
            <DefRow label={t('qh.lastCheck')} value={fmtDate(view.dateDernierControle)} />
            <DefRow label={t('qh.nextCheck')} value={fmtDate(view.dateProchainControle)} />
            <DefRow label={t('qh.compliance')} value={<Badge tone={L.statutConformite[view.statut].tone}>{L.statutConformite[view.statut].label}</Badge>} />
          </DefList>
        )}
      </Modal>

      <ConfirmDialog open={!!del} title={t('qh.deleteExt')} message={<span className="font-semibold text-slate-700">{del?.code}</span>}
        onConfirm={() => { if (del) { remove(del.id); log('delete', 'qhse', `Extincteur ${del.code} supprimé`); } }} onClose={() => setDel(null)} />
    </Card>
  );
}

// ─── Onglet Contrôles réglementaires ──────────────────────────────────────
const emptyCtl = (n: number): Omit<Controle, 'id'> => ({
  code: `CTL-${String(n).padStart(2, '0')}`,
  domaine: 'eau',
  libelle: '',
  responsableId: '',
  periodicite: 'Mensuel',
  dateDernierControle: todayISO(),
  dateProchainControle: '',
  statut: 'conforme',
  observations: '',
});

function ControlesTab({
  controles, staff, editable, deletable, add, update, remove, log,
}: {
  controles: Controle[];
  staff: { id: string; prenom: string; nom: string }[];
  editable: boolean;
  deletable: boolean;
  add: (c: Omit<Controle, 'id'>) => void;
  update: (id: string, c: Partial<Controle>) => void;
  remove: (id: string) => void;
  log: (a: 'create' | 'update' | 'delete', m: string, d: string) => void;
}) {
  const { t } = useT();
  const L = useLabels();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<Controle | null>(null);
  const [del, setDel] = useState<Controle | null>(null);
  const [filtre, setFiltre] = useState('');
  const [form, setForm] = useState<Omit<Controle, 'id'>>(emptyCtl(1));
  const set = (k: keyof Omit<Controle, 'id'>, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => controles.filter((c) => !filtre || c.domaine === filtre), [controles, filtre]);
  const staffName = (id?: string) => { const s = staff.find((x) => x.id === id); return s ? `${s.prenom} ${s.nom}` : '—'; };

  const openCreate = () => { setEditingId(null); setForm(emptyCtl(controles.length + 1)); setOpen(true); };
  const openEdit = (c: Controle) => { setEditingId(c.id); setForm({ ...c }); setOpen(true); };
  const submit = () => {
    if (!form.libelle) return;
    if (editingId) { update(editingId, form); log('update', 'qhse', `Contrôle ${form.code} mis à jour`); }
    else { add(form); log('create', 'qhse', `Contrôle ${form.code} ajouté`); }
    setOpen(false); setEditingId(null);
  };

  return (
    <Card>
      <CardHeader
        title={t('qh.checksTitle')}
        subtitle={`${controles.length}`}
        action={
          <div className="flex items-center gap-2">
            <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-44 text-sm">
              <option value="">{t('qh.allDomains')}</option>
              {Object.entries(L.domaineQHSELabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            {editable && <Button size="sm" onClick={openCreate}><Plus size={16} /> {t('qh.newCheck')}</Button>}
          </div>
        }
      />
      <Table>
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr><Th>{t('cf.code')}</Th><Th>{t('qh.domain')}</Th><Th>{t('qh.check')}</Th><Th>{t('qh.periodicity')}</Th><Th>{t('qh.responsible')}</Th><Th>{t('qh.next')}</Th><Th>{t('qh.compliance')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.map((c) => {
            const st = L.statutConformite[c.statut];
            const dm = L.domaineQHSELabel[c.domaine];
            const enRetard = c.dateProchainControle < todayISO();
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td className="font-medium">{c.code}</Td>
                <Td><Badge tone={dm.tone}>{dm.label}</Badge></Td>
                <Td className="max-w-xs whitespace-normal text-slate-600">{c.libelle}</Td>
                <Td>{c.periodicite}</Td>
                <Td className="text-slate-500">{staffName(c.responsableId)}</Td>
                <Td><span className={enRetard ? 'font-medium text-red-600' : ''}>{fmtDate(c.dateProchainControle)}</span></Td>
                <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                <Td>
                  <RowActions
                    onView={() => setView(c)}
                    onEdit={editable ? () => openEdit(c) : undefined}
                    onDelete={deletable ? () => setDel(c) : undefined}
                    extra={editable && c.statut !== 'conforme' ? (
                      <button title={t('qh.markCompliant')} onClick={() => { update(c.id, { statut: 'conforme', dateDernierControle: todayISO() }); log('update', 'qhse', `Contrôle effectué : ${c.code}`); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600">
                        <CheckCircle2 size={15} />
                      </button>
                    ) : undefined}
                  />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? t('qh.editCheck') : t('qh.newCheck')} size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {editingId ? t('common.save') : t('common.add')}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('cf.code')}><Input value={form.code} onChange={(e) => set('code', e.target.value)} /></Field>
          <Field label={t('qh.domain')}><Select value={form.domaine} onChange={(e) => set('domaine', e.target.value as DomaineQHSE)}>{Object.entries(L.domaineQHSELabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          <Field label={t('qh.checkLabel')} className="col-span-2"><Input value={form.libelle} onChange={(e) => set('libelle', e.target.value)} /></Field>
          <Field label={t('qh.periodicity')}><Select value={form.periodicite} onChange={(e) => set('periodicite', e.target.value)}>{['Hebdomadaire', 'Mensuel', 'Trimestriel', 'Semestriel', 'Annuel'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label={t('qh.responsible')}><Select value={form.responsableId} onChange={(e) => set('responsableId', e.target.value)}><option value="">—</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}</Select></Field>
          <Field label={t('qh.lastCheck')}><Input type="date" value={form.dateDernierControle} onChange={(e) => set('dateDernierControle', e.target.value)} /></Field>
          <Field label={t('qh.nextCheck')}><Input type="date" value={form.dateProchainControle} onChange={(e) => set('dateProchainControle', e.target.value)} /></Field>
          <Field label={t('common.status')} className="col-span-2"><Select value={form.statut} onChange={(e) => set('statut', e.target.value as StatutConformite)}>{Object.entries(L.statutConformite).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          <Field label={t('qh.observations')} className="col-span-2"><Textarea rows={2} value={form.observations} onChange={(e) => set('observations', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={`${t('qh.check')} ${view?.code ?? ''}`}>
        {view && (
          <DefList>
            <DefRow label={t('qh.domain')} value={<Badge tone={L.domaineQHSELabel[view.domaine].tone}>{L.domaineQHSELabel[view.domaine].label}</Badge>} />
            <DefRow label={t('qh.check')} value={view.libelle} />
            <DefRow label={t('qh.periodicity')} value={view.periodicite} />
            <DefRow label={t('qh.responsible')} value={staffName(view.responsableId)} />
            <DefRow label={t('qh.lastCheck')} value={fmtDate(view.dateDernierControle)} />
            <DefRow label={t('qh.nextCheck')} value={fmtDate(view.dateProchainControle)} />
            <DefRow label={t('qh.compliance')} value={<Badge tone={L.statutConformite[view.statut].tone}>{L.statutConformite[view.statut].label}</Badge>} />
            <DefRow label={t('qh.observations')} value={view.observations || '—'} />
          </DefList>
        )}
      </Modal>

      <ConfirmDialog open={!!del} title={t('qh.deleteCheck')} message={<span className="font-semibold text-slate-700">{del?.code}</span>}
        onConfirm={() => { if (del) { remove(del.id); log('delete', 'qhse', `Contrôle ${del.code} supprimé`); } }} onClose={() => setDel(null)} />
    </Card>
  );
}

// ─── Onglet Certifications ────────────────────────────────────────────────
const emptyCert = (): Omit<Certification, 'id'> => ({
  nom: '',
  organisme: '',
  numero: '',
  dateObtention: todayISO(),
  dateExpiration: '',
  statut: 'valide',
  observations: '',
});

function CertificationsTab({
  certifications, editable, deletable, add, update, remove, log,
}: {
  certifications: Certification[];
  editable: boolean;
  deletable: boolean;
  add: (c: Omit<Certification, 'id'>) => void;
  update: (id: string, c: Partial<Certification>) => void;
  remove: (id: string) => void;
  log: (a: 'create' | 'update' | 'delete', m: string, d: string) => void;
}) {
  const { t } = useT();
  const L = useLabels();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<Certification | null>(null);
  const [del, setDel] = useState<Certification | null>(null);
  const [form, setForm] = useState<Omit<Certification, 'id'>>(emptyCert());
  const set = (k: keyof Omit<Certification, 'id'>, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditingId(null); setForm(emptyCert()); setOpen(true); };
  const openEdit = (c: Certification) => { setEditingId(c.id); setForm({ ...c }); setOpen(true); };
  const submit = () => {
    if (!form.nom) return;
    if (editingId) { update(editingId, form); log('update', 'qhse', `Certification ${form.nom} mise à jour`); }
    else { add(form); log('create', 'qhse', `Certification ${form.nom} ajoutée`); }
    setOpen(false); setEditingId(null);
  };

  return (
    <Card>
      <CardHeader
        title={t('qh.certsTitle')}
        subtitle={`${certifications.length}`}
        action={editable ? <Button size="sm" onClick={openCreate}><Plus size={16} /> {t('qh.newCert')}</Button> : undefined}
      />
      {certifications.length === 0 ? (
        <EmptyState icon={<Award size={22} />} title={t('qh.noCert')} />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr><Th>{t('qh.certName')}</Th><Th>{t('qh.organism')}</Th><Th>{t('qh.certNumber')}</Th><Th>{t('qh.obtained')}</Th><Th>{t('qh.expires')}</Th><Th>{t('qh.validity')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {certifications.map((c) => {
              const st = L.statutCertification[c.statut];
              const expire = c.dateExpiration && c.dateExpiration < todayISO();
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td className="max-w-xs whitespace-normal font-medium text-slate-700">{c.nom}</Td>
                  <Td className="text-slate-500">{c.organisme}</Td>
                  <Td className="text-slate-500">{c.numero || '—'}</Td>
                  <Td>{fmtDate(c.dateObtention)}</Td>
                  <Td><span className={expire ? 'font-medium text-red-600' : ''}>{c.dateExpiration ? fmtDate(c.dateExpiration) : '—'}</span></Td>
                  <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                  <Td>
                    <RowActions
                      onView={() => setView(c)}
                      onEdit={editable ? () => openEdit(c) : undefined}
                      onDelete={deletable ? () => setDel(c) : undefined}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? t('qh.editCert') : t('qh.newCert')} size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {editingId ? t('common.save') : t('common.add')}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('qh.certName')} className="col-span-2"><Input value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          <Field label={t('qh.organism')}><Input value={form.organisme} onChange={(e) => set('organisme', e.target.value)} /></Field>
          <Field label={t('qh.certNumber')}><Input value={form.numero ?? ''} onChange={(e) => set('numero', e.target.value)} /></Field>
          <Field label={t('qh.obtained')}><Input type="date" value={form.dateObtention} onChange={(e) => set('dateObtention', e.target.value)} /></Field>
          <Field label={t('qh.expires')}><Input type="date" value={form.dateExpiration} onChange={(e) => set('dateExpiration', e.target.value)} /></Field>
          <Field label={t('qh.validity')} className="col-span-2"><Select value={form.statut} onChange={(e) => set('statut', e.target.value as StatutCertification)}>{Object.entries(L.statutCertification).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          <Field label={t('qh.observations')} className="col-span-2"><Textarea rows={2} value={form.observations ?? ''} onChange={(e) => set('observations', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.nom ?? ''}>
        {view && (
          <DefList>
            <DefRow label={t('qh.organism')} value={view.organisme} />
            <DefRow label={t('qh.certNumber')} value={view.numero || '—'} />
            <DefRow label={t('qh.obtained')} value={fmtDate(view.dateObtention)} />
            <DefRow label={t('qh.expires')} value={view.dateExpiration ? fmtDate(view.dateExpiration) : '—'} />
            <DefRow label={t('qh.validity')} value={<Badge tone={L.statutCertification[view.statut].tone}>{L.statutCertification[view.statut].label}</Badge>} />
            <DefRow label={t('qh.observations')} value={view.observations || '—'} />
          </DefList>
        )}
      </Modal>

      <ConfirmDialog open={!!del} title={t('qh.deleteCert')} message={<span className="font-semibold text-slate-700">{del?.nom}</span>}
        onConfirm={() => { if (del) { remove(del.id); log('delete', 'qhse', `Certification ${del.nom} supprimée`); } }} onClose={() => setDel(null)} />
    </Card>
  );
}
