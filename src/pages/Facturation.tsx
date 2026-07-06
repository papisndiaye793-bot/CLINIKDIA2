import { useEffect, useMemo, useState } from 'react';
import { Receipt, Plus, Wallet, AlertCircle, CheckCircle2, CreditCard, Printer, X, Droplets } from 'lucide-react';
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

  const partDefaut: Record<PriseEnCharge, number> = { IPRES: 80, assurance_privee: 60, mutuelle: 50, cmu: 70, payant: 0 };
  const [form, setForm] = useState({ patientId: patients[0]?.id ?? '', nbSeances: 12 });

  const filtered = useMemo(() => factures.filter((f) => !filtre || f.statut === filtre), [factures, filtre]);

  const aCharge = (f: Facture) => f.montantTotal * (1 - f.partAssurance / 100);
  const totalFacture = factures.reduce((a, f) => a + f.montantTotal, 0);
  const totalEncaisse = factures.reduce((a, f) => a + f.montantPaye, 0);
  const totalImpaye = factures.reduce((a, f) => a + (aCharge(f) - f.montantPaye), 0);
  const totalAssurance = factures.reduce((a, f) => a + f.montantTotal * (f.partAssurance / 100), 0);

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
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.facturation')}
        subtitle={t('fa.subtitle').replace('{n}', String(factures.length)).replace('{p}', fmtMoney(settings.tarifSeance, settings.devise))}
        action={editable ? <Button onClick={() => setOpen(true)}><Plus size={16} /> {t('fa.new')}</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('fa.ca')} value={fmtMoney(totalFacture, settings.devise)} icon={<Receipt size={18} />} tone="blue" />
        <StatCard label={t('fa.collected')} value={fmtMoney(totalEncaisse, settings.devise)} icon={<CheckCircle2 size={18} />} tone="green" />
        <StatCard label={t('fa.insurancePart')} value={fmtMoney(totalAssurance, settings.devise)} icon={<Wallet size={18} />} tone="purple" />
        <StatCard label={t('fa.toRecover')} value={fmtMoney(totalImpaye, settings.devise)} icon={<AlertCircle size={18} />} tone="amber" />
      </div>

      <Card className="mb-4 p-3">
        <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-56">
          <option value="">{t('cf.allStatuses')}</option>
          {Object.entries(L.statutFacture).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </Card>

      <Card>
        <Table>
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
                  <Td className="font-medium">{f.numero}</Td>
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
      <div className="no-print mb-4 flex w-full max-w-[820px] items-center justify-between">
        <h3 className="text-base font-semibold text-white">{t('fa.preview')} — {facture.numero}</h3>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()}><Printer size={16} /> {t('fa.print')}</Button>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Feuille A4 */}
      <div className="facture-sheet w-full max-w-[820px] rounded-lg bg-white p-10 text-slate-800 shadow-2xl">
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
                {(settings.ninea || settings.registreCommerce) && (
                  <>
                    <br />
                    {settings.ninea && <>NINEA : {settings.ninea}</>}
                    {settings.ninea && settings.registreCommerce && ' · '}
                    {settings.registreCommerce && <>RC : {settings.registreCommerce}</>}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black uppercase tracking-tight text-brand-700">{t('fa.invoice')}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{facture.numero}</div>
            <div className="text-xs text-slate-500">{t('cf.date')} : {fmtDate(facture.date)}</div>
            <div className="mt-2 inline-flex"><Badge tone={st.tone}>{st.label}</Badge></div>
          </div>
        </div>

        {/* Émetteur / Client */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('fa.billedTo')}</div>
            <div className="text-sm font-semibold text-slate-800">{patient ? `${patient.prenom} ${patient.nom}` : '—'}</div>
            <div className="text-xs leading-relaxed text-slate-500">
              {patient?.code}<br />
              {patient?.adresse}<br />
              {patient?.telephone}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-0.5"><span className="text-slate-500">{t('fa.coverage')}</span><span className="font-medium">{L.priseEnChargeLabel[facture.priseEnCharge]}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-slate-500">{t('fa.insurancePart')}</span><span className="font-medium">{facture.partAssurance}%</span></div>
            {patient?.numAssurance && <div className="flex justify-between py-0.5"><span className="text-slate-500">{t('fa.insuredNo')}</span><span className="font-medium">{patient.numAssurance}</span></div>}
          </div>
        </div>

        {/* Tableau des lignes */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="rounded-l-md px-4 py-2.5 text-left font-semibold">{t('cf.designation')}</th>
              <th className="px-4 py-2.5 text-center font-semibold">{t('cf.qty')}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t('cf.unitPrice')}</th>
              <th className="rounded-r-md px-4 py-2.5 text-right font-semibold">{t('cf.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {facture.lignes.map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-700">{l.designation}</td>
                <td className="px-4 py-3 text-center text-slate-600">{l.quantite}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(l.prixUnitaire, settings.devise)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{fmtMoney(l.quantite * l.prixUnitaire, settings.devise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-5 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{t('cf.total')}</span><span className="font-medium">{fmtMoney(facture.montantTotal, settings.devise)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('fa.insurancePart')} ({facture.partAssurance}%)</span><span className="font-medium text-slate-500">− {fmtMoney(partAssuranceMontant, settings.devise)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base"><span className="font-semibold text-slate-700">{t('fa.net')}</span><span className="font-bold text-brand-700">{fmtMoney(aCharge, settings.devise)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('fa.alreadyPaid')}</span><span className="font-medium text-emerald-600">{fmtMoney(facture.montantPaye, settings.devise)}</span></div>
            <div className="flex justify-between rounded-md bg-slate-900 px-3 py-2 text-white"><span className="font-semibold">{t('fa.remaining')}</span><span className="font-bold">{fmtMoney(reste, settings.devise)}</span></div>
          </div>
        </div>

        {/* Montant en lettres */}
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">{t('fa.arrete')} </span>
          <span className="font-semibold text-slate-800">{montantEnLettres(aCharge, t('fa.francsCFA'))}.</span>
        </div>

        {/* Pied / signature */}
        <div className="mt-8 flex items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            {qr && (
              <div className="text-center">
                <img src={qr} alt="QR" className="h-24 w-24" />
                <div className="mt-1 text-[10px] text-slate-400">{t('fa.verification')}</div>
              </div>
            )}
            <div className="text-[11px] leading-relaxed text-slate-400">
              {t('fa.thanks')}<br />
              {settings.mentionsLegales || ''}
            </div>
          </div>
          <div className="shrink-0 text-center">
            <div className="text-xs text-slate-500">{t('fa.madeAt')} {fmtDate(todayISO())}</div>
            <div className="mt-10 w-48 border-t border-slate-300 pt-1 text-xs text-slate-500">{t('fa.signature')}</div>
          </div>
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
