import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Users, Activity, Gauge, HeartPulse, FileText } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, PageHeader, StatCard, Button } from '@/components/ui';
import { age, downloadDashboardPDF, slugify, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';

const COLORS = ['#1a5fe0', '#0d9488', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function Reporting() {
  const { patients, seances, machines, settings } = useStore();
  const { t, lang } = useT();
  const LT = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const L = useLabels();

  const actifs = patients.filter((p) => p.statut === 'actif');

  // Pyramide d'âge
  const tranches = ['<30', '30-44', '45-59', '60-74', '≥75'];
  const ageData = tranches.map((t) => ({ tranche: t, Hommes: 0, Femmes: 0 }));
  actifs.forEach((p) => {
    const a = age(p.dateNaissance) as number;
    const idx = a < 30 ? 0 : a < 45 ? 1 : a < 60 ? 2 : a < 75 ? 3 : 4;
    if (p.sexe === 'M') ageData[idx].Hommes++;
    else ageData[idx].Femmes++;
  });

  // Répartition abord vasculaire
  const abordData = Object.entries(
    actifs.reduce<Record<string, number>>((acc, p) => {
      acc[p.abord] = (acc[p.abord] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([k, v]) => ({ name: L.abordLabel[k as keyof typeof L.abordLabel], value: v }));

  // Néphropathies
  const nephroData = Object.entries(
    actifs.reduce<Record<string, number>>((acc, p) => {
      acc[p.nephropathie] = (acc[p.nephropathie] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Kt/V moyen sur 14 jours
  const terminées = seances.filter((s) => s.statut === 'terminee' && s.ktv);
  const ktvMoyen = terminées.length ? (terminées.reduce((a, s) => a + (s.ktv ?? 0), 0) / terminées.length).toFixed(2) : '—';
  const ktvCible = terminées.length ? Math.round((terminées.filter((s) => (s.ktv ?? 0) >= 1.2).length / terminées.length) * 100) : 0;

  // Séances / semaine (4 dernières semaines)
  const semaines = Array.from({ length: 4 }).map((_, i) => {
    const start = new Date();
    start.setDate(start.getDate() - (3 - i) * 7 - 6);
    const end = new Date();
    end.setDate(end.getDate() - (3 - i) * 7);
    const s = start.toISOString().slice(0, 10);
    const e = end.toISOString().slice(0, 10);
    return {
      semaine: `S-${3 - i}`,
      seances: seances.filter((x) => x.date >= s && x.date <= e).length,
    };
  });

  const exportPDF = () => {
    const hommes = actifs.filter((p) => p.sexe === 'M').length;
    const femmes = actifs.length - hommes;
    const favCount = actifs.filter((p) => p.abord === 'FAV').length;
    const favRate = actifs.length ? Math.round((favCount / actifs.length) * 100) : 0;
    const topNephro = nephroData[0];
    const topAbord = abordData.slice().sort((a, b) => b.value - a.value)[0];
    const volDebut = semaines[0]?.seances ?? 0;
    const volFin = semaines[semaines.length - 1]?.seances ?? 0;
    const volVar = volDebut === 0 ? 0 : Math.round(((volFin - volDebut) / volDebut) * 100);
    const ageMoyen = actifs.length ? Math.round(actifs.reduce((a, p) => a + (age(p.dateNaissance) as number), 0) / actifs.length) : 0;

    const kpis = [
      { label: t('rp.activeFile'), value: String(actifs.length), hint: `${hommes} H · ${femmes} F` },
      { label: t('rp.sessionsDone'), value: String(terminées.length) },
      { label: t('rp.ktvAvg'), value: String(ktvMoyen), hint: 'cible ≥ 1,2' },
      { label: t('rp.atTarget'), value: `${ktvCible}%`, hint: 'séances à la cible Kt/V' },
    ];

    const filePoints = [
      LT(`La file active compte ${actifs.length} patient(s) dialysé(s) : ${hommes} homme(s) et ${femmes} femme(s), d'âge moyen ${ageMoyen} ans.`, `The active file has ${actifs.length} dialysis patient(s): ${hommes} male, ${femmes} female, mean age ${ageMoyen} years.`),
      topNephro
        ? LT(`La néphropathie causale la plus fréquente est « ${topNephro.name} » (${topNephro.value} patient(s), soit ${Math.round((topNephro.value / (actifs.length || 1)) * 100)} %).`, `The most frequent causal nephropathy is "${topNephro.name}" (${topNephro.value} patient(s), i.e. ${Math.round((topNephro.value / (actifs.length || 1)) * 100)}%).`)
        : LT('Les néphropathies causales ne sont pas encore renseignées.', 'Causal nephropathies are not documented yet.'),
    ];

    const adequationPoints = [
      ktvMoyen === '—'
        ? LT("Aucune séance terminée avec Kt/V renseigné : l'adéquation de dialyse ne peut être évaluée sur la période.", 'No completed session with a recorded Kt/V: dialysis adequacy cannot be assessed for the period.')
        : LT(`Le Kt/V moyen est de ${ktvMoyen}, et ${ktvCible} % des séances atteignent la cible d'adéquation (Kt/V ≥ 1,2) sur ${terminées.length} séance(s) évaluée(s).`, `Mean Kt/V is ${ktvMoyen}, and ${ktvCible}% of sessions reach the adequacy target (Kt/V ≥ 1.2) over ${terminées.length} assessed session(s).`),
      ktvCible >= 80
        ? LT("L'adéquation de dialyse est satisfaisante et conforme aux recommandations.", 'Dialysis adequacy is satisfactory and in line with guidelines.')
        : ktvCible >= 60
          ? LT("L'adéquation est perfectible : revoir la durée, le débit et la prescription des séances sous la cible.", 'Adequacy can be improved: review the duration, flow and prescription of sub-target sessions.')
          : LT("L'adéquation est insuffisante : un audit des prescriptions et des abords vasculaires est recommandé.", 'Adequacy is insufficient: an audit of prescriptions and vascular accesses is recommended.'),
    ];

    const abordPoints = [
      topAbord ? LT(`L'abord vasculaire dominant est « ${topAbord.name} » (${Math.round((topAbord.value / (actifs.length || 1)) * 100)} % des patients).`, `The dominant vascular access is "${topAbord.name}" (${Math.round((topAbord.value / (actifs.length || 1)) * 100)}% of patients).`) : '',
      favRate >= 60
        ? LT(`Le taux de fistule artério-veineuse (FAV) est de ${favRate} %, conforme à l'objectif de privilégier l'abord natif (moindre risque infectieux).`, `The arteriovenous fistula (AVF) rate is ${favRate}%, in line with the goal of favouring native access (lower infection risk).`)
        : LT(`Le taux de FAV n'est que de ${favRate} % : encourager la création d'abords natifs pour réduire le recours aux cathéters et le risque infectieux.`, `The AVF rate is only ${favRate}%: encourage native access creation to reduce catheter use and infection risk.`),
    ].filter(Boolean);

    const activitePoints = [
      LT(`Volume d'activité : ${volFin} séance(s) sur la dernière semaine, contre ${volDebut} il y a quatre semaines (${volVar === 0 ? 'activité stable' : volVar > 0 ? `+${volVar} %` : `${volVar} %`}).`, `Activity volume: ${volFin} session(s) last week versus ${volDebut} four weeks ago (${volVar === 0 ? 'stable' : volVar > 0 ? `+${volVar}%` : `${volVar}%`}).`),
      LT(`${machines.length} générateur(s) au parc pour assurer cette activité.`, `${machines.length} generator(s) in the fleet to support this activity.`),
    ];

    downloadDashboardPDF(`reporting-medical-${slugify(todayISO())}`, {
      settings,
      titre: t('rp.title'),
      date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      kpis,
      analyse: [
        { titre: LT('File active & épidémiologie','Active file & epidemiology'), points: filePoints },
        { titre: LT('Adéquation de dialyse (Kt/V)','Dialysis adequacy (Kt/V)'), points: adequationPoints },
        { titre: LT('Abords vasculaires','Vascular accesses'), points: abordPoints },
        { titre: LT("Volume d'activité",'Activity volume'), points: activitePoints },
      ],
    });
  };

  return (
    <div>
      <PageHeader
        title={t('rp.title')}
        subtitle={t('rp.subtitle')}
        action={<Button variant="secondary" onClick={exportPDF}><FileText size={16} /> {t('common.downloadPdf')}</Button>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('rp.activeFile')} value={actifs.length} icon={<Users size={18} />} tone="blue" />
        <StatCard label={t('rp.sessionsDone')} value={terminées.length} icon={<Activity size={18} />} tone="teal" />
        <StatCard label={t('rp.ktvAvg')} value={ktvMoyen} icon={<Gauge size={18} />} tone="green" hint="≥ 1,2" />
        <StatCard label={t('rp.atTarget')} value={`${ktvCible}%`} icon={<HeartPulse size={18} />} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('rp.agePyramid')} subtitle={t('rp.ageSub')} />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Hommes" name={t('rp.men')} fill="#1a5fe0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Femmes" name={t('rp.women')} fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('rp.accessTitle')} subtitle={t('rp.accessSub')} />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={abordData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={75}>
                  {abordData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('rp.nephropathies')} subtitle={t('rp.nephropathiesSub')} />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={nephroData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('rp.volume')} subtitle={t('rp.volumeSub')} />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={semaines} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semaine" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="seances" stroke="#1a5fe0" strokeWidth={2} dot={{ r: 4 }} name={t('arch.seances')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <p className="mt-4 text-xs text-slate-400">{machines.length} {t('ma.subtitle').replace('{n}', '').trim()}</p>
    </div>
  );
}
