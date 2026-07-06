import { useMemo, useState } from 'react';
import { Wallet, Users2, Receipt, Banknote, Printer, X, Droplets, Plus, SlidersHorizontal, Save, RotateCcw, Trash2, Power } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { PageHeader, Card, Button, Table, Th, Td, StatCard, Input, Modal } from '@/components/ui';
import { cn, fmtMoney, initials } from '@/lib/utils';
import { computePaie, estCadre, DEFAULT_BAREME, PLAFOND_MAX, type PaieBareme, type Cotisation } from '@/lib/paie';
import type { Staff } from '@/types';

const uid = () => Math.random().toString(36).slice(2, 9);

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export default function Paie() {
  const { staff, settings, paieBareme } = useStore();
  const { canAccess, canWrite } = useAuth();
  const { t, lang } = useT();
  const L = useLabels();
  const [tab, setTab] = useState<'bulletins' | 'taux'>('bulletins');
  const [period, setPeriod] = useState(currentPeriod());
  const [target, setTarget] = useState<Staff | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const employes = staff.filter((s) => s.actif && (s.salaireBase ?? 0) > 0);
  const tousMembres = staff.filter((s) => s.actif); // tous les membres actifs (pour « Nouveau bulletin »)

  const totaux = useMemo(() => {
    return employes.reduce(
      (acc, s) => {
        const p = computePaie({ salaireBase: s.salaireBase ?? 0, cadre: s.cadre ?? estCadre(s.role) }, paieBareme);
        acc.brut += p.brut; acc.retenues += p.totalRetenues; acc.net += p.netAPayer; acc.patronales += p.chargesPatronales;
        return acc;
      },
      { brut: 0, retenues: 0, net: 0, patronales: 0 },
    );
  }, [employes, paieBareme]);

  if (!canAccess('paie')) {
    return (
      <div>
        <PageHeader title={t('pa.title')} subtitle={t('pa.subtitle')} />
        <Card className="p-10 text-center text-slate-400">—</Card>
      </div>
    );
  }

  const tabs = [
    { id: 'bulletins' as const, label: t('pa.tabSlips'), icon: Banknote },
    { id: 'taux' as const, label: t('pa.tabRates'), icon: SlidersHorizontal },
  ];

  return (
    <div>
      <PageHeader
        title={t('pa.title')}
        subtitle={t('pa.subtitle')}
        action={
          tab === 'bulletins' ? (
            <div className="flex items-center gap-2">
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value || currentPeriod())} className="w-40" />
              <Button onClick={() => setNewOpen(true)}><Plus size={16} /> {t('pa.newSlip')}</Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' + (tab === tb.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            <tb.icon size={16} /> {tb.label}
          </button>
        ))}
      </div>

      {tab === 'bulletins' && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('pa.grossMass')} value={fmtMoney(totaux.brut, settings.devise)} icon={<Wallet size={18} />} tone="blue" hint={`${employes.length} ${t('pa.employee').toLowerCase()}`} />
            <StatCard label={t('pa.deductions')} value={fmtMoney(totaux.retenues, settings.devise)} icon={<Receipt size={18} />} tone="amber" />
            <StatCard label={t('pa.netMass')} value={fmtMoney(totaux.net, settings.devise)} icon={<Banknote size={18} />} tone="green" />
            <StatCard label={t('pa.employerCharges')} value={fmtMoney(totaux.patronales, settings.devise)} icon={<Users2 size={18} />} tone="purple" />
          </div>

          <Card>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr><Th>{t('pa.employee')}</Th><Th>{t('cf.role')}</Th><Th>{t('pa.gross')}</Th><Th>{t('pa.deductions')}</Th><Th>{t('pa.netToPay')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employes.map((s) => {
                  const p = computePaie({ salaireBase: s.salaireBase ?? 0, cadre: s.cadre ?? estCadre(s.role) }, paieBareme);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(s.nom, s.prenom)}</span>
                          <div>
                            <div className="font-medium text-slate-800">{s.role === 'nephrologue' ? 'Dr ' : ''}{s.prenom} {s.nom}</div>
                            <div className="text-xs text-slate-400">{s.code}</div>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-slate-500">{L.roleLabel[s.role].label}</Td>
                      <Td>{fmtMoney(p.brut, settings.devise)}</Td>
                      <Td className="text-amber-600">−{fmtMoney(p.totalRetenues, settings.devise)}</Td>
                      <Td className="font-semibold text-emerald-700">{fmtMoney(p.netAPayer, settings.devise)}</Td>
                      <Td className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setTarget(s)}><Printer size={15} /> {t('pa.payslip')}</Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {tab === 'taux' && <RatesTab canWrite={canWrite('paie')} />}

      {/* Nouveau bulletin — choix de l'employé */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('pa.newSlip')}
        footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>{t('common.cancel')}</Button></>}
      >
        <p className="mb-3 text-sm text-slate-500">{t('pa.chooseEmployee')} — {periodLabel(period, lang)}</p>
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {tousMembres.map((s) => (
            <button key={s.id} onClick={() => { setTarget(s); setNewOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{initials(s.nom, s.prenom)}</span>
              <span className="flex-1 text-sm font-medium text-slate-700">{s.role === 'nephrologue' ? 'Dr ' : ''}{s.prenom} {s.nom}</span>
              <span className="text-xs text-slate-400">{(s.salaireBase ?? 0) > 0 ? fmtMoney(s.salaireBase ?? 0, settings.devise) : L.roleLabel[s.role].label}</span>
            </button>
          ))}
        </div>
      </Modal>

      {target && <BulletinApercu staff={target} period={period} lang={lang} onClose={() => setTarget(null)} />}
    </div>
  );
}

function periodLabel(period: string, lang: string) {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' });
}

// ─── Onglet Taux & barèmes ───────────────────────────────────────────────────
function RatesTab({ canWrite }: { canWrite: boolean }) {
  const { paieBareme, updatePaieBareme, settings } = useStore();
  const { t } = useT();
  const [b, setB] = useState<PaieBareme>(() => structuredClone(paieBareme));
  const [saved, setSaved] = useState(false);
  const dev = settings.devise;

  const touch = () => setSaved(false);
  const save = () => { updatePaieBareme(b); setSaved(true); };
  const reset = () => { setB(structuredClone(DEFAULT_BAREME)); setSaved(false); };

  const setCot = (id: string, patch: Partial<Cotisation>) => {
    touch();
    setB((p) => ({ ...p, cotisations: p.cotisations.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  };
  const addCot = () => {
    touch();
    setB((p) => ({ ...p, cotisations: [...p.cotisations, { id: uid(), nom: t('pa.newCotisation'), sal: 0, pat: 0, plafond: PLAFOND_MAX, actif: true }] }));
  };
  const removeCot = (id: string) => {
    touch();
    setB((p) => ({ ...p, cotisations: p.cotisations.filter((c) => c.id !== id) }));
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{t('pa.ratesTitle')}</h3>
          <p className="text-sm text-slate-500">{t('pa.ratesHint')}</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            {saved && <span className="text-sm font-medium text-emerald-600">✓ {t('pa.ratesSaved')}</span>}
            <Button variant="outline" onClick={reset}><RotateCcw size={15} /> {t('pa.resetRates')}</Button>
            <Button onClick={save}><Save size={16} /> {t('common.save')}</Button>
          </div>
        )}
      </div>

      {/* Cotisations — dynamiques (ajouter / supprimer / activer-désactiver) */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2 pr-2 w-12">{t('pa.active')}</th>
              <th className="px-2 py-2">{t('pa.cotLabel')}</th>
              <th className="px-2 py-2">{t('pa.rateSal')} (%)</th>
              <th className="px-2 py-2">{t('pa.ratePat')} (%)</th>
              <th className="px-2 py-2">{t('pa.ceiling')} ({dev})</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {b.cotisations.map((c) => (
              <tr key={c.id} className={cn('border-b border-slate-100', !c.actif && 'opacity-50')}>
                <td className="py-2 pr-2">
                  <button
                    disabled={!canWrite}
                    onClick={() => setCot(c.id, { actif: !c.actif })}
                    title={c.actif ? t('pa.deactivate') : t('pa.activate')}
                    className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg border transition', c.actif ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-400')}
                  >
                    <Power size={14} />
                  </button>
                </td>
                <td className="px-2 py-2">
                  <input disabled={!canWrite} value={c.nom} onChange={(e) => setCot(c.id, { nom: e.target.value })} className="w-56 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50" />
                  {c.cadreOnly && <span className="ml-1.5 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600">cadre</span>}
                </td>
                <td className="px-2 py-2"><input type="number" step="0.01" disabled={!canWrite} value={+(c.sal * 100).toFixed(2)} onChange={(e) => setCot(c.id, { sal: (Number(e.target.value) || 0) / 100 })} className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50" /></td>
                <td className="px-2 py-2"><input type="number" step="0.01" disabled={!canWrite} value={+(c.pat * 100).toFixed(2)} onChange={(e) => setCot(c.id, { pat: (Number(e.target.value) || 0) / 100 })} className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50" /></td>
                <td className="px-2 py-2"><input type="number" disabled={!canWrite || c.plafond >= 1e11} value={c.plafond >= 1e11 ? '' : c.plafond} placeholder="∞" onChange={(e) => setCot(c.id, { plafond: Number(e.target.value) || 0 })} className="w-28 rounded border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50" /></td>
                <td className="px-2 py-2 text-right">
                  {canWrite && (
                    <button onClick={() => removeCot(c.id)} title={t('common.delete')} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canWrite && (
        <button onClick={addCot} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600">
          <Plus size={15} /> {t('pa.addCotisation')}
        </button>
      )}

      {/* IR */}
      <div className="mt-6 flex items-center gap-2">
        <button disabled={!canWrite} onClick={() => { touch(); setB((p) => ({ ...p, irActif: !p.irActif })); }} title={b.irActif ? t('pa.deactivate') : t('pa.activate')}
          className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg border transition', b.irActif ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-400')}><Power size={14} /></button>
        <span className={cn('text-sm font-semibold', b.irActif ? 'text-slate-700' : 'text-slate-400')}>{t('pa.irBracket')}</span>
      </div>
      <div className={cn('mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3', !b.irActif && 'opacity-50')}>
        {b.irTranches.map((tr, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <span className="text-slate-500">{t('pa.upTo')}</span>
            <input type="number" disabled={!canWrite || tr.jusqua > 1e11} value={tr.jusqua > 1e11 ? '' : tr.jusqua} placeholder="∞"
              onChange={(e) => { const v = Number(e.target.value) || 0; setSaved(false); setB((p) => ({ ...p, irTranches: p.irTranches.map((x, j) => j === i ? { ...x, jusqua: v } : x) })); }}
              className="w-28 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-50" />
            <input type="number" step="0.01" disabled={!canWrite} value={+(tr.taux * 100).toFixed(2)}
              onChange={(e) => { const v = (Number(e.target.value) || 0) / 100; setSaved(false); setB((p) => ({ ...p, irTranches: p.irTranches.map((x, j) => j === i ? { ...x, taux: v } : x) })); }}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-50" />
            <span className="text-slate-400">%</span>
          </div>
        ))}
      </div>

      {/* TRIMF */}
      <div className="mt-6 flex items-center gap-2">
        <button disabled={!canWrite} onClick={() => { touch(); setB((p) => ({ ...p, trimfActif: !p.trimfActif })); }} title={b.trimfActif ? t('pa.deactivate') : t('pa.activate')}
          className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg border transition', b.trimfActif ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-400')}><Power size={14} /></button>
        <span className={cn('text-sm font-semibold', b.trimfActif ? 'text-slate-700' : 'text-slate-400')}>{t('pa.trimfTable')}</span>
      </div>
      <div className={cn('mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3', !b.trimfActif && 'opacity-50')}>
        {b.trimf.map((tr, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <span className="text-slate-500">{t('pa.upTo')}</span>
            <input type="number" disabled={!canWrite || tr.jusqua > 1e11} value={tr.jusqua > 1e11 ? '' : tr.jusqua} placeholder="∞"
              onChange={(e) => { const v = Number(e.target.value) || 0; setSaved(false); setB((p) => ({ ...p, trimf: p.trimf.map((x, j) => j === i ? { ...x, jusqua: v } : x) })); }}
              className="w-28 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-50" />
            <span className="text-slate-400">=</span>
            <input type="number" disabled={!canWrite} value={tr.montant}
              onChange={(e) => { const v = Number(e.target.value) || 0; setSaved(false); setB((p) => ({ ...p, trimf: p.trimf.map((x, j) => j === i ? { ...x, montant: v } : x) })); }}
              className="w-24 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-50" />
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">{t('pa.disclaimer')}</p>
    </Card>
  );
}

function BulletinApercu({ staff, period, lang, onClose }: { staff: Staff; period: string; lang: string; onClose: () => void }) {
  const { settings, paieBareme } = useStore();
  const { t } = useT();
  const L = useLabels();
  const [primes, setPrimes] = useState(0);
  const [parts, setParts] = useState(1);
  const cadre = staff.cadre ?? estCadre(staff.role);
  const p = computePaie({ salaireBase: staff.salaireBase ?? 0, primes, cadre, parts }, paieBareme);
  const dev = settings.devise;
  const role = L.roleLabel[staff.role];

  const Line = ({ label, base, rate, amount, neg }: { label: string; base?: number; rate?: string; amount: number; neg?: boolean }) => (
    <tr className="border-b border-slate-100">
      <td className="py-1.5 pr-2 text-slate-600">{label}</td>
      <td className="py-1.5 px-2 text-right text-slate-500">{base != null ? fmtMoney(base, dev) : ''}</td>
      <td className="py-1.5 px-2 text-right text-slate-500">{rate ?? ''}</td>
      <td className="py-1.5 pl-2 text-right font-medium text-slate-800">{neg ? '−' : ''}{fmtMoney(amount, dev)}</td>
    </tr>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-8">
      <div className="no-print mb-4 flex w-full max-w-[820px] flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{t('pa.payslip')} — {staff.prenom} {staff.nom}</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs text-white">
            {t('pa.bonuses')}
            <input type="number" value={primes} onChange={(e) => setPrimes(Number(e.target.value) || 0)} className="w-24 rounded bg-white/90 px-2 py-1 text-slate-800 outline-none" />
          </label>
          <label className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs text-white">
            {t('pa.parts')}
            <select value={parts} onChange={(e) => setParts(Number(e.target.value))} className="rounded bg-white/90 px-2 py-1 text-slate-800 outline-none">
              {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <Button onClick={() => window.print()}><Printer size={16} /> {t('pa.printPayslip')}</Button>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"><X size={18} /></button>
        </div>
      </div>

      <div className="bulletin-sheet w-full max-w-[820px] rounded-lg bg-white p-10 text-slate-800 shadow-2xl">
        <div className="flex items-start justify-between border-b-2 border-brand-600 pb-5">
          <div className="flex items-start gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white"><Droplets size={26} /></div>
            )}
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900">{settings.nom}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {settings.adresse}<br />
                {settings.ninea && <>NINEA : {settings.ninea} · </>}Tél : {settings.telephone}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-brand-700">{t('pa.slipTitle')}</div>
            <div className="mt-1 text-xs text-slate-500">{t('pa.period2')} : {periodLabel(period, lang)}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-slate-50 p-4 text-sm">
          <div><span className="text-slate-400">{t('pa.employee')} : </span><span className="font-semibold">{staff.role === 'nephrologue' ? 'Dr ' : ''}{staff.prenom} {staff.nom}</span></div>
          <div className="text-right"><span className="text-slate-400">{t('pa.matricule')} : </span><span className="font-medium">{staff.code}</span></div>
          <div><span className="text-slate-400">{t('pa.function')} : </span><span className="font-medium">{role.label}</span></div>
          <div className="text-right"><span className="text-slate-400">{t('pa.category')} : </span><span className="font-medium">{cadre ? t('pa.cadre') : t('pa.nonCadre')}</span></div>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead><tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="py-1.5">{t('pa.element')}</th><th className="py-1.5 px-2 text-right">{t('pa.base')}</th><th className="py-1.5 px-2 text-right">{t('pa.rate')}</th><th className="py-1.5 pl-2 text-right">{t('pa.amount')}</th></tr></thead>
          <tbody>
            <Line label={t('pa.baseSalary')} amount={staff.salaireBase ?? 0} />
            {primes > 0 && <Line label={t('pa.bonuses')} amount={primes} />}
            <tr className="border-b-2 border-slate-300 font-semibold"><td className="py-2">{t('pa.grossSalary')}</td><td /><td /><td className="py-2 pl-2 text-right">{fmtMoney(p.brut, dev)}</td></tr>
          </tbody>
        </table>

        <div className="mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('pa.socialContrib')}</div>
        <table className="mt-1 w-full text-sm">
          <tbody>
            {p.lignes.filter((l) => l.sal > 0).map((l) => (
              <Line key={l.id} label={l.nom} base={l.base} rate={`${+(l.sal * 100).toFixed(2)} %`} amount={l.montantSal} neg />
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('pa.taxes')}</div>
        <table className="mt-1 w-full text-sm">
          <tbody>
            <Line label={t('pa.taxableNet')} amount={p.netImposable} />
            <Line label="IR (impôt sur le revenu)" amount={p.ir} neg />
            <Line label="TRIMF" amount={p.trimf} neg />
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm">
          <span className="text-slate-500">{t('pa.totalDeductions')}</span>
          <span className="font-semibold text-amber-700">−{fmtMoney(p.totalRetenues, dev)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
          <span className="font-semibold text-emerald-800">{t('pa.netToPay')}</span>
          <span className="text-2xl font-bold text-emerald-700">{fmtMoney(p.netAPayer, dev)}</span>
        </div>

        <div className="mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('pa.employerSection')}</div>
        <table className="mt-1 w-full text-sm">
          <tbody>
            {p.lignes.filter((l) => l.pat > 0).map((l) => (
              <Line key={l.id} label={l.nom} base={l.base} rate={`${+(l.pat * 100).toFixed(2)} %`} amount={l.montantPat} />
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-2 text-sm">
          <span className="font-medium text-slate-600">{t('pa.totalEmployer')}</span>
          <span className="font-bold text-slate-800">{fmtMoney(p.coutTotalEmployeur, dev)}</span>
        </div>

        <div className="mt-10 flex justify-between text-center text-xs text-slate-500">
          <div className="w-48"><div className="h-14 border-b border-slate-300" /><div className="mt-1">{t('pa.signEmployee')}</div></div>
          <div className="w-48"><div className="h-14 border-b border-slate-300" /><div className="mt-1">{t('pa.signEmployer')}</div></div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">{t('pa.disclaimer')}</div>
      </div>
    </div>
  );
}
