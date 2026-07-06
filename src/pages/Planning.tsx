import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Droplets, CheckCircle2, Trash2 } from 'lucide-react';
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
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { fmtDateLong, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import type { Creneau, Seance } from '@/types';

const creneaux: Creneau[] = ['matin', 'apresmidi', 'soir'];

export default function Planning() {
  const { machines, seances, patients, staff, addSeance, updateSeance, deleteSeance } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const editable = canWrite('planning');
  const deletable = canDelete('planning');
  const [date, setDate] = useState(todayISO());
  const [addCtx, setAddCtx] = useState<{ machineId: string; creneau: Creneau } | null>(null);
  const [editSeance, setEditSeance] = useState<Seance | null>(null);

  const infirmiers = staff.filter((s) => s.role === 'infirmier');
  const activePatients = patients.filter((p) => p.statut === 'actif');
  const dayseances = useMemo(() => seances.filter((s) => s.date === date), [seances, date]);

  const shift = (n: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().slice(0, 10));
  };

  const cell = (machineId: string, creneau: Creneau) =>
    dayseances.find((s) => s.machineId === machineId && s.creneau === creneau);

  const total = dayseances.length;
  const capacite = machines.filter((m) => m.statut === 'operationnel').length * 3;

  return (
    <div>
      <PageHeader
        title={t('nav.planning')}
        subtitle={t('pl.subtitle').replace('{n}', String(total)).replace('{c}', String(capacite))}
      />

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}><ChevronLeft size={16} /></Button>
          <div className="min-w-[260px] text-center font-medium capitalize text-slate-700">{fmtDateLong(date)}</div>
          <Button variant="outline" size="sm" onClick={() => shift(1)}><ChevronRight size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>{t('pl.today')}</Button>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{t('pl.poste')}</th>
                {creneaux.map((c) => (
                  <th key={c} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{L.creneauLabel[c]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {machines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3">
                    <div className="font-semibold text-slate-700">{m.code}</div>
                    <div className="text-xs text-slate-400">{t('pl.poste')} {m.poste}</div>
                  </td>
                  {creneaux.map((c) => {
                    const s = cell(m.id, c);
                    const patient = s && patients.find((p) => p.id === s.patientId);
                    if (m.statut !== 'operationnel') {
                      return (
                        <td key={c} className="px-3 py-3">
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-400">
                            {t('pl.unavailable')}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={c} className="px-3 py-3">
                        {s && patient ? (
                          <button
                            onClick={() => setEditSeance(s)}
                            className="w-full rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-left transition hover:border-brand-300"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                <Droplets size={13} className="text-brand-500" /> {patient.prenom} {patient.nom}
                              </span>
                              <Badge tone={L.statutSeance[s.statut].tone}>{L.statutSeance[s.statut].label}</Badge>
                            </div>
                          </button>
                        ) : editable ? (
                          <button
                            onClick={() => setAddCtx({ machineId: m.id, creneau: c })}
                            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 transition hover:border-brand-400 hover:text-brand-600"
                          >
                            <Plus size={14} /> {t('pl.schedule')}
                          </button>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-center text-xs text-slate-300">{t('pl.free')}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {addCtx && (
        <AddSeanceModal
          date={date}
          ctx={addCtx}
          patients={activePatients}
          infirmiers={infirmiers}
          onClose={() => setAddCtx(null)}
          onSave={(patientId, infirmierId) => {
            addSeance({
              patientId,
              machineId: addCtx.machineId,
              date,
              creneau: addCtx.creneau,
              infirmierId,
              statut: 'planifiee',
              dureeMinutes: 240,
              anticoagulation: 'Héparine 5000 UI',
            });
            setAddCtx(null);
          }}
        />
      )}

      {editSeance && (
        <EditSeanceModal
          seance={editSeance}
          patientName={(() => {
            const p = patients.find((x) => x.id === editSeance.patientId);
            return p ? `${p.prenom} ${p.nom}` : '';
          })()}
          poidsSec={patients.find((x) => x.id === editSeance.patientId)?.poidsSec}
          editable={editable}
          deletable={deletable}
          onClose={() => setEditSeance(null)}
          onSave={(data) => {
            updateSeance(editSeance.id, data);
            setEditSeance(null);
          }}
          onDelete={() => {
            deleteSeance(editSeance.id);
            setEditSeance(null);
          }}
        />
      )}
    </div>
  );
}

function AddSeanceModal({
  date,
  ctx,
  patients,
  infirmiers,
  onClose,
  onSave,
}: {
  date: string;
  ctx: { machineId: string; creneau: Creneau };
  patients: { id: string; prenom: string; nom: string }[];
  infirmiers: { id: string; prenom: string; nom: string }[];
  onClose: () => void;
  onSave: (patientId: string, infirmierId: string) => void;
}) {
  const { t } = useT();
  const L = useLabels();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [infirmierId, setInfirmierId] = useState(infirmiers[0]?.id ?? '');
  return (
    <Modal
      open
      onClose={onClose}
      title={t('pl.scheduleTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => patientId && onSave(patientId, infirmierId)}><Plus size={16} /> {t('pl.schedule')}</Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-500">{L.creneauLabel[ctx.creneau]} · {date}</p>
      <div className="space-y-4">
        <Field label={t('cf.patient')}>
          <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
          </Select>
        </Field>
        <Field label={t('pl.nurse')}>
          <Select value={infirmierId} onChange={(e) => setInfirmierId(e.target.value)}>
            {infirmiers.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function EditSeanceModal({
  seance,
  patientName,
  poidsSec,
  editable,
  deletable,
  onClose,
  onSave,
  onDelete,
}: {
  seance: Seance;
  patientName: string;
  poidsSec?: number;
  editable: boolean;
  deletable: boolean;
  onClose: () => void;
  onSave: (data: Partial<Seance>) => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const L = useLabels();
  const [f, setF] = useState({
    statut: seance.statut,
    poidsAvant: seance.poidsAvant ?? '',
    poidsApres: seance.poidsApres ?? '',
    taSystoliqueAvant: seance.taSystoliqueAvant ?? '',
    taDiastoliqueAvant: seance.taDiastoliqueAvant ?? '',
    taSystoliqueApres: seance.taSystoliqueApres ?? '',
    taDiastoliqueApres: seance.taDiastoliqueApres ?? '',
    debitSang: seance.debitSang ?? 300,
    ktv: seance.ktv ?? '',
    incidents: seance.incidents ?? '',
  });
  const set = (k: keyof typeof f, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: unknown) => (v === '' || v === undefined ? undefined : Number(v));

  const save = () => {
    const poidsAvant = num(f.poidsAvant);
    const poidsApres = num(f.poidsApres);
    onSave({
      statut: f.statut,
      poidsAvant,
      poidsApres,
      taSystoliqueAvant: num(f.taSystoliqueAvant),
      taDiastoliqueAvant: num(f.taDiastoliqueAvant),
      taSystoliqueApres: num(f.taSystoliqueApres),
      taDiastoliqueApres: num(f.taDiastoliqueApres),
      debitSang: num(f.debitSang),
      ktv: num(f.ktv),
      ufTotal: poidsAvant && poidsApres ? Number((poidsAvant - poidsApres).toFixed(1)) : seance.ufTotal,
      incidents: f.incidents || undefined,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('arch.seances').replace(/s$/i, '')} — ${patientName}`}
      size="lg"
      footer={
        <>
          {deletable && <Button variant="danger" onClick={onDelete}><Trash2 size={16} /> {t('common.delete')}</Button>}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>{t('pl.close')}</Button>
          {editable && <Button onClick={save}><CheckCircle2 size={16} /> {t('common.save')}</Button>}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('common.status')} className="sm:col-span-2">
          <Select value={f.statut} onChange={(e) => set('statut', e.target.value)}>
            {Object.entries(L.statutSeance).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label={`${t('pl.weightBefore')}${poidsSec ? ` · ${poidsSec}` : ''}`}>
          <Input type="number" step="0.1" value={f.poidsAvant} onChange={(e) => set('poidsAvant', e.target.value)} />
        </Field>
        <Field label={t('pl.weightAfter')}>
          <Input type="number" step="0.1" value={f.poidsApres} onChange={(e) => set('poidsApres', e.target.value)} />
        </Field>
        <Field label={t('pl.taBefore')}>
          <div className="flex gap-2">
            <Input type="number" placeholder="Sys" value={f.taSystoliqueAvant} onChange={(e) => set('taSystoliqueAvant', e.target.value)} />
            <Input type="number" placeholder="Dia" value={f.taDiastoliqueAvant} onChange={(e) => set('taDiastoliqueAvant', e.target.value)} />
          </div>
        </Field>
        <Field label={t('pl.taAfter')}>
          <div className="flex gap-2">
            <Input type="number" placeholder="Sys" value={f.taSystoliqueApres} onChange={(e) => set('taSystoliqueApres', e.target.value)} />
            <Input type="number" placeholder="Dia" value={f.taDiastoliqueApres} onChange={(e) => set('taDiastoliqueApres', e.target.value)} />
          </div>
        </Field>
        <Field label={t('pr.bloodFlow')}><Input type="number" value={f.debitSang} onChange={(e) => set('debitSang', e.target.value)} /></Field>
        <Field label="Kt/V"><Input type="number" step="0.01" value={f.ktv} onChange={(e) => set('ktv', e.target.value)} /></Field>
        <Field label={t('pl.incidents')} className="sm:col-span-2"><Input value={f.incidents} onChange={(e) => set('incidents', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
