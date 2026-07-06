import { useState } from 'react';
import { Activity, Wrench, Plus, Clock, Droplet } from 'lucide-react';
import { useStore } from '@/store/useStore';
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
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { fmtDate, fmtMoney, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import type { StatutMachine, TypeMaintenance, Machine, Maintenance } from '@/types';

const emptyMaint = (machineId: string, technicienId: string) => ({
  machineId,
  type: 'preventive' as TypeMaintenance,
  date: todayISO(),
  description: '',
  technicienId,
  cout: 0,
});

export default function Machines() {
  const { machines, maintenances, staff, settings, updateMachine, deleteMachine, addMaintenance, updateMaintenance, deleteMaintenance } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const editable = canWrite('machines');
  const deletable = canDelete('machines');
  const techniciens = staff.filter((s) => s.role === 'technicien');
  const [open, setOpen] = useState(false);
  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [viewMaint, setViewMaint] = useState<Maintenance | null>(null);
  const [deleteMaint, setDeleteMaint] = useState<Maintenance | null>(null);
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [deleteMachineTarget, setDeleteMachineTarget] = useState<Machine | null>(null);
  const [form, setForm] = useState(emptyMaint(machines[0]?.id ?? '', techniciens[0]?.id ?? ''));
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const op = machines.filter((m) => m.statut === 'operationnel').length;
  const enMaint = maintenances.filter((m) => m.statut !== 'terminee').length;
  const coutTotal = maintenances.reduce((a, m) => a + m.cout, 0);
  const machineCode = (id: string) => machines.find((m) => m.id === id)?.code ?? '—';
  const techName = (id: string) => { const t = staff.find((x) => x.id === id); return t ? `${t.prenom} ${t.nom}` : '—'; };

  const openCreate = () => {
    setEditingMaintId(null);
    setForm(emptyMaint(machines[0]?.id ?? '', techniciens[0]?.id ?? ''));
    setOpen(true);
  };

  const openEditMaint = (m: Maintenance) => {
    setEditingMaintId(m.id);
    setForm({ machineId: m.machineId, type: m.type, date: m.date, description: m.description, technicienId: m.technicienId, cout: m.cout });
    setOpen(true);
  };

  const submit = () => {
    if (!form.description) return;
    if (editingMaintId) {
      updateMaintenance(editingMaintId, { ...form, cout: Number(form.cout) });
    } else {
      addMaintenance({ ...form, cout: Number(form.cout), statut: 'planifiee' });
    }
    setForm(emptyMaint(machines[0]?.id ?? '', techniciens[0]?.id ?? ''));
    setEditingMaintId(null);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.machines')}
        subtitle={t('ma.subtitle').replace('{n}', String(machines.length))}
        action={editable ? <Button onClick={openCreate}><Plus size={16} /> {t('ma.planMaint')}</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('ma.operational')} value={`${op}/${machines.length}`} icon={<Activity size={18} />} tone="green" />
        <StatCard label={t('ma.inProgress')} value={enMaint} icon={<Wrench size={18} />} tone="amber" />
        <StatCard label={t('ma.maintCost')} value={fmtMoney(coutTotal, settings.devise)} icon={<Clock size={18} />} tone="purple" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {machines.map((m) => {
          const st = L.statutMachine[m.statut];
          return (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{m.code}</div>
                  <div className="text-xs text-slate-400">{m.marque} {m.modele}</div>
                </div>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-400">{t('pl.poste')}</dt><dd className="font-medium text-slate-600">{m.poste}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">{t('ma.serial')}</dt><dd className="font-medium text-slate-600">{m.numeroSerie}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">{t('ma.hours')}</dt><dd className="font-medium text-slate-600">{m.heuresFonctionnement.toLocaleString('fr-FR')} h</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400 inline-flex items-center gap-1"><Droplet size={12} /> {t('ma.disinfection')}</dt><dd className="font-medium text-slate-600">{fmtDate(m.derniereDesinfection)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">{t('ma.nextMaint')}</dt><dd className="font-medium text-slate-600">{fmtDate(m.prochaineMaintenance)}</dd></div>
              </dl>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Select
                  value={m.statut}
                  onChange={(e) => updateMachine(m.id, { statut: e.target.value as StatutMachine })}
                  className="flex-1 text-sm"
                  disabled={!editable}
                >
                  {Object.entries(L.statutMachine).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
                <RowActions
                  onView={() => setViewMachine(m)}
                  onEdit={editable ? () => setEditMachine(m) : undefined}
                  onDelete={deletable ? () => setDeleteMachineTarget(m) : undefined}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title={t('ma.interventions')} subtitle={`${maintenances.length}`} />
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr><Th>{t('cf.machine')}</Th><Th>{t('cf.type')}</Th><Th>{t('cf.date')}</Th><Th>{t('cf.description')}</Th><Th>{t('cf.technician')}</Th><Th>{t('cf.cost')}</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {maintenances.map((m) => {
              const machine = machines.find((x) => x.id === m.machineId);
              const tech = staff.find((x) => x.id === m.technicienId);
              const ty = L.typeMaintenance[m.type];
              const stt = L.statutMaintenance[m.statut];
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <Td className="font-medium">{machine?.code}</Td>
                  <Td><Badge tone={ty.tone}>{ty.label}</Badge></Td>
                  <Td>{fmtDate(m.date)}</Td>
                  <Td className="max-w-xs whitespace-normal text-slate-600">{m.description}</Td>
                  <Td>{tech?.prenom} {tech?.nom}</Td>
                  <Td>{fmtMoney(m.cout, settings.devise)}</Td>
                  <Td>
                    <Select
                      value={m.statut}
                      onChange={(e) => updateMaintenance(m.id, { statut: e.target.value as never })}
                      className="w-32 text-xs"
                      disabled={!editable}
                    >
                      {Object.entries(L.statutMaintenance).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </Td>
                  <Td>
                    <RowActions
                      onView={() => setViewMaint(m)}
                      onEdit={editable ? () => openEditMaint(m) : undefined}
                      onDelete={deletable ? () => setDeleteMaint(m) : undefined}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingMaintId ? t('ma.editMaint') : t('ma.planMaintTitle')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {t('common.save')}</Button></>}
      >
        <div className="space-y-4">
          <Field label={t('cf.machine')}>
            <Select value={form.machineId} onChange={(e) => set('machineId', e.target.value)}>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.modele}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('cf.type')}>
              <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
                {Object.entries(L.typeMaintenance).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label={t('cf.date')}><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          </div>
          <Field label={t('cf.description')}><Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('cf.technician')}>
              <Select value={form.technicienId} onChange={(e) => set('technicienId', e.target.value)}>
                {techniciens.map((tec) => <option key={tec.id} value={tec.id}>{tec.prenom} {tec.nom}</option>)}
              </Select>
            </Field>
            <Field label={`${t('ma.estCost')} (${settings.devise})`}><Input type="number" value={form.cout} onChange={(e) => set('cout', e.target.value)} /></Field>
          </div>
        </div>
      </Modal>

      {/* Maintenance — aperçu */}
      <Modal open={!!viewMaint} onClose={() => setViewMaint(null)} title={t('ma.detailMaint')}>
        {viewMaint && (
          <DefList>
            <DefRow label={t('cf.machine')} value={machineCode(viewMaint.machineId)} />
            <DefRow label={t('cf.type')} value={<Badge tone={L.typeMaintenance[viewMaint.type].tone}>{L.typeMaintenance[viewMaint.type].label}</Badge>} />
            <DefRow label={t('cf.date')} value={fmtDate(viewMaint.date)} />
            <DefRow label={t('cf.description')} value={viewMaint.description} />
            <DefRow label={t('cf.technician')} value={techName(viewMaint.technicienId)} />
            <DefRow label={t('cf.cost')} value={fmtMoney(viewMaint.cout, settings.devise)} />
            <DefRow label={t('common.status')} value={<Badge tone={L.statutMaintenance[viewMaint.statut].tone}>{L.statutMaintenance[viewMaint.statut].label}</Badge>} />
          </DefList>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteMaint}
        title={t('ma.deleteMaint')}
        message={<span className="font-semibold text-slate-700">{deleteMaint && machineCode(deleteMaint.machineId)}</span>}
        onConfirm={() => deleteMaint && deleteMaintenance(deleteMaint.id)}
        onClose={() => setDeleteMaint(null)}
      />

      {/* Machine — aperçu */}
      <Modal open={!!viewMachine} onClose={() => setViewMachine(null)} title={`${t('cf.machine')} ${viewMachine?.code ?? ''}`}>
        {viewMachine && (
          <DefList>
            <DefRow label={t('ma.model')} value={`${viewMachine.marque} ${viewMachine.modele}`} />
            <DefRow label={t('ma.serial')} value={viewMachine.numeroSerie} />
            <DefRow label={t('pl.poste')} value={viewMachine.poste} />
            <DefRow label={t('common.status')} value={<Badge tone={L.statutMachine[viewMachine.statut].tone}>{L.statutMachine[viewMachine.statut].label}</Badge>} />
            <DefRow label={t('ma.installDate')} value={fmtDate(viewMachine.dateMiseEnService)} />
            <DefRow label={t('ma.hours')} value={`${viewMachine.heuresFonctionnement.toLocaleString('fr-FR')} h`} />
            <DefRow label={t('ma.lastDisinfection')} value={fmtDate(viewMachine.derniereDesinfection)} />
            <DefRow label={t('ma.nextMaint')} value={fmtDate(viewMachine.prochaineMaintenance)} />
          </DefList>
        )}
      </Modal>

      {/* Machine — modifier */}
      {editMachine && (
        <EditMachineModal
          machine={editMachine}
          onClose={() => setEditMachine(null)}
          onSave={(data) => {
            updateMachine(editMachine.id, data);
            setEditMachine(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteMachineTarget}
        title={t('ma.deleteMachine')}
        message={<span className="font-semibold text-slate-700">{deleteMachineTarget?.code}</span>}
        onConfirm={() => deleteMachineTarget && deleteMachine(deleteMachineTarget.id)}
        onClose={() => setDeleteMachineTarget(null)}
      />
    </div>
  );
}

function EditMachineModal({ machine, onClose, onSave }: { machine: Machine; onClose: () => void; onSave: (data: Partial<Machine>) => void }) {
  const { t } = useT();
  const [f, setF] = useState({
    code: machine.code,
    marque: machine.marque,
    modele: machine.modele,
    numeroSerie: machine.numeroSerie,
    poste: machine.poste,
    heuresFonctionnement: machine.heuresFonctionnement,
    derniereDesinfection: machine.derniereDesinfection,
    prochaineMaintenance: machine.prochaineMaintenance,
  });
  const set = (k: keyof typeof f, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('common.edit')} ${machine.code}`}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => onSave({ ...f, poste: Number(f.poste), heuresFonctionnement: Number(f.heuresFonctionnement) })}>{t('common.save')}</Button></>}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('cf.code')}><Input value={f.code} onChange={(e) => set('code', e.target.value)} /></Field>
        <Field label={t('pl.poste')}><Input type="number" value={f.poste} onChange={(e) => set('poste', e.target.value)} /></Field>
        <Field label={t('ma.model')}><Input value={f.marque} onChange={(e) => set('marque', e.target.value)} /></Field>
        <Field label={t('ma.model')}><Input value={f.modele} onChange={(e) => set('modele', e.target.value)} /></Field>
        <Field label={t('ma.serial')}><Input value={f.numeroSerie} onChange={(e) => set('numeroSerie', e.target.value)} /></Field>
        <Field label={t('ma.hours')}><Input type="number" value={f.heuresFonctionnement} onChange={(e) => set('heuresFonctionnement', e.target.value)} /></Field>
        <Field label={t('ma.lastDisinfection')}><Input type="date" value={f.derniereDesinfection} onChange={(e) => set('derniereDesinfection', e.target.value)} /></Field>
        <Field label={t('ma.nextMaint')}><Input type="date" value={f.prochaineMaintenance} onChange={(e) => set('prochaineMaintenance', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
