import { useMemo, useState } from 'react';
import { Wallet, TrendingDown, Clock, Plus, Paperclip, Upload, Trash2, Landmark, FileCheck2, HandCoins, X, Download, FileText, Printer } from 'lucide-react';
import { RapportListe } from '@/components/RapportListe';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
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
  DefList,
  DefRow,
} from '@/components/ui';
import { fmtDate, fmtMoney, todayISO, fmtFileSize, readFileAsDataURL } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import type { Depense, CategorieDepense, StatutDepense } from '@/types';

const MAX_JUSTIF_BYTES = 3 * 1024 * 1024; // 3 Mo

const emptyForm = {
  date: todayISO(),
  categorie: 'consommables' as CategorieDepense,
  libelle: '',
  montant: 0,
  fournisseur: '',
  moyenPaiement: 'Virement',
  statut: 'en_attente' as StatutDepense,
  banque: '',
  referenceVirement: '',
  numeroCheque: '',
  recuPar: '',
  justificatif: undefined as Depense['justificatif'],
};

export default function Depenses() {
  const { depenses, settings, addDepense, updateDepense, deleteDepense, logAction } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const editable = canWrite('depenses');
  const deletable = canDelete('depenses');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<Depense | null>(null);
  const [del, setDel] = useState<Depense | null>(null);
  const [filtre, setFiltre] = useState('');
  const [rapport, setRapport] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => depenses.filter((d) => !filtre || d.categorie === filtre), [depenses, filtre]);
  const total = depenses.reduce((a, d) => a + d.montant, 0);
  const payees = depenses.filter((d) => d.statut === 'payee').reduce((a, d) => a + d.montant, 0);
  const enAttente = depenses.filter((d) => d.statut === 'en_attente').reduce((a, d) => a + d.montant, 0);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (d: Depense) => {
    setEditingId(d.id);
    setForm({
      date: d.date, categorie: d.categorie, libelle: d.libelle, montant: d.montant,
      fournisseur: d.fournisseur, moyenPaiement: d.moyenPaiement, statut: d.statut,
      banque: d.banque ?? '', referenceVirement: d.referenceVirement ?? '',
      numeroCheque: d.numeroCheque ?? '', recuPar: d.recuPar ?? '',
      justificatif: d.justificatif,
    });
    setOpen(true);
  };

  const [fileError, setFileError] = useState('');
  const onJustificatif = async (file?: File | null) => {
    setFileError('');
    if (!file) return;
    if (file.size > MAX_JUSTIF_BYTES) { setFileError(t('de.fileTooBig').replace('{s}', fmtFileSize(MAX_JUSTIF_BYTES))); return; }
    const dataUrl = await readFileAsDataURL(file);
    set('justificatif', { nom: file.name, mime: file.type, taille: file.size, dataUrl });
  };

  const submit = () => {
    if (!form.libelle) return;
    const payload = { ...form, montant: Number(form.montant) };
    if (editingId) {
      updateDepense(editingId, payload);
      logAction('update', 'depenses', `Dépense modifiée : ${form.libelle}`);
    } else {
      addDepense(payload);
      logAction('create', 'depenses', `Dépense enregistrée : ${form.libelle} (${fmtMoney(payload.montant, settings.devise)})`);
    }
    setOpen(false);
    setEditingId(null);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.depenses')}
        subtitle={t('de.subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setRapport(true)}><Printer size={16} /> {t('common.printList')}</Button>
            {editable && <Button onClick={openCreate}><Plus size={16} /> {t('de.new')}</Button>}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('de.total')} value={fmtMoney(total, settings.devise)} icon={<TrendingDown size={18} />} tone="red" />
        <StatCard label={t('de.settled')} value={fmtMoney(payees, settings.devise)} icon={<Wallet size={18} />} tone="green" />
        <StatCard label={t('de.pending')} value={fmtMoney(enAttente, settings.devise)} icon={<Clock size={18} />} tone="amber" />
      </div>

      <Card className="mb-4 p-3">
        <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-full sm:w-56">
          <option value="">{t('cf.allCategories')}</option>
          {Object.entries(L.categorieDepenseLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Card>

      <Card>
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr><Th>{t('cf.reference')}</Th><Th>{t('cf.date')}</Th><Th>{t('cf.label')}</Th><Th>{t('cf.category')}</Th><Th>{t('cf.supplier')}</Th><Th>{t('cf.amount')}</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => {
              const st = L.statutDepense[d.statut];
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td className="font-medium">{d.code}</Td>
                  <Td>{fmtDate(d.date)}</Td>
                  <Td className="max-w-xs whitespace-normal text-slate-600">{d.libelle}</Td>
                  <Td>{L.categorieDepenseLabel[d.categorie]}</Td>
                  <Td className="text-slate-500">{d.fournisseur}</Td>
                  <Td className="font-medium">{fmtMoney(d.montant, settings.devise)}</Td>
                  <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                  <Td>
                    <RowActions
                      onView={() => setView(d)}
                      onEdit={editable ? () => openEdit(d) : undefined}
                      onDelete={deletable ? () => setDel(d) : undefined}
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
        title={editingId ? t('de.editTitle') : t('de.newTitle')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {t('common.save')}</Button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('cf.label')} className="col-span-2"><Input value={form.libelle} onChange={(e) => set('libelle', e.target.value)} /></Field>
          <Field label={t('cf.category')}>
            <Select value={form.categorie} onChange={(e) => set('categorie', e.target.value)}>
              {Object.entries(L.categorieDepenseLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label={t('cf.date')}><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label={t('cf.supplier')}><Input value={form.fournisseur} onChange={(e) => set('fournisseur', e.target.value)} /></Field>
          <Field label={t('cf.paymentMethod')}>
            <Select value={form.moyenPaiement} onChange={(e) => set('moyenPaiement', e.target.value)}>
              {['Virement', 'Chèque', 'Espèces', 'Prélèvement', 'Mobile Money'].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label={`${t('cf.amount')} (${settings.devise})`}><Input type="number" value={form.montant} onChange={(e) => set('montant', e.target.value)} /></Field>
          <Field label={t('common.status')}>
            <Select value={form.statut} onChange={(e) => set('statut', e.target.value)}>
              {Object.entries(L.statutDepense).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>

          {/* Détails selon le moyen de paiement */}
          {form.moyenPaiement === 'Virement' && (
            <div className="col-span-2 grid grid-cols-2 gap-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
              <div className="col-span-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-brand-700"><Landmark size={14} /> {t('de.transferInfo')}</div>
              <Field label={t('de.bank')}><Input value={form.banque} onChange={(e) => set('banque', e.target.value)} placeholder="CBAO, SGBS…" /></Field>
              <Field label={t('de.transferRef')}><Input value={form.referenceVirement} onChange={(e) => set('referenceVirement', e.target.value)} placeholder="Réf. / IBAN" /></Field>
            </div>
          )}
          {form.moyenPaiement === 'Chèque' && (
            <div className="col-span-2 grid grid-cols-2 gap-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <div className="col-span-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-teal-700"><FileCheck2 size={14} /> {t('de.chequeInfo')}</div>
              <Field label={t('de.bank')}><Input value={form.banque} onChange={(e) => set('banque', e.target.value)} placeholder="CBAO, SGBS…" /></Field>
              <Field label={t('de.chequeNo')}><Input value={form.numeroCheque} onChange={(e) => set('numeroCheque', e.target.value)} placeholder="N° 0001234" /></Field>
            </div>
          )}
          {form.moyenPaiement === 'Espèces' && (
            <div className="col-span-2 grid grid-cols-1 gap-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-amber-700"><HandCoins size={14} /> {t('de.cashInfo')}</div>
              <Field label={t('de.receivedBy')}><Input value={form.recuPar} onChange={(e) => set('recuPar', e.target.value)} placeholder={t('de.receivedByPh')} /></Field>
            </div>
          )}

          {/* Justificatif (upload) */}
          <div className="col-span-2">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">{t('de.attachment')}</span>
            {form.justificatif ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                  <Paperclip size={15} className="shrink-0 text-brand-500" />
                  <span className="truncate font-medium">{form.justificatif.nom}</span>
                  {form.justificatif.taille ? <span className="shrink-0 text-xs text-slate-400">· {fmtFileSize(form.justificatif.taille)}</span> : null}
                </span>
                <button type="button" onClick={() => set('justificatif', undefined)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3.5 py-3 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600">
                <Upload size={16} /> {t('de.uploadFile')}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onJustificatif(e.target.files?.[0])} />
              </label>
            )}
            {fileError && <p className="mt-1.5 text-xs font-medium text-red-600">{fileError}</p>}
          </div>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={`${t('nav.depenses')} ${view?.code ?? ''}`}>
        {view && (
          <DefList>
            <DefRow label={t('cf.label')} value={view.libelle} />
            <DefRow label={t('cf.category')} value={L.categorieDepenseLabel[view.categorie]} />
            <DefRow label={t('cf.date')} value={fmtDate(view.date)} />
            <DefRow label={t('cf.supplier')} value={view.fournisseur} />
            <DefRow label={t('cf.paymentMethod')} value={view.moyenPaiement} />
            {view.banque && <DefRow label={t('de.bank')} value={view.banque} />}
            {view.referenceVirement && <DefRow label={t('de.transferRef')} value={view.referenceVirement} />}
            {view.numeroCheque && <DefRow label={t('de.chequeNo')} value={view.numeroCheque} />}
            {view.recuPar && <DefRow label={t('de.receivedBy')} value={view.recuPar} />}
            <DefRow label={t('cf.amount')} value={fmtMoney(view.montant, settings.devise)} />
            <DefRow label={t('common.status')} value={<Badge tone={L.statutDepense[view.statut].tone}>{L.statutDepense[view.statut].label}</Badge>} />
            {view.justificatif && (
              <DefRow
                label={t('de.attachment')}
                value={
                  <a href={view.justificatif.dataUrl} download={view.justificatif.nom} className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline">
                    <Download size={14} /> {view.justificatif.nom}
                  </a>
                }
              />
            )}
          </DefList>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title={t('de.deleteTitle')}
        message={<span className="font-semibold text-slate-700">{del?.code}</span>}
        onConfirm={() => { if (del) { deleteDepense(del.id); logAction('delete', 'depenses', `Dépense supprimée : ${del.libelle}`); } }}
        onClose={() => setDel(null)}
      />

      <RapportListe
        open={rapport}
        onClose={() => setRapport(false)}
        titre={t('de.reportTitle')}
        settings={settings}
        rows={depenses}
        dateOf={(d) => d.date}
        colonnes={[
          { header: t('cf.reference'), cell: (d) => d.code },
          { header: t('cf.date'), cell: (d) => fmtDate(d.date) },
          { header: t('cf.label'), cell: (d) => d.libelle },
          { header: t('cf.category'), cell: (d) => L.categorieDepenseLabel[d.categorie] },
          { header: t('cf.supplier'), cell: (d) => d.fournisseur },
          { header: t('cf.paymentMethod'), cell: (d) => d.moyenPaiement },
          { header: t('common.status'), cell: (d) => L.statutDepense[d.statut].label },
          { header: t('cf.amount'), align: 'right', className: 'font-medium whitespace-nowrap', cell: (d) => fmtMoney(d.montant, settings.devise) },
        ]}
        synthese={(rows) => {
          const tot = rows.reduce((a, d) => a + d.montant, 0);
          const pay = rows.filter((d) => d.statut === 'payee').reduce((a, d) => a + d.montant, 0);
          const att = rows.filter((d) => d.statut === 'en_attente').reduce((a, d) => a + d.montant, 0);
          return (
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">{t('de.settled')}</dt><dd className="font-medium">{fmtMoney(pay, settings.devise)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('de.pending')}</dt><dd className="font-medium">{fmtMoney(att, settings.devise)}</dd></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold"><dt>{t('de.total')}</dt><dd>{fmtMoney(tot, settings.devise)}</dd></div>
            </dl>
          );
        }}
        syntheseRows={(rows) => {
          const tot = rows.reduce((a, d) => a + d.montant, 0);
          const pay = rows.filter((d) => d.statut === 'payee').reduce((a, d) => a + d.montant, 0);
          const att = rows.filter((d) => d.statut === 'en_attente').reduce((a, d) => a + d.montant, 0);
          return [
            { label: t('de.settled'), value: fmtMoney(pay, settings.devise) },
            { label: t('de.pending'), value: fmtMoney(att, settings.devise) },
            { label: t('de.total'), value: fmtMoney(tot, settings.devise) },
          ];
        }}
      />
    </div>
  );
}
