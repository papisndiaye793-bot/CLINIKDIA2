import { useState } from 'react';
import { ClipboardList, Plus, Trash2, Printer, X, Droplets } from 'lucide-react';
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
  Table,
  Th,
  Td,
  EmptyState,
  RowActions,
  ConfirmDialog,
  DefList,
  DefRow,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { fmtDate, fmtDateLong, age, todayISO } from '@/lib/utils';
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
  const { prescriptions, patients, staff, addPrescription, updatePrescription, deletePrescription } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const editable = canWrite('prescriptions');
  const deletable = canDelete('prescriptions');
  const nephrologues = staff.filter((s) => s.role === 'nephrologue');
  const activePatients = patients.filter((p) => p.statut === 'actif');
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<Prescription | null>(null);
  const [printTarget, setPrintTarget] = useState<Prescription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);

  const [form, setForm] = useState({
    ...emptyForm,
    patientId: activePatients[0]?.id ?? '',
    nephrologueId: nephrologues[0]?.id ?? '',
  });
  const [meds, setMeds] = useState<{ nom: string; posologie: string }[]>([...defaultMeds]);
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const visible = prescriptions.filter((p) => (showInactive ? true : p.active));

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
        action={editable ? <Button onClick={openCreate}><Plus size={16} /> {t('pr.new')}</Button> : undefined}
      />

      <Card className="mb-4 p-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-slate-300" />
          {t('pr.showHistory')}
        </label>
      </Card>

      <Card>
        {visible.length === 0 ? (
          <EmptyState icon={<ClipboardList size={22} />} title={t('pd.noPresc')} />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>{t('cf.patient')}</Th><Th>{t('cf.nephrologist')}</Th><Th>{t('pr.scheme')}</Th><Th>{t('pr.dialyzer')}</Th><Th>{t('pr.flows')}</Th><Th>{t('pr.meds')}</Th><Th>{t('cf.date')}</Th><Th>{t('pr.state')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((p) => {
                const patient = patients.find((x) => x.id === p.patientId);
                const neph = staff.find((x) => x.id === p.nephrologueId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td className="font-medium">{patient?.prenom} {patient?.nom}</Td>
                    <Td>Dr {neph?.prenom} {neph?.nom}</Td>
                    <Td>{p.dureeSeance} min · {p.frequenceHebdo}/sem</Td>
                    <Td className="text-xs">{p.dialyseur}</Td>
                    <Td className="text-xs">Qb {p.debitSang} · Qd {p.debitDialysat}</Td>
                    <Td className="text-xs text-slate-500">{p.medicaments.map((m) => m.nom.split(' ')[0]).join(', ')}</Td>
                    <Td>{fmtDate(p.date)}</Td>
                    <Td>{p.active ? <Badge tone="green">{t('pr.active')}</Badge> : <Badge tone="slate">{t('pr.replaced')}</Badge>}</Td>
                    <Td>
                      <RowActions
                        onView={() => setViewTarget(p)}
                        onEdit={editable ? () => openEdit(p) : undefined}
                        onDelete={deletable ? () => setDeleteTarget(p) : undefined}
                        extra={
                          <button
                            title={t('pr.print')}
                            onClick={() => setPrintTarget(p)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Printer size={15} />
                          </button>
                        }
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

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
    </div>
  );
}

function OrdonnanceApercu({ prescription, onClose }: { prescription: Prescription; onClose: () => void }) {
  const { settings, patients, staff } = useStore();
  const { t } = useT();
  const patient = patients.find((x) => x.id === prescription.patientId);
  const neph = staff.find((x) => x.id === prescription.nephrologueId);
  const meds = prescription.medicaments.filter((m) => m.nom);

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
      <div className="ordonnance-sheet w-full max-w-[820px] rounded-lg bg-white p-10 text-slate-800 shadow-2xl">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b-2 border-brand-600 pb-6">
          <div className="flex items-start gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Droplets size={26} />
              </div>
            )}
            <div>
              <div className="text-xl font-extrabold tracking-tight text-slate-900">{settings.nom}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500">
                {settings.adresse}<br />
                Tél : {settings.telephone} · {settings.email}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-brand-700">{t('pr.ordTitle')}</div>
            <div className="mt-1 text-xs text-slate-500">{t('pr.ordEstablished')} {fmtDateLong(prescription.date)}</div>
          </div>
        </div>

        {/* Patient & prescripteur */}
        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('cf.patient')}</div>
            <div className="mt-1 font-semibold text-slate-800">{patient ? `${patient.prenom} ${patient.nom}` : '—'}</div>
            {patient && (
              <div className="text-xs text-slate-500">
                {patient.dateNaissance ? `${age(patient.dateNaissance)} ${t('pr.years')}` : ''}
                {patient.sexe ? ` · ${patient.sexe}` : ''}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('cf.nephrologist')}</div>
            <div className="mt-1 font-semibold text-slate-800">{neph ? `Dr ${neph.prenom} ${neph.nom}` : '—'}</div>
            {neph?.specialite && <div className="text-xs text-slate-500">{neph.specialite}</div>}
          </div>
        </div>

        {/* Schéma de dialyse */}
        <div className="mt-6">
          <div className="mb-2 text-sm font-bold text-slate-700">{t('pr.ordScheme')}</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg border border-slate-200 p-4 text-sm">
            <Row label={t('pd.duration')} value={`${prescription.dureeSeance} min`} />
            <Row label={t('pd.freq')} value={`${prescription.frequenceHebdo}/sem`} />
            <Row label={t('pr.dialyzer')} value={prescription.dialyseur} />
            <Row label={t('pr.bath')} value={prescription.bainDialyse} />
            <Row label={t('pd.bloodFlow')} value={`${prescription.debitSang} ml/min`} />
            <Row label={t('pd.dialysate')} value={`${prescription.debitDialysat} ml/min`} />
            <Row label={t('pr.anticoag')} value={prescription.anticoagulation} />
          </div>
        </div>

        {/* Traitement médicamenteux */}
        <div className="mt-6">
          <div className="mb-2 text-sm font-bold text-slate-700">{t('pr.medsTitle')}</div>
          <ol className="space-y-1.5 text-sm">
            {meds.map((m, i) => (
              <li key={i} className="flex items-baseline gap-2 border-b border-dashed border-slate-200 pb-1.5">
                <span className="font-semibold text-slate-400">{i + 1}.</span>
                <span className="font-medium text-slate-800">{m.nom}</span>
                <span className="text-slate-500">— {m.posologie}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Signature */}
        <div className="mt-12 flex justify-end">
          <div className="w-56 text-center">
            <div className="h-16 border-b border-slate-300" />
            <div className="mt-1 text-xs text-slate-500">{t('pr.ordSign')}</div>
          </div>
        </div>

        {settings.mentionsLegales && (
          <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">{settings.mentionsLegales}</div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value || '—'}</span>
    </div>
  );
}
