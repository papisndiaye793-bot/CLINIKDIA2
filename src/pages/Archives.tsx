import { useMemo, useState } from 'react';
import { Archive as ArchiveIcon, Search, Activity, Receipt, Wallet, Users2, CalendarClock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useT } from '@/lib/i18n';
import { PageHeader, Card, Badge, Table, Th, Td, EmptyState, StatCard } from '@/components/ui';
import { fmtDate, fmtMoney, initials } from '@/lib/utils';
import { useLabels } from '@/lib/labels';

export default function Archives() {
  const { archives, patients, machines, settings } = useStore();
  const { t } = useT();
  const L = useLabels();
  const [year, setYear] = useState<number | null>(archives[0]?.year ?? null);
  const [tab, setTab] = useState<'seances' | 'factures' | 'depenses' | 'patients'>('seances');
  const [q, setQ] = useState('');

  const archive = archives.find((a) => a.year === year) ?? null;
  const patientName = (id: string) => { const p = patients.find((x) => x.id === id); return p ? `${p.prenom} ${p.nom}` : '—'; };
  const machineCode = (id: string) => machines.find((m) => m.id === id)?.code ?? '—';

  const ql = q.toLowerCase();
  const seances = useMemo(() => (archive?.seances ?? []).filter((s) => !q || patientName(s.patientId).toLowerCase().includes(ql)), [archive, q]); // eslint-disable-line
  const factures = useMemo(() => (archive?.factures ?? []).filter((f) => !q || f.numero.toLowerCase().includes(ql) || patientName(f.patientId).toLowerCase().includes(ql)), [archive, q]); // eslint-disable-line
  const depenses = useMemo(() => (archive?.depenses ?? []).filter((d) => !q || d.libelle.toLowerCase().includes(ql) || d.code.toLowerCase().includes(ql)), [archive, q]); // eslint-disable-line

  // Patients ayant eu de l'activité durant l'exercice
  const archivedPatients = useMemo(() => {
    if (!archive) return [];
    const map = new Map<string, { seances: number; factures: number }>();
    archive.seances.forEach((s) => { const e = map.get(s.patientId) ?? { seances: 0, factures: 0 }; e.seances++; map.set(s.patientId, e); });
    archive.factures.forEach((f) => { const e = map.get(f.patientId) ?? { seances: 0, factures: 0 }; e.factures++; map.set(f.patientId, e); });
    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .filter((p) => !q || patientName(p.id).toLowerCase().includes(ql));
  }, [archive, q]); // eslint-disable-line

  if (archives.length === 0) {
    return (
      <div>
        <PageHeader title={t('arch.title')} subtitle={t('arch.subtitle')} />
        <Card className="p-10">
          <EmptyState icon={<ArchiveIcon size={22} />} title={t('arch.none')} hint={t('arch.noneHint')} />
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'seances' as const, label: t('arch.seances'), icon: Activity, count: archive?.seances.length ?? 0 },
    { id: 'factures' as const, label: t('arch.factures'), icon: Receipt, count: archive?.factures.length ?? 0 },
    { id: 'depenses' as const, label: t('arch.depenses'), icon: Wallet, count: archive?.depenses.length ?? 0 },
    { id: 'patients' as const, label: t('arch.patients'), icon: Users2, count: archivedPatients.length },
  ];

  const caFacture = archive?.factures.reduce((a, f) => a + f.montantTotal, 0) ?? 0;
  const totalDepenses = archive?.depenses.reduce((a, d) => a + d.montant, 0) ?? 0;

  return (
    <div>
      <PageHeader title={t('arch.title')} subtitle={t('arch.subtitle')} />

      {/* Sélecteur d'exercice */}
      <div className="mb-5 flex flex-wrap gap-2">
        {archives.map((a) => (
          <button
            key={a.year}
            onClick={() => { setYear(a.year); setQ(''); }}
            className={
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ' +
              (a.year === year ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
            }
          >
            <CalendarClock size={15} /> {t('arch.year')} {a.year}
            <span className="text-xs text-slate-400">· {t('arch.closedAt')} {fmtDate(a.closedAt)}</span>
          </button>
        ))}
      </div>

      {archive && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('arch.seances')} value={archive.seances.length} icon={<Activity size={18} />} tone="blue" />
            <StatCard label={t('arch.revenue')} value={fmtMoney(caFacture, settings.devise)} icon={<Receipt size={18} />} tone="green" hint={t('arch.invoicesN').replace('{n}', String(archive.factures.length))} />
            <StatCard label={t('arch.depenses')} value={fmtMoney(totalDepenses, settings.devise)} icon={<Wallet size={18} />} tone="red" hint={t('arch.expensesN').replace('{n}', String(archive.depenses.length))} />
            <StatCard label={t('arch.patients')} value={archivedPatients.length} icon={<Users2 size={18} />} tone="purple" />
          </div>

          {/* Résultat net de l'exercice */}
          <div className={'mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ' + (caFacture - totalDepenses >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50')}>
            <div className="flex items-center gap-3">
              <span className={'flex h-10 w-10 items-center justify-center rounded-xl ' + (caFacture - totalDepenses >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                <Wallet size={20} />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-700">{t('arch.resultTitle').replace('{y}', String(archive.year))}</div>
                <div className="text-xs text-slate-500">{t('arch.revenue')} {fmtMoney(caFacture, settings.devise)} − {t('arch.depenses')} {fmtMoney(totalDepenses, settings.devise)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('arch.netResult')}</div>
              <div className={'text-2xl font-bold ' + (caFacture - totalDepenses >= 0 ? 'text-emerald-700' : 'text-red-700')}>{fmtMoney(caFacture - totalDepenses, settings.devise)}</div>
            </div>
          </div>

          {/* Onglets */}
          <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' + (tab === tb.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}
              >
                <tb.icon size={16} /> {tb.label} <span className="text-xs text-slate-400">({tb.count})</span>
              </button>
            ))}
          </div>

          {/* Recherche */}
          <Card className="mb-4 p-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('arch.search')} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </div>
          </Card>

          <Card>
            {tab === 'seances' && (
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr><Th>{t('cf.date')}</Th><Th>{t('cf.patient')}</Th><Th>{t('pl.poste')}</Th><Th>{t('arch.colCreneau')}</Th><Th>Kt/V</Th><Th>{t('common.status')}</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seances.length === 0 ? (
                    <tr><Td colSpan={6} className="py-10 text-center text-slate-400">{t('arch.noResult')}</Td></tr>
                  ) : seances.slice(0, 200).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <Td>{fmtDate(s.date)}</Td>
                      <Td className="font-medium">{patientName(s.patientId)}</Td>
                      <Td>{machineCode(s.machineId)}</Td>
                      <Td>{L.creneauLabel[s.creneau]}</Td>
                      <Td>{s.ktv ?? '—'}</Td>
                      <Td><Badge tone={L.statutSeance[s.statut].tone}>{L.statutSeance[s.statut].label}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            {tab === 'factures' && (
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr><Th>{t('arch.colInvoiceNo')}</Th><Th>{t('cf.patient')}</Th><Th>{t('cf.date')}</Th><Th>{t('arch.colAmount')}</Th><Th>{t('arch.colPaid')}</Th><Th>{t('common.status')}</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factures.length === 0 ? (
                    <tr><Td colSpan={6} className="py-10 text-center text-slate-400">{t('arch.noResult')}</Td></tr>
                  ) : factures.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <Td className="font-medium">{f.numero}</Td>
                      <Td>{patientName(f.patientId)}</Td>
                      <Td>{fmtDate(f.date)}</Td>
                      <Td>{fmtMoney(f.montantTotal, settings.devise)}</Td>
                      <Td>{fmtMoney(f.montantPaye, settings.devise)}</Td>
                      <Td><Badge tone={L.statutFacture[f.statut].tone}>{L.statutFacture[f.statut].label}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            {tab === 'depenses' && (
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr><Th>{t('arch.colRef')}</Th><Th>{t('cf.date')}</Th><Th>{t('arch.colLabel')}</Th><Th>{t('arch.colCategory')}</Th><Th>{t('arch.colAmount')}</Th><Th>{t('common.status')}</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depenses.length === 0 ? (
                    <tr><Td colSpan={6} className="py-10 text-center text-slate-400">{t('arch.noResult')}</Td></tr>
                  ) : depenses.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <Td className="font-medium">{d.code}</Td>
                      <Td>{fmtDate(d.date)}</Td>
                      <Td className="max-w-xs whitespace-normal text-slate-600">{d.libelle}</Td>
                      <Td>{L.categorieDepenseLabel[d.categorie]}</Td>
                      <Td>{fmtMoney(d.montant, settings.devise)}</Td>
                      <Td><Badge tone={L.statutDepense[d.statut].tone}>{L.statutDepense[d.statut].label}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            {tab === 'patients' && (
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr><Th>{t('cf.patient')}</Th><Th>{t('arch.seances')}</Th><Th>{t('arch.factures')}</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {archivedPatients.length === 0 ? (
                    <tr><Td colSpan={3} className="py-10 text-center text-slate-400">{t('arch.noResult')}</Td></tr>
                  ) : archivedPatients.map((p) => {
                    const pat = patients.find((x) => x.id === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{pat ? initials(pat.nom, pat.prenom) : '?'}</span>
                            <span className="font-medium text-slate-800">{patientName(p.id)}</span>
                          </div>
                        </Td>
                        <Td>{p.seances}</Td>
                        <Td>{p.factures}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
