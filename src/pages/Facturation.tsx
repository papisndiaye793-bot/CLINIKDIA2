import { useEffect, useMemo, useState } from 'react';
import { Receipt, Plus, Wallet, AlertCircle, CheckCircle2, CreditCard, Printer, X, Droplets, FileText } from 'lucide-react';
import QRCode from 'qrcode';
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
  StatCard,
  RowActions,
  ConfirmDialog,
  ActionButton,
} from '@/components/ui';
import { RapportListe } from '@/components/RapportListe';
import { useAuth } from '@/hooks/useAuth';
import { fmtDate, fmtMoney, montantEnLettres, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import type { Facture, PriseEnCharge, Patient, ClinicSettings } from '@/types';

export default function Facturation() {
  const { factures, patients, settings, addFacture, updateFacture, deleteFacture } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const editable = canWrite('facturation');
  const deletable = canDelete('facturation');
  const [open, setOpen] = useState(false);
  const [payFacture, setPayFacture] = useState<Facture | null>(null);
  const [viewTarget, setViewTarget] = useState<Facture | null>(null);
  const [editTarget, setEditTarget] = useState<Facture | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Facture | null>(null);
  const [filtre, setFiltre] = useState('');
  const [rapport, setRapport] = useState(false);

  const partDefaut: Record<PriseEnCharge, number> = { IPRES: 80, assurance_privee: 60, mutuelle: 50, cmu: 70, payant: 0 };
  const [form, setForm] = useState({ patientId: patients[0]?.id ?? '', nbSeances: 12, proforma: false });

  const filtered = useMemo(() => factures.filter((f) => !filtre || f.statut === filtre), [factures, filtre]);

  const aCharge = (f: Facture) => f.montantTotal * (1 - f.partAssurance / 100);
  // Les pro forma (devis) sont exclues des totaux comptables
  const reelles = factures.filter((f) => !f.proforma);
  const totalFacture = reelles.reduce((a, f) => a + f.montantTotal, 0);
  const totalEncaisse = reelles.reduce((a, f) => a + f.montantPaye, 0);
  const totalImpaye = reelles.reduce((a, f) => a + (aCharge(f) - f.montantPaye), 0);
  const totalAssurance = reelles.reduce((a, f) => a + f.montantTotal * (f.partAssurance / 100), 0);

  const submit = () => {
    const patient = patients.find((p) => p.id === form.patientId);
    if (!patient) return;
    const total = Number(form.nbSeances) * settings.tarifSeance;
    addFacture({
      patientId: form.patientId,
      date: todayISO(),
      lignes: [{ designation: `Séances d'hémodialyse (${form.nbSeances})`, quantite: Number(form.nbSeances), prixUnitaire: settings.tarifSeance }],
      montantTotal: total,
      montantPaye: 0,
      priseEnCharge: patient.priseEnCharge,
      partAssurance: partDefaut[patient.priseEnCharge],
      statut: 'emise',
      proforma: form.proforma,
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.facturation')}
        subtitle={t('fa.subtitle').replace('{n}', String(factures.length)).replace('{p}', fmtMoney(settings.tarifSeance, settings.devise))}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setRapport(true)}><FileText size={16} /> {t('common.downloadPdf')}</Button>
            {editable && <Button onClick={() => setOpen(true)}><Plus size={16} /> {t('fa.new')}</Button>}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('fa.ca')} value={fmtMoney(totalFacture, settings.devise)} icon={<Receipt size={18} />} tone="blue" />
        <StatCard label={t('fa.collected')} value={fmtMoney(totalEncaisse, settings.devise)} icon={<CheckCircle2 size={18} />} tone="green" />
        <StatCard label={t('fa.insurancePart')} value={fmtMoney(totalAssurance, settings.devise)} icon={<Wallet size={18} />} tone="purple" />
        <StatCard label={t('fa.toRecover')} value={fmtMoney(totalImpaye, settings.devise)} icon={<AlertCircle size={18} />} tone="amber" />
      </div>

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-auto">
            <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-full sm:w-56">
              <option value="">{t('cf.allStatuses')}</option>
              {Object.entries(L.statutFacture).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table className="min-w-[960px]">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>{t('pd.col.num')}</Th><Th>{t('cf.patient')}</Th><Th>{t('cf.date')}</Th><Th>{t('cf.total')}</Th><Th>{t('fa.coverage')}</Th><Th>{t('fa.toCharge')}</Th><Th>{t('cf.paid')}</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filtered.map((f) => {
              const patient = patients.find((p) => p.id === f.patientId);
              const fst = L.statutFacture[f.statut];
              const charge = aCharge(f);
              return (
                <tr key={f.id} className="hover:bg-slate-50">
                  <Td className="font-medium">
                    {f.numero}
                    {f.proforma && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">{t('fa.proforma')}</span>}
                  </Td>
                  <Td>{patient?.prenom} {patient?.nom}</Td>
                  <Td>{fmtDate(f.date)}</Td>
                  <Td>{fmtMoney(f.montantTotal, settings.devise)}</Td>
                  <Td><span className="text-xs">{L.priseEnChargeLabel[f.priseEnCharge]} ({f.partAssurance}%)</span></Td>
                  <Td>{fmtMoney(charge, settings.devise)}</Td>
                  <Td>{fmtMoney(f.montantPaye, settings.devise)}</Td>
                  <Td><Badge tone={fst.tone}>{fst.label}</Badge></Td>
                  <Td>
                    <RowActions
                      onView={() => setViewTarget(f)}
                      onEdit={editable ? () => setEditTarget(f) : undefined}
                      onDelete={deletable ? () => setDeleteTarget(f) : undefined}
                      extra={
                        editable && f.statut !== 'payee' ? (
                          <ActionButton tone="view" icon={<CreditCard size={15} />} label={t('fa.collect')} onClick={() => setPayFacture(f)} />
                        ) : undefined
                      }
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('fa.new')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {t('common.create')}</Button></>}
      >
        <div className="space-y-4">
          <Field label={t('cf.patient')}>
            <Select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom} — {L.priseEnChargeLabel[p.priseEnCharge]}</option>)}
            </Select>
          </Field>
          <Field label={t('fa.nbSessions')}><Input type="number" value={form.nbSeances} onChange={(e) => setForm({ ...form, nbSeances: Number(e.target.value) })} /></Field>
          <Field label={t('fa.docType')}>
            <Select value={form.proforma ? '1' : '0'} onChange={(e) => setForm({ ...form, proforma: e.target.value === '1' })}>
              <option value="0">{t('fa.docInvoice')}</option>
              <option value="1">{t('fa.docProforma')}</option>
            </Select>
          </Field>
          {form.proforma && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t('fa.proformaNote')}</p>}
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {t('cf.total')} : <span className="font-semibold text-slate-800">{fmtMoney(Number(form.nbSeances) * settings.tarifSeance, settings.devise)}</span>
          </div>
        </div>
      </Modal>

      {viewTarget && (
        <FactureApercu
          facture={viewTarget}
          patient={patients.find((p) => p.id === viewTarget.patientId)}
          settings={settings}
          aCharge={aCharge(viewTarget)}
          onClose={() => setViewTarget(null)}
        />
      )}

      {editTarget && (
        <EditFactureModal
          facture={editTarget}
          devise={settings.devise}
          tarif={settings.tarifSeance}
          onClose={() => setEditTarget(null)}
          onSave={(nbSeances, partAssurance) => {
            const total = nbSeances * settings.tarifSeance;
            updateFacture(editTarget.id, {
              partAssurance,
              montantTotal: total,
              lignes: [{ designation: `Séances d'hémodialyse (${nbSeances})`, quantite: nbSeances, prixUnitaire: settings.tarifSeance }],
            });
            setEditTarget(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('fa.deleteTitle')}
        message={<span className="font-semibold text-slate-700">{deleteTarget?.numero}</span>}
        onConfirm={() => deleteTarget && deleteFacture(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      {payFacture && (
        <PaiementModal
          facture={payFacture}
          aCharge={aCharge(payFacture)}
          devise={settings.devise}
          onClose={() => setPayFacture(null)}
          onSave={(montant) => {
            const nouveauPaye = payFacture.montantPaye + montant;
            const charge = aCharge(payFacture);
            updateFacture(payFacture.id, {
              montantPaye: nouveauPaye,
              statut: nouveauPaye >= charge ? 'payee' : nouveauPaye > 0 ? 'partielle' : payFacture.statut,
            });
            setPayFacture(null);
          }}
        />
      )}

      <RapportListe
        open={rapport}
        onClose={() => setRapport(false)}
        titre={t('fa.reportTitle')}
        settings={settings}
        rows={factures}
        dateOf={(f) => f.date}
        colonnes={[
          { header: t('pd.col.num'), text: (f) => `${f.numero}${f.proforma ? ' (Pro forma)' : ''}`, cell: (f) => <span className="font-medium">{f.numero}{f.proforma ? ' (Pro forma)' : ''}</span> },
          { header: t('cf.patient'), cell: (f) => { const p = patients.find((x) => x.id === f.patientId); return p ? `${p.prenom} ${p.nom}` : '—'; } },
          { header: t('cf.date'), cell: (f) => fmtDate(f.date) },
          { header: t('fa.coverage'), cell: (f) => `${L.priseEnChargeLabel[f.priseEnCharge]} (${f.partAssurance}%)` },
          { header: t('common.status'), cell: (f) => L.statutFacture[f.statut].label },
          { header: t('cf.total'), align: 'right', className: 'whitespace-nowrap', cell: (f) => fmtMoney(f.montantTotal, settings.devise) },
          { header: t('fa.toCharge'), align: 'right', className: 'whitespace-nowrap', cell: (f) => fmtMoney(aCharge(f), settings.devise) },
          { header: t('cf.paid'), align: 'right', className: 'font-medium whitespace-nowrap', cell: (f) => fmtMoney(f.montantPaye, settings.devise) },
        ]}
        synthese={(rows) => {
          const reel = rows.filter((f) => !f.proforma);
          const ca = reel.reduce((a, f) => a + f.montantTotal, 0);
          const enc = reel.reduce((a, f) => a + f.montantPaye, 0);
          const imp = reel.reduce((a, f) => a + (aCharge(f) - f.montantPaye), 0);
          return (
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">{t('fa.ca')}</dt><dd className="font-medium">{fmtMoney(ca, settings.devise)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('fa.collected')}</dt><dd className="font-medium">{fmtMoney(enc, settings.devise)}</dd></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold"><dt>{t('fa.toRecover')}</dt><dd>{fmtMoney(imp, settings.devise)}</dd></div>
            </dl>
          );
        }}
        syntheseRows={(rows) => {
          const reel = rows.filter((f) => !f.proforma);
          const ca = reel.reduce((a, f) => a + f.montantTotal, 0);
          const enc = reel.reduce((a, f) => a + f.montantPaye, 0);
          const imp = reel.reduce((a, f) => a + (aCharge(f) - f.montantPaye), 0);
          return [
            { label: t('fa.ca'), value: fmtMoney(ca, settings.devise) },
            { label: t('fa.collected'), value: fmtMoney(enc, settings.devise) },
            { label: t('fa.toRecover'), value: fmtMoney(imp, settings.devise) },
          ];
        }}
      />
    </div>
  );
}

function FactureApercu({
  facture,
  patient,
  settings,
  aCharge,
  onClose,
}: {
  facture: Facture;
  patient?: Patient;
  settings: ClinicSettings;
  aCharge: number;
  onClose: () => void;
}) {
  const { t } = useT();
  const L = useLabels();
  const reste = Math.max(0, aCharge - facture.montantPaye);
  const st = L.statutFacture[facture.statut];
  const partAssuranceMontant = facture.montantTotal * (facture.partAssurance / 100);

  // QR de vérification (récapitulatif de la facture)
  const [qr, setQr] = useState('');
  useEffect(() => {
    const payload = [
      settings.nom,
      `Facture ${facture.numero}`,
      patient ? `Patient: ${patient.prenom} ${patient.nom} (${patient.code})` : '',
      `Date: ${fmtDate(facture.date)}`,
      `Net a charge: ${fmtMoney(aCharge, settings.devise)}`,
      `Statut: ${st.label}`,
      settings.ninea ? `NINEA: ${settings.ninea}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    QRCode.toDataURL(payload, { width: 220, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [facture, patient, settings, aCharge, st.label]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-8">
      {/* Barre d'outils (non imprimée) */}
      <div className="no-print mb-4 flex flex-wrap w-full items-center justify-between gap-3">
        <h3 className="min-w-0 text-base font-semibold text-white">{t('fa.preview')} — {facture.numero}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => window.print()}><Printer size={16} /> {t('fa.print')}</Button>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Feuille A4 */}
      <div className="facture-sheet relative w-full max-w-[95vw] overflow-hidden rounded-lg bg-white text-slate-800 shadow-2xl sm:max-w-[820px]">
        {/* Filigrane pro forma */}
        {facture.proforma && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="-rotate-[24deg] select-none text-[84px] font-black uppercase tracking-[0.2em] text-amber-500/10">
              {t('fa.proforma')}
            </span>
          </div>
        )}

        {/* Bande d'en-tête */}
        <div className={'relative px-8 py-7 text-white sm:px-10 ' + (facture.proforma ? 'bg-amber-600' : 'bg-slate-900')}>
          <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-6">
            <div className="flex items-center gap-3.5">
              {settings.logoUrl ? (
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-1">
                  <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className={'flex h-14 w-14 items-center justify-center rounded-2xl text-white ring-1 ring-white/25 ' + (facture.proforma ? 'bg-amber-500' : 'bg-brand-600')}>
                  <Droplets size={28} />
                </div>
              )}
              <div>
                <div className="text-xl font-extrabold tracking-tight">{settings.nom}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-white/70">
                  {settings.adresse}<br />
                  Tél : {settings.telephone} · {settings.email}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[26px] font-black uppercase leading-none tracking-tight">
                {facture.proforma ? t('fa.proformaTitle') : t('fa.invoice')}
              </div>
              <div className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-bold tracking-wide ring-1 ring-white/25">
                {facture.numero}
              </div>
            </div>
          </div>
        </div>
        {/* Liseré dégradé */}
        <div className={'h-1.5 w-full ' + (facture.proforma ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600' : 'bg-gradient-to-r from-brand-400 via-brand-600 to-teal-500')} />

        <div className="relative px-8 py-7 sm:px-10">
          {/* Méta : date / statut / identifiants légaux */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs">
              <span className="font-semibold uppercase tracking-wide text-slate-400">{t('cf.date')}</span>
              <div className="mt-0.5 text-sm font-bold text-slate-800">{fmtDate(facture.date)}</div>
            </div>
            {settings.ninea && (
              <div className="text-xs">
                <span className="font-semibold uppercase tracking-wide text-slate-400">NINEA</span>
                <div className="mt-0.5 text-sm font-bold text-slate-800">{settings.ninea}</div>
              </div>
            )}
            {settings.registreCommerce && (
              <div className="text-xs">
                <span className="font-semibold uppercase tracking-wide text-slate-400">RC</span>
                <div className="mt-0.5 text-sm font-bold text-slate-800">{settings.registreCommerce}</div>
              </div>
            )}
            <div className="text-xs">
              <span className="font-semibold uppercase tracking-wide text-slate-400">{t('common.status')}</span>
              <div className="mt-0.5">
                {facture.proforma
                  ? <Badge tone="amber">{t('fa.proforma')}</Badge>
                  : <Badge tone={st.tone}>{st.label}</Badge>}
              </div>
            </div>
          </div>

          {/* Facturé à / Prise en charge */}
          <div className="mt-6 grid grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className={'mb-2 text-[11px] font-bold uppercase tracking-[0.14em] ' + (facture.proforma ? 'text-amber-600' : 'text-brand-700')}>{t('fa.billedTo')}</div>
              <div className="text-base font-bold text-slate-900">{patient ? `${patient.prenom} ${patient.nom}` : '—'}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500">
                {patient?.code}<br />
                {patient?.adresse}<br />
                {patient?.telephone}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
              <div className={'mb-2 text-[11px] font-bold uppercase tracking-[0.14em] ' + (facture.proforma ? 'text-amber-600' : 'text-brand-700')}>{t('fa.coverage')}</div>
              <div className="flex justify-between py-0.5"><span className="text-slate-500">{t('fa.coverage')}</span><span className="font-semibold text-slate-800">{L.priseEnChargeLabel[facture.priseEnCharge]}</span></div>
              <div className="flex justify-between py-0.5"><span className="text-slate-500">{t('fa.insurancePart')}</span><span className="font-semibold text-slate-800">{facture.partAssurance}%</span></div>
              {patient?.numAssurance && <div className="flex justify-between py-0.5"><span className="text-slate-500">{t('fa.insuredNo')}</span><span className="font-semibold text-slate-800">{patient.numAssurance}</span></div>}
            </div>
          </div>

          {/* Tableau des lignes */}
          <table className="mt-6 w-full text-sm">
            <thead>
              {/* Fond posé sur les th : une règle globale écrase le fond des tr d'en-tête */}
              <tr className="text-white">
                <th className="rounded-l-lg !bg-slate-900 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">{t('cf.designation')}</th>
                <th className="!bg-slate-900 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider">{t('cf.qty')}</th>
                <th className="!bg-slate-900 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">{t('cf.unitPrice')}</th>
                <th className="rounded-r-lg !bg-slate-900 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">{t('cf.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {facture.lignes.map((l, i) => (
                <tr key={i} className={'border-b border-slate-100 ' + (i % 2 === 1 ? 'bg-slate-50/70' : '')}>
                  <td className="px-4 py-3 font-medium text-slate-700">{l.designation}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-slate-600">{l.quantite}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{fmtMoney(l.prixUnitaire, settings.devise)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">{fmtMoney(l.quantite * l.prixUnitaire, settings.devise)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="mt-6 flex flex-col-reverse items-start justify-between gap-6 sm:flex-row">
            {/* Montant en lettres */}
            <div className={'w-full flex-1 rounded-xl border-l-4 bg-slate-50 px-4 py-3 text-sm ' + (facture.proforma ? 'border-amber-500' : 'border-brand-600')}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('fa.arrete')}</div>
              <div className="mt-1 font-semibold italic text-slate-700">{montantEnLettres(aCharge, t('fa.francsCFA'))}.</div>
            </div>
            <div className="w-full space-y-1.5 text-sm sm:w-80">
              <div className="flex justify-between px-1"><span className="text-slate-500">{t('cf.total')}</span><span className="font-semibold tabular-nums">{fmtMoney(facture.montantTotal, settings.devise)}</span></div>
              <div className="flex justify-between px-1"><span className="text-slate-500">{t('fa.insurancePart')} ({facture.partAssurance}%)</span><span className="font-medium tabular-nums text-slate-500">− {fmtMoney(partAssuranceMontant, settings.devise)}</span></div>
              <div className="flex justify-between px-1"><span className="text-slate-500">{t('fa.alreadyPaid')}</span><span className="font-semibold tabular-nums text-emerald-600">{fmtMoney(facture.montantPaye, settings.devise)}</span></div>
              <div className={'mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-white ' + (facture.proforma ? 'bg-amber-600' : 'bg-slate-900')}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">{t('fa.remaining')}</div>
                  <div className="text-[11px] text-white/60">{t('fa.net')} : {fmtMoney(aCharge, settings.devise)}</div>
                </div>
                <span className="text-xl font-black tabular-nums">{fmtMoney(reste, settings.devise)}</span>
              </div>
            </div>
          </div>

          {/* Pied : QR / mentions / signature */}
          <div className="mt-8 flex items-end justify-between gap-6 border-t border-slate-200 pt-5">
            <div className="flex items-end gap-4">
              {qr && (
                <div className="shrink-0 text-center">
                  <img src={qr} alt="QR" className="h-20 w-20 rounded-md ring-1 ring-slate-200" />
                  <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{t('fa.verification')}</div>
                </div>
              )}
              <div className="max-w-xs text-[11px] leading-relaxed text-slate-400">
                <span className="font-semibold text-slate-500">{t('fa.thanks')}</span><br />
                {settings.mentionsLegales || ''}
              </div>
            </div>
            <div className="shrink-0 text-center">
              <div className="text-xs text-slate-500">{t('fa.madeAt')} {fmtDate(todayISO())}</div>
              <div className="mt-2 flex h-20 w-48 items-end justify-center rounded-xl border border-dashed border-slate-300 pb-1.5 text-[11px] font-medium text-slate-400">
                {t('fa.signature')}
              </div>
            </div>
          </div>
        </div>

        {/* Bande de pied de page — épinglée en bas de la page à l'impression */}
        <div className={'print-footer px-8 py-2.5 text-center text-[10px] font-medium text-white/80 sm:px-10 ' + (facture.proforma ? 'bg-amber-600' : 'bg-slate-900')}>
          {settings.nom} — {settings.adresse} · {settings.telephone} · {settings.email}
        </div>
      </div>

      <div className="no-print h-8 shrink-0" />
    </div>
  );
}

function PaiementModal({ facture, aCharge, devise, onClose, onSave }: { facture: Facture; aCharge: number; devise: string; onClose: () => void; onSave: (montant: number) => void }) {
  const { t } = useT();
  const reste = aCharge - facture.montantPaye;
  const [montant, setMontant] = useState(reste);
  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('fa.collect')} — ${facture.numero}`}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => montant > 0 && onSave(Number(montant))}><CreditCard size={16} /> {t('fa.recordPayment')}</Button></>}
    >
      <div className="mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">{t('fa.toCharge')}</span><span className="font-medium">{fmtMoney(aCharge, devise)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">{t('fa.alreadyPaid')}</span><span className="font-medium">{fmtMoney(facture.montantPaye, devise)}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-500">{t('fa.remaining')}</span><span className="font-semibold text-brand-700">{fmtMoney(reste, devise)}</span></div>
      </div>
      <Field label={`${t('fa.amountReceived')} (${devise})`}><Input type="number" value={montant} onChange={(e) => setMontant(Number(e.target.value))} /></Field>
    </Modal>
  );
}

function EditFactureModal({ facture, devise, tarif, onClose, onSave }: { facture: Facture; devise: string; tarif: number; onClose: () => void; onSave: (nbSeances: number, partAssurance: number) => void }) {
  const { t } = useT();
  const [nbSeances, setNbSeances] = useState(facture.lignes[0]?.quantite ?? Math.round(facture.montantTotal / tarif));
  const [partAssurance, setPartAssurance] = useState(facture.partAssurance);
  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('fa.editTitle')} — ${facture.numero}`}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => onSave(Number(nbSeances), Number(partAssurance))}>{t('common.save')}</Button></>}
    >
      <div className="space-y-4">
        <Field label={t('fa.nbSessions')}><Input type="number" value={nbSeances} onChange={(e) => setNbSeances(Number(e.target.value))} /></Field>
        <Field label={t('fa.partPct')}><Input type="number" value={partAssurance} onChange={(e) => setPartAssurance(Number(e.target.value))} /></Field>
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {t('cf.total')} : <span className="font-semibold text-slate-800">{fmtMoney(Number(nbSeances) * tarif, devise)}</span>
          <br />
          {t('fa.toCharge')} : <span className="font-semibold text-slate-800">{fmtMoney(Number(nbSeances) * tarif * (1 - Number(partAssurance) / 100), devise)}</span>
        </div>
      </div>
    </Modal>
  );
}
