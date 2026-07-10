import { useState } from 'react';
import {
  ClipboardList, Plus, Trash2, Printer, X, Droplets, Search,
  Clock, Repeat, Gauge, FlaskConical, Pill, Stethoscope, Users2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Modal,
  Field,
  Input,
  Select,
  StatCard,
  EmptyState,
  RowActions,
  ConfirmDialog,
  DefList,
  DefRow,
} from '@/components/ui';
import { RapportListe } from '@/components/RapportListe';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { fmtDate, fmtDateLong, age, initials, todayISO } from '@/lib/utils';
import type { Prescription } from '@/types';

const defaultMeds = [{ nom: 'EPO (Érythropoïétine)', posologie: '4000 UI x3/sem' }];
const emptyForm = {
  patientId: '',
  nephrologueId: '',
  dureeSeance: 240,
  frequenceHebdo: 3,
  dialyseur: 'FX80 (High-flux)',
  debitSang: 300,
  debitDialysat: 500,
  anticoagulation: 'Héparine 5000 UI bolus + 1000 UI/h',
  bainDialyse: 'Bicarbonate, K+ 2 mmol/L',
};

export default function Prescriptions() {
  const { prescriptions, patients, staff, settings, addPrescription, updatePrescription, deletePrescription } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const editable = canWrite('prescriptions');
  const deletable = canDelete('prescriptions');
  const nephrologues = staff.filter((s) => s.role === 'nephrologue');
  const activePatients = patients.filter((p) => p.statut === 'actif');
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<Prescription | null>(null);
  const [printTarget, setPrintTarget] = useState<Prescription | null>(null);
  const [rapport, setRapport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);

  const [form, setForm] = useState({
    ...emptyForm,
    patientId: activePatients[0]?.id ?? '',
    nephrologueId: nephrologues[0]?.id ?? '',
  });
  const [meds, setMeds] = useState<{ nom: string; posologie: string }[]>([...defaultMeds]);
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const patientName = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.prenom} ${p.nom}` : '—';
  };
  const ql = q.trim().toLowerCase();
  const visible = prescriptions
    .filter((p) => (showInactive ? true : p.active))
    .filter((p) => !ql || patientName(p.patientId).toLowerCase().includes(ql) || p.dialyseur.toLowerCase().includes(ql));

  const actives = prescriptions.filter((p) => p.active);
  const patientsCouverts = new Set(actives.map((p) => p.patientId)).size;
  const prescripteurs = new Set(actives.map((p) => p.nephrologueId)).size;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, patientId: activePatients[0]?.id ?? '', nephrologueId: nephrologues[0]?.id ?? '' });
    setMeds([...defaultMeds]);
    setOpen(true);
  };

  const openEdit = (p: Prescription) => {
    setEditingId(p.id);
    setForm({
      patientId: p.patientId,
      nephrologueId: p.nephrologueId,
      dureeSeance: p.dureeSeance,
      frequenceHebdo: p.frequenceHebdo,
      dialyseur: p.dialyseur,
      debitSang: p.debitSang,
      debitDialysat: p.debitDialysat,
      anticoagulation: p.anticoagulation,
      bainDialyse: p.bainDialyse,
    });
    setMeds(p.medicaments.length ? p.medicaments : [...defaultMeds]);
    setOpen(true);
  };

  const submit = () => {
    const payload = {
      ...form,
      dureeSeance: Number(form.dureeSeance),
      frequenceHebdo: Number(form.frequenceHebdo),
      debitSang: Number(form.debitSang),
      debitDialysat: Number(form.debitDialysat),
      medicaments: meds.filter((m) => m.nom),
    };
    if (editingId) {
      updatePrescription(editingId, payload);
    } else {
      addPrescription({ ...payload, date: todayISO(), active: true });
    }
    setMeds([...defaultMeds]);
    setEditingId(null);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.prescriptions')}
        subtitle={t('pr.subtitle').replace('{n}', String(prescriptions.filter((p) => p.active).length))}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setRapport(true)}><Printer size={16} /> {t('common.printList')}</Button>
            {editable && <Button onClick={openCreate}><Plus size={16} /> {t('pr.new')}</Button>}
          </div>
        }
      />

      {/* Indicateurs */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('pr.activeCount')} value={actives.length} icon={<ClipboardList size={18} />} tone="blue" />
        <StatCard label={t('pr.coveredPatients')} value={patientsCouverts} icon={<Users2 size={18} />} tone="teal" />
        <StatCard label={t('pr.prescribers')} value={prescripteurs} icon={<Stethoscope size={18} />} tone="purple" />
      </div>

      {/* Barre d'outils : recherche + historique */}
      <Card className="mb-5 flex flex-wrap items-center gap-4 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('pr.searchPh')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          {t('pr.showHistory')}
        </label>
      </Card>

      {/* Cartes de prescription */}
      {visible.length === 0 ? (
        <Card className="p-10">
          <EmptyState icon={<ClipboardList size={22} />} title={t('pd.noPresc')} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {visible.map((p) => {
            const patient = patients.find((x) => x.id === p.patientId);
            const neph = staff.find((x) => x.id === p.nephrologueId);
            const extraMeds = p.medicaments.length - 3;
            return (
              <Card key={p.id} className={'p-5 transition hover:shadow-md ' + (p.active ? '' : 'opacity-70')}>
                {/* En-tête : patient + statut */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                      {patient ? initials(patient.nom, patient.prenom) : '?'}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{patient?.prenom} {patient?.nom}</div>
                      <div className="text-xs text-slate-400">
                        <Stethoscope size={11} className="mr-1 inline" />
                        Dr {neph?.prenom} {neph?.nom} · {fmtDate(p.date)}
                      </div>
                    </div>
                  </div>
                  {p.active ? <Badge tone="green">{t('pr.active')}</Badge> : <Badge tone="slate">{t('pr.replaced')}</Badge>}
                </div>

                {/* Paramètres de dialyse */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SpecChip icon={<Clock size={14} />} label={t('pd.duration')} value={`${p.dureeSeance} min`} />
                  <SpecChip icon={<Repeat size={14} />} label={t('pd.freq')} value={`${p.frequenceHebdo}/sem`} />
                  <SpecChip icon={<Gauge size={14} />} label="Qb / Qd" value={`${p.debitSang}·${p.debitDialysat}`} />
                  <SpecChip icon={<FlaskConical size={14} />} label={t('pr.dialyzer')} value={p.dialyseur.split(' ')[0]} />
                </div>

                {/* Médicaments */}
                {p.medicaments.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Pill size={14} className="text-teal-600" />
                    {p.medicaments.slice(0, 3).map((m, i) => (
                      <span key={i} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200/60">
                        {m.nom.split('(')[0].trim()}
                      </span>
                    ))}
                    {extraMeds > 0 && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">+{extraMeds}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="outline" onClick={() => setPrintTarget(p)}>
                    <Printer size={15} /> {t('pr.print')}
                  </Button>
                  <RowActions
                    onView={() => setViewTarget(p)}
                    onEdit={editable ? () => openEdit(p) : undefined}
                    onDelete={deletable ? () => setDeleteTarget(p) : undefined}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? t('pr.editTitle') : t('pr.new')}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {editingId ? t('common.save') : t('pr.prescribe')}</Button></>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('cf.patient')}>
            <Select value={form.patientId} onChange={(e) => set('patientId', e.target.value)}>
              {activePatients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </Select>
          </Field>
          <Field label={t('cf.nephrologist')}>
            <Select value={form.nephrologueId} onChange={(e) => set('nephrologueId', e.target.value)}>
              {nephrologues.map((n) => <option key={n.id} value={n.id}>Dr {n.prenom} {n.nom}</option>)}
            </Select>
          </Field>
          <Field label={t('pr.duration')}><Input type="number" value={form.dureeSeance} onChange={(e) => set('dureeSeance', e.target.value)} /></Field>
          <Field label={t('pr.freq')}><Input type="number" value={form.frequenceHebdo} onChange={(e) => set('frequenceHebdo', e.target.value)} /></Field>
          <Field label={t('pr.dialyzer')}><Input value={form.dialyseur} onChange={(e) => set('dialyseur', e.target.value)} /></Field>
          <Field label={t('pr.bath')}><Input value={form.bainDialyse} onChange={(e) => set('bainDialyse', e.target.value)} /></Field>
          <Field label={t('pr.bloodFlow')}><Input type="number" value={form.debitSang} onChange={(e) => set('debitSang', e.target.value)} /></Field>
          <Field label={t('pr.dialysateFlow')}><Input type="number" value={form.debitDialysat} onChange={(e) => set('debitDialysat', e.target.value)} /></Field>
          <Field label={t('pr.anticoag')} className="sm:col-span-2"><Input value={form.anticoagulation} onChange={(e) => set('anticoagulation', e.target.value)} /></Field>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{t('pr.medsTitle')}</span>
              <Button variant="ghost" size="sm" onClick={() => setMeds([...meds, { nom: '', posologie: '' }])}><Plus size={14} /> {t('common.add')}</Button>
            </div>
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={t('pr.med')} value={m.nom} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)))} />
                  <Input placeholder={t('pr.posology')} value={m.posologie} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, posologie: e.target.value } : x)))} />
                  <Button variant="ghost" size="sm" onClick={() => setMeds(meds.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={t('pr.detailTitle')}
        size="lg"
        footer={<Button onClick={() => { const p = viewTarget; setViewTarget(null); setPrintTarget(p); }}><Printer size={16} /> {t('pr.print')}</Button>}
      >
        {viewTarget && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DefList>
              <DefRow label={t('cf.patient')} value={(() => { const p = patients.find((x) => x.id === viewTarget.patientId); return p ? `${p.prenom} ${p.nom}` : '—'; })()} />
              <DefRow label={t('cf.nephrologist')} value={(() => { const n = staff.find((x) => x.id === viewTarget.nephrologueId); return n ? `Dr ${n.prenom} ${n.nom}` : '—'; })()} />
              <DefRow label={t('pd.duration')} value={`${viewTarget.dureeSeance} min`} />
              <DefRow label={t('pd.freq')} value={`${viewTarget.frequenceHebdo}/sem`} />
              <DefRow label={t('pr.dialyzer')} value={viewTarget.dialyseur} />
              <DefRow label={t('pd.bloodFlow')} value={`${viewTarget.debitSang} ml/min`} />
              <DefRow label={t('pd.dialysate')} value={`${viewTarget.debitDialysat} ml/min`} />
              <DefRow label={t('pr.anticoag')} value={viewTarget.anticoagulation} />
              <DefRow label={t('pr.bath')} value={viewTarget.bainDialyse} />
            </DefList>
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-700">{t('pr.medsTitle')}</div>
              <div className="space-y-2">
                {viewTarget.medicaments.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{m.nom}</span>
                    <span className="text-slate-500">{m.posologie}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('pr.deleteTitle')}
        message={t('pr.detailTitle')}
        onConfirm={() => deleteTarget && deletePrescription(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      {printTarget && (
        <OrdonnanceApercu prescription={printTarget} onClose={() => setPrintTarget(null)} />
      )}

      <RapportListe
        open={rapport}
        onClose={() => setRapport(false)}
        titre={t('pr.reportTitle')}
        settings={settings}
        rows={prescriptions}
        dateOf={(p) => p.date}
        colonnes={[
          { header: t('cf.date'), cell: (p) => fmtDate(p.date) },
          { header: t('cf.patient'), cell: (p) => patientName(p.patientId) },
          { header: t('cf.nephrologist'), cell: (p) => { const n = staff.find((x) => x.id === p.nephrologueId); return n ? `Dr ${n.prenom} ${n.nom}` : '—'; } },
          { header: t('pr.dialyzer'), cell: (p) => p.dialyseur },
          { header: t('pd.duration'), align: 'center', cell: (p) => `${p.dureeSeance} min` },
          { header: t('pd.freq'), align: 'center', cell: (p) => `${p.frequenceHebdo}/sem` },
          { header: t('common.status'), cell: (p) => (p.active ? t('pr.active') : t('pr.replaced')) },
        ]}
      />
    </div>
  );
}

function OrdonnanceApercu({ prescription, onClose }: { prescription: Prescription; onClose: () => void }) {
  const { settings, patients, staff } = useStore();
  const { t } = useT();
  const patient = patients.find((x) => x.id === prescription.patientId);
  const neph = staff.find((x) => x.id === prescription.nephrologueId);
  const meds = prescription.medicaments.filter((m) => m.nom);
  const ref = `ORD-${prescription.date.replace(/-/g, '')}-${prescription.id.slice(0, 4).toUpperCase()}`;
  const parts = (settings.adresse || '').split(',').map((x) => x.trim()).filter(Boolean);
  const place = (parts.length >= 2 ? parts[parts.length - 2] : parts[0]) || 'Dakar';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-8">
      {/* Barre d'outils (non imprimée) */}
      <div className="no-print mb-4 flex w-full max-w-[820px] items-center justify-between">
        <h3 className="text-base font-semibold text-white">{t('pr.ordPreview')}</h3>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()}><Printer size={16} /> {t('pr.print')}</Button>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Feuille A4 — ordonnance */}
      <div className="ordonnance-sheet w-full max-w-[820px] overflow-hidden rounded-lg bg-white text-slate-800 shadow-2xl">
        {/* Filet d'accent en haut de page */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-teal-400" />

        <div className="p-10">
          {/* En-tête établissement + bloc titre */}
          <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div className="flex items-start gap-3.5">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-14 w-14 rounded-xl object-contain" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
                  <Droplets size={30} />
                </div>
              )}
              <div>
                <div className="text-xl font-extrabold tracking-tight text-slate-900">{settings.nom}</div>
                <div className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-slate-500">
                  <div>{settings.adresse}</div>
                  <div>Tél : {settings.telephone}{settings.email ? ` · ${settings.email}` : ''}</div>
                  {(settings.ninea || settings.registreCommerce) && (
                    <div>{settings.ninea ? `NINEA : ${settings.ninea}` : ''}{settings.ninea && settings.registreCommerce ? ' · ' : ''}{settings.registreCommerce ? `RC : ${settings.registreCommerce}` : ''}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 rounded-2xl bg-brand-50 px-5 py-3 text-right ring-1 ring-brand-100">
              <div className="text-base font-bold uppercase tracking-wide text-brand-700">{t('pr.ordTitle')}</div>
              <div className="mt-1 font-mono text-[11px] text-slate-500">N° {ref}</div>
              <div className="text-[11px] text-slate-500">{fmtDateLong(prescription.date)}</div>
            </div>
          </div>

          {/* Patient & prescripteur */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Users2 size={13} /> {t('cf.patient')}
              </div>
              <div className="mt-1.5 text-[15px] font-bold text-slate-900">{patient ? `${patient.prenom} ${patient.nom}` : '—'}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {patient?.code ? patient.code : ''}
                {patient?.dateNaissance ? `${patient.code ? ' · ' : ''}${age(patient.dateNaissance)} ${t('pr.years')}` : ''}
                {patient?.sexe ? ` · ${patient.sexe === 'M' ? 'H' : 'F'}` : ''}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-right">
              <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Stethoscope size={13} /> {t('cf.nephrologist')}
              </div>
              <div className="mt-1.5 text-[15px] font-bold text-slate-900">{neph ? `Dr ${neph.prenom} ${neph.nom}` : '—'}</div>
              {neph?.specialite && <div className="mt-0.5 text-xs text-slate-500">{neph.specialite}</div>}
            </div>
          </div>

          {/* Traitement médicamenteux */}
          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-brand-500" />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-700">{t('pr.medsTitle')}</h3>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex gap-4">
                <div className="shrink-0 select-none font-serif text-4xl italic leading-none text-brand-600" title="Recipe">℞</div>
                <ol className="flex-1 space-y-3">
                  {meds.length === 0 && <li className="text-sm text-slate-400">—</li>}
                  {meds.map((m, i) => (
                    <li key={i} className="flex items-baseline gap-3 border-b border-dashed border-slate-200 pb-3 last:border-0 last:pb-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{m.nom}</div>
                        <div className="text-[13px] text-slate-500">{m.posologie}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Lieu, date & signature */}
          <div className="mt-10 flex items-end justify-between gap-6">
            <div className="text-xs text-slate-500">
              {t('pr.ordPlaceDate').replace('{p}', place).replace('{d}', fmtDateLong(prescription.date))}
            </div>
            <div className="w-56 text-center">
              <div className="text-[11px] font-semibold text-slate-600">{t('pr.ordSigner')}</div>
              {neph && <div className="text-[11px] text-slate-400">Dr {neph.prenom} {neph.nom}</div>}
              <div className="mt-12 border-t border-slate-300" />
              <div className="mt-1 text-[10px] italic text-slate-400">{t('pr.ordStampSign')}</div>
            </div>
          </div>

          {/* Bande de pied de page — épinglée en bas de la page à l'impression */}
          <div className="print-footer -mx-10 mt-8 border-t border-slate-200 px-10 pt-3 text-center text-[10px] font-medium text-slate-400">
            {settings.nom} — {settings.adresse} · {settings.telephone}{settings.email ? ` · ${settings.email}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {icon} {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-bold text-slate-700">{value}</div>
    </div>
  );
}
