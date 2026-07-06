import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Droplets,
  HeartPulse,
  ClipboardList,
  Receipt,
  Activity,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useStore } from '@/store/useStore';
import { useT } from '@/lib/i18n';
import { Card, CardHeader, Badge, PageHeader, Table, Th, Td, EmptyState } from '@/components/ui';
import { age, fmtDate, fmtMoney, initials } from '@/lib/utils';
import { useLabels, serologieTone } from '@/lib/labels';

const tabs = [
  { id: 'medical', key: 'pd.tab.medical', icon: HeartPulse },
  { id: 'seances', key: 'pd.tab.seances', icon: Activity },
  { id: 'prescription', key: 'pd.tab.presc', icon: ClipboardList },
  { id: 'facturation', key: 'pd.tab.billing', icon: Receipt },
] as const;

export default function PatientDetail() {
  const { id } = useParams();
  const { patients, staff, seances, prescriptions, factures, machines, settings } = useStore();
  const { t } = useT();
  const L = useLabels();
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('medical');

  const patient = patients.find((p) => p.id === id);
  if (!patient) {
    return (
      <div>
        <Link to="/patients" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft size={16} /> {t('pd.back')}
        </Link>
        <EmptyState icon={<Droplets size={22} />} title={t('pd.notFound')} />
      </div>
    );
  }

  const neph = staff.find((s) => s.id === patient.nephrologueId);
  const pSeances = seances.filter((s) => s.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const presc = prescriptions.find((p) => p.patientId === patient.id && p.active);
  const pFactures = factures.filter((f) => f.patientId === patient.id);
  const st = L.statutPatient[patient.statut];

  const ktvData = pSeances
    .filter((s) => s.ktv)
    .slice(0, 10)
    .reverse()
    .map((s) => ({ date: fmtDate(s.date).slice(0, 5), ktv: s.ktv }));

  return (
    <div>
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft size={16} /> {t('pd.back')}
      </Link>

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
            {initials(patient.nom, patient.prenom)}
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{patient.prenom} {patient.nom}</h1>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div className="mt-1 text-sm text-slate-500">{patient.code} · {patient.sexe === 'M' ? t('pt.man') : t('pt.woman')} · {age(patient.dateNaissance)} {t('pd.years')} · {patient.groupeSanguin}</div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {patient.telephone}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {patient.adresse}</span>
              <span className="inline-flex items-center gap-1.5"><HeartPulse size={14} className="text-slate-400" /> Dr {neph?.prenom} {neph?.nom}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <Stat label={t('pd.sessions')} value={pSeances.length} />
            <Stat label={t('pd.dryWeight')} value={`${patient.poidsSec} kg`} />
            <Stat label={t('pd.freq')} value={`${patient.frequenceHebdo}/sem`} />
          </div>
        </div>
      </Card>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
              (tab === tb.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            <tb.icon size={16} /> {t(tb.key)}
          </button>
        ))}
      </div>

      {tab === 'medical' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('pd.civilTitle')} />
            <dl className="divide-y divide-slate-100 px-5 text-sm">
              <Row label={t('pd.r.birthplace')} value={patient.lieuNaissance || '—'} />
              <Row label={t('pd.r.height')} value={patient.taille ? `${patient.taille} cm` : '—'} />
              <Row label={t('pd.r.family')} value={patient.situationFamiliale ? L.situationFamilialeLabel[patient.situationFamiliale] : '—'} />
              <Row label={t('pd.r.address')} value={patient.adresse} />
              <Row label={t('pd.r.emergency')} value={patient.contactUrgence?.nom ? `${patient.contactUrgence.nom} · ${patient.contactUrgence.telephone}` : '—'} />
            </dl>
            <CardHeader title={t('pd.clinicalTitle')} />
            <dl className="divide-y divide-slate-100 px-5 text-sm">
              <Row label={t('pd.r.nephropathy')} value={patient.nephropathie} />
              <Row label={t('pd.r.access')} value={L.abordLabel[patient.abord]} />
              {patient.abord === 'FAV' || patient.abord === 'pontage' ? (
                <>
                  <Row label={t('pd.r.favConf')} value={fmtDate(patient.abordDateConfection)} />
                  <Row label={t('pd.r.favPunct')} value={fmtDate(patient.abordDatePremierePonction)} />
                </>
              ) : (
                <Row label={t('pd.r.cathPose')} value={fmtDate(patient.abordDatePose)} />
              )}
              <Row label={t('pd.r.first')} value={fmtDate(patient.dateDebutDialyse)} />
              <Row label={t('pd.r.firstCenter')} value={fmtDate(patient.datePremiereDialyseCentre)} />
              <Row label={t('pd.r.origin')} value={patient.centreOrigine || '—'} />
              <Row label={t('pd.r.dialyzer')} value={patient.dialyseurType ? `${patient.dialyseurType}${patient.dialyseurSurface ? ` · ${patient.dialyseurSurface}` : ''}` : '—'} />
              <Row label={t('pd.r.anticoag')} value={patient.anticoagulant || '—'} />
              <Row label={t('pd.r.allergies')} value={patient.allergies || t('common.none')} />
              <Row label={t('pd.r.antecedents')} value={patient.antecedents.length ? patient.antecedents.join(', ') : '—'} />
              <Row label={t('pd.r.coverage')} value={`${L.priseEnChargeLabel[patient.priseEnCharge]}${patient.numAssurance ? ` (${patient.numAssurance})` : ''}`} />
            </dl>
          </Card>
          <Card>
            <CardHeader title={t('pd.sero')} subtitle={t('pd.seroSub')} />
            <div className="grid grid-cols-3 gap-3 p-5">
              {(['vhb', 'vhc', 'vih'] as const).map((k) => (
                <div key={k} className="rounded-lg border border-slate-200 p-4 text-center">
                  <div className="text-xs uppercase text-slate-400">{k}</div>
                  <div className="mt-2">
                    <Badge tone={serologieTone[patient.serologies[k]]}>
                      {t(`sero.${patient.serologies[k]}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {ktvData.length > 0 && (
              <>
                <CardHeader title={t('pd.ktv')} subtitle={t('pd.ktvSub')} />
                <div className="h-44 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ktvData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis domain={[0.8, 1.8]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="ktv" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name="Kt/V" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'seances' && (
        <Card>
          <CardHeader title={t('pd.historyTitle')} subtitle={`${pSeances.length} ${t('pd.tab.seances').toLowerCase()}`} />
          {pSeances.length === 0 ? (
            <EmptyState icon={<Activity size={22} />} title={t('pd.noSession')} />
          ) : (
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>{t('pd.col.date')}</Th><Th>{t('pd.col.poste')}</Th><Th>{t('pd.col.weight')}</Th><Th>{t('pd.col.ta')}</Th><Th>{t('pd.col.uf')}</Th><Th>Kt/V</Th><Th>{t('common.status')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pSeances.slice(0, 20).map((s) => {
                  const m = machines.find((x) => x.id === s.machineId);
                  const sst = L.statutSeance[s.statut];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <Td>{fmtDate(s.date)}</Td>
                      <Td>{m?.code ?? '—'}</Td>
                      <Td>{s.poidsAvant ?? '—'} / {s.poidsApres ?? '—'} kg</Td>
                      <Td>{s.taSystoliqueAvant ? `${s.taSystoliqueAvant}/${s.taDiastoliqueAvant}` : '—'}</Td>
                      <Td>{s.ufTotal ? `${s.ufTotal} L` : '—'}</Td>
                      <Td>{s.ktv ?? '—'}</Td>
                      <Td><Badge tone={sst.tone}>{sst.label}</Badge></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'prescription' && (
        <Card>
          <CardHeader title={t('pd.activePresc')} subtitle={presc ? `${t('pd.estab')} ${fmtDate(presc.date)}` : undefined} action={<Link to="/prescriptions" className="text-sm font-medium text-brand-600 hover:underline">{t('pd.manage')}</Link>} />
          {!presc ? (
            <EmptyState icon={<ClipboardList size={22} />} title={t('pd.noPresc')} />
          ) : (
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <dl className="divide-y divide-slate-100 text-sm">
                <Row label={t('pd.duration')} value={`${presc.dureeSeance} min`} />
                <Row label={t('pd.freq')} value={`${presc.frequenceHebdo}/sem`} />
                <Row label={t('pd.r.dialyzer')} value={presc.dialyseur} />
                <Row label={t('pd.bloodFlow')} value={`${presc.debitSang} ml/min`} />
                <Row label={t('pd.dialysate')} value={`${presc.debitDialysat} ml/min`} />
                <Row label={t('pd.anticoag')} value={presc.anticoagulation} />
                <Row label={t('pd.bath')} value={presc.bainDialyse} />
              </dl>
              <div>
                <div className="mb-2 text-sm font-semibold text-slate-700">{t('pd.meds')}</div>
                <div className="space-y-2">
                  {presc.medicaments.map((m, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{m.nom}</span>
                      <span className="text-slate-500">{m.posologie}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'facturation' && (
        <Card>
          <CardHeader title={t('pd.tab.billing')} subtitle={`${pFactures.length} ${t('arch.factures').toLowerCase()}`} />
          {pFactures.length === 0 ? (
            <EmptyState icon={<Receipt size={22} />} title={t('pd.noInvoice')} />
          ) : (
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr><Th>{t('pd.col.num')}</Th><Th>{t('pd.col.date')}</Th><Th>{t('pd.col.amount')}</Th><Th>{t('pd.col.part')}</Th><Th>{t('pd.col.paid')}</Th><Th>{t('common.status')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pFactures.map((f) => {
                  const fst = L.statutFacture[f.statut];
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <Td className="font-medium">{f.numero}</Td>
                      <Td>{fmtDate(f.date)}</Td>
                      <Td>{fmtMoney(f.montantTotal, settings.devise)}</Td>
                      <Td>{f.partAssurance}%</Td>
                      <Td>{fmtMoney(f.montantPaye, settings.devise)}</Td>
                      <Td><Badge tone={fst.tone}>{fst.label}</Badge></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-2">
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}
