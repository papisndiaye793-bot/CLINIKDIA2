import { Link } from 'react-router-dom';
import {
  Users,
  Activity,
  CalendarCheck,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Droplets,
  PackageX,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, StatCard, Badge, PageHeader, Button } from '@/components/ui';
import { fmtMoney, todayISO, downloadDashboardPDF, slugify } from '@/lib/utils';
import { statutMachine, statutSeance, priseEnChargeLabel } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import { FileText } from 'lucide-react';

const PIE_COLORS = ['#1a5fe0', '#0d9488', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function Dashboard() {
  const { patients, machines, seances, factures, articlesStock, maintenances, settings } = useStore();
  const { t, lang } = useT();
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);

  const today = todayISO();
  const patientsActifs = patients.filter((p) => p.statut === 'actif').length;
  const seancesToday = seances.filter((s) => s.date === today);
  const machinesOp = machines.filter((m) => m.statut === 'operationnel').length;
  const tauxOccupation = Math.round((seancesToday.length / (machines.length * 3)) * 100);

  const caEncaisse = factures.reduce((a, f) => a + f.montantPaye, 0);
  const impayes = factures.reduce((a, f) => a + (f.montantTotal * (1 - f.partAssurance / 100) - f.montantPaye), 0);

  const stockAlertes = articlesStock.filter((a) => a.quantite <= a.seuilAlerte);
  const maintEnCours = maintenances.filter((m) => m.statut !== 'terminee');

  // Activité 14 derniers jours
  const activite = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const iso = d.toISOString().slice(0, 10);
    return {
      jour: d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
      seances: seances.filter((s) => s.date === iso).length,
    };
  });

  // Répartition prise en charge
  const pecData = Object.entries(
    patients.reduce<Record<string, number>>((acc, p) => {
      acc[p.priseEnCharge] = (acc[p.priseEnCharge] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([k, v]) => ({ name: priseEnChargeLabel[k as keyof typeof priseEnChargeLabel], value: v }));

  const exportPDF = () => {
    const dateLabel = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Indicateurs de tendance sur l'activité (7 derniers jours vs 7 précédents)
    const last7 = activite.slice(7).reduce((a, d) => a + d.seances, 0);
    const prev7 = activite.slice(0, 7).reduce((a, d) => a + d.seances, 0);
    const varPct = prev7 === 0 ? 0 : Math.round(((last7 - prev7) / prev7) * 100);
    const moyJour = (last7 / 7).toFixed(1);

    const totalPatients = patients.length || 1;
    const pecTop = pecData.slice().sort((a, b) => b.value - a.value)[0];
    const txRecouvGlobal = caEncaisse + impayes > 0 ? Math.round((caEncaisse / (caEncaisse + impayes)) * 100) : 100;

    const kpis = [
      { label: t('dash.patientsActifs'), value: String(patientsActifs), hint: `${patients.length} ${t('dash.total')}` },
      { label: t('dash.seancesToday'), value: String(seancesToday.length), hint: `${t('dash.tauxOccupation')} ${tauxOccupation}%` },
      { label: t('dash.generateurs'), value: `${machinesOp}/${machines.length}`, hint: `${maintEnCours.length} ${t('dash.enMaintenance')}` },
      { label: t('dash.encaisse'), value: fmtMoney(caEncaisse, settings.devise), hint: `${fmtMoney(impayes, settings.devise)} ${t('dash.enAttente')}` },
    ];

    // Analyse & interprétation générées à partir des données
    const activitePoints = [
      L(`${last7} séances réalisées sur les 7 derniers jours, soit une moyenne de ${moyJour} séances/jour.`, `${last7} sessions over the last 7 days, i.e. an average of ${moyJour} sessions/day.`),
      varPct === 0
        ? L("L'activité est stable par rapport à la semaine précédente.", 'Activity is stable compared to the previous week.')
        : L(`L'activité est ${varPct > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(varPct)} % par rapport aux 7 jours précédents (${prev7} séances).`, `Activity is ${varPct > 0 ? 'up' : 'down'} ${Math.abs(varPct)}% versus the previous 7 days (${prev7} sessions).`),
    ];

    const occupationPoints = [
      L(`Le taux d'occupation du jour est de ${tauxOccupation} % (${seancesToday.length} séances pour ${machines.length * 3} créneaux disponibles).`, `Today's occupancy is ${tauxOccupation}% (${seancesToday.length} sessions for ${machines.length * 3} available slots).`),
      tauxOccupation >= 85
        ? L('Le parc est proche de la saturation : anticiper une capacité additionnelle ou un décalage de créneaux pour absorber la demande.', 'The fleet is near saturation: plan additional capacity or shift slots to absorb demand.')
        : tauxOccupation < 50
          ? L("L'utilisation reste faible : il existe une marge pour programmer davantage de séances et améliorer le rendement des générateurs.", 'Utilisation remains low: there is room to schedule more sessions and improve generator throughput.')
          : L("L'occupation est équilibrée, avec une réserve de capacité confortable.", 'Occupancy is balanced, with a comfortable capacity reserve.'),
    ];

    const parcPoints = [
      L(`${machinesOp} générateur(s) opérationnel(s) sur ${machines.length}${maintEnCours.length ? `, ${maintEnCours.length} en maintenance` : ''}.`, `${machinesOp} operational generator(s) of ${machines.length}${maintEnCours.length ? `, ${maintEnCours.length} under maintenance` : ''}.`),
      stockAlertes.length
        ? L(`${stockAlertes.length} article(s) de stock sous le seuil d'alerte — réapprovisionnement à planifier pour éviter toute rupture.`, `${stockAlertes.length} stock item(s) below the alert threshold — plan replenishment to avoid stock-outs.`)
        : L('Aucune alerte de stock : les niveaux de consommables sont au-dessus des seuils.', 'No stock alert: consumable levels are above thresholds.'),
    ];

    const financePoints = [
      L(`${fmtMoney(caEncaisse, settings.devise)} encaissés pour ${fmtMoney(impayes, settings.devise)} restant à recouvrer (taux de recouvrement global : ${txRecouvGlobal} %).`, `${fmtMoney(caEncaisse, settings.devise)} collected with ${fmtMoney(impayes, settings.devise)} still to recover (overall recovery rate: ${txRecouvGlobal}%).`),
      impayes > caEncaisse * 0.3
        ? L("Les impayés représentent une part élevée du chiffre d'affaires : renforcer le suivi des relances patients et assurances.", 'Unpaid invoices are a high share of revenue: strengthen patient and insurer follow-up.')
        : L('Le niveau des impayés reste maîtrisé.', 'The level of unpaid invoices remains under control.'),
    ];

    const filePoints = [
      L(`${patientsActifs} patients actifs sur ${patients.length} au total.`, `${patientsActifs} active patients of ${patients.length} total.`),
      pecTop
        ? L(`La prise en charge dominante est « ${pecTop.name} » (${Math.round((pecTop.value / totalPatients) * 100)} % des patients).`, `The dominant coverage is "${pecTop.name}" (${Math.round((pecTop.value / totalPatients) * 100)}% of patients).`)
        : '',
    ].filter(Boolean);

    downloadDashboardPDF(`tableau-de-bord-${slugify(todayISO())}`, {
      settings,
      titre: t('nav.dashboard'),
      date: dateLabel,
      kpis,
      analyse: [
        { titre: L('Activité clinique','Clinical activity'), points: activitePoints },
        { titre: L("Taux d'occupation",'Occupancy rate'), points: occupationPoints },
        { titre: L('Parc & consommables','Fleet & consumables'), points: parcPoints },
        { titre: L('Situation financière','Financial position'), points: financePoints },
        { titre: L('File active patients','Active patient file'), points: filePoints },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.dashboard')}
        subtitle={new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        action={<Button variant="secondary" onClick={exportPDF}><FileText size={16} /> {t('common.downloadPdf')}</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('dash.patientsActifs')} value={patientsActifs} icon={<Users size={18} />} tone="blue" hint={`${patients.length} ${t('dash.total')}`} />
        <StatCard label={t('dash.seancesToday')} value={seancesToday.length} icon={<CalendarCheck size={18} />} tone="teal" hint={`${t('dash.tauxOccupation')} ${tauxOccupation}%`} />
        <StatCard label={t('dash.generateurs')} value={`${machinesOp}/${machines.length}`} icon={<Activity size={18} />} tone="green" hint={`${maintEnCours.length} ${t('dash.enMaintenance')}`} />
        <StatCard label={t('dash.encaisse')} value={fmtMoney(caEncaisse, settings.devise)} icon={<Wallet size={18} />} tone="purple" hint={`${fmtMoney(impayes, settings.devise)} ${t('dash.enAttente')}`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('dash.activite')} subtitle={t('dash.activiteSub')} action={<TrendingUp size={18} className="text-emerald-500" />} />
          <div className="h-72 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activite} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a5fe0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1a5fe0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="seances" stroke="#1a5fe0" strokeWidth={2} fill="url(#g1)" name="Séances" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('dash.priseEnCharge')} subtitle={t('dash.priseEnChargeSub')} />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pecData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} innerRadius={42}>
                  {pecData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Alertes */}
        <Card>
          <CardHeader title={t('dash.alertes')} subtitle={t('dash.alertesSub')} action={<AlertTriangle size={18} className="text-amber-500" />} />
          <div className="divide-y divide-slate-100">
            {maintEnCours.map((m) => {
              const machine = machines.find((x) => x.id === m.machineId);
              return (
                <Link to="/machines" key={m.id} className="flex items-center gap-3 rounded-3xl px-5 py-4 transition duration-200 hover:bg-slate-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Activity size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700">{machine?.code} — {m.description}</div>
                    <div className="text-xs text-slate-400">Maintenance {m.type}</div>
                  </div>
                </Link>
              );
            })}
            {stockAlertes.slice(0, 4).map((a) => (
              <Link to="/stock" key={a.id} className="flex items-center gap-3 rounded-3xl px-5 py-4 transition duration-200 hover:bg-slate-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <PackageX size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-700">{a.designation}</div>
                  <div className="text-xs text-slate-400">Stock bas : {a.quantite} (seuil {a.seuilAlerte})</div>
                </div>
              </Link>
            ))}
            {maintEnCours.length === 0 && stockAlertes.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">{t('dash.aucuneAlerte')}</div>
            )}
          </div>
        </Card>

        {/* Séances en cours */}
        <Card className="lg:col-span-2">
          <CardHeader title={t('dash.seancesDuJour')} subtitle={`${seancesToday.length} ${t('dash.seancesProgrammees')}`} action={<Link to="/planning" className="text-sm font-medium text-brand-600 hover:underline">{t('dash.voirPlanning')}</Link>} />
          <div className="max-h-72 overflow-y-auto rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {seancesToday.slice(0, 8).map((s) => {
                  const patient = patients.find((p) => p.id === s.patientId);
                  const machine = machines.find((m) => m.id === s.machineId);
                  const st = statutSeance[s.statut];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-sm font-semibold text-brand-700">
                            <Droplets size={14} />
                          </span>
                          <div>
                            <div className="font-medium text-slate-700">{patient?.prenom} {patient?.nom}</div>
                            <div className="text-xs text-slate-400">{machine?.code} · {t('dash.poste')} {machine?.poste}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* État des générateurs */}
      <Card className="mt-6">
        <CardHeader title={t('dash.etatParc')} subtitle={`${machines.length} ${t('dash.postes')}`} />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-6">
          {machines.map((m) => {
            const st = statutMachine[m.statut];
            return (
              <div key={m.id} className="rounded-3xl border border-slate-200/80 p-4 text-center transition hover:shadow-sm">
                <div className="text-xs text-slate-400">{t('dash.poste')} {m.poste}</div>
                <div className="my-1 font-semibold text-slate-700">{m.code}</div>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
