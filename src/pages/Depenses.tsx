import { useMemo, useState } from 'react';
import { Wallet, TrendingDown, Clock, Plus } from 'lucide-react';
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
import { fmtDate, fmtMoney, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import type { Depense, CategorieDepense, StatutDepense } from '@/types';

const emptyForm = {
  date: todayISO(),
  categorie: 'consommables' as CategorieDepense,
  libelle: '',
  montant: 0,
  fournisseur: '',
  moyenPaiement: 'Virement',
  statut: 'en_attente' as StatutDepense,
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
  const [form, setForm] = useState({ ...emptyForm });
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => depenses.filter((d) => !filtre || d.categorie === filtre), [depenses, filtre]);
  const total = depenses.reduce((a, d) => a + d.montant, 0);
  const payees = depenses.filter((d) => d.statut === 'payee').reduce((a, d) => a + d.montant, 0);
  const enAttente = depenses.filter((d) => d.statut === 'en_attente').reduce((a, d) => a + d.montant, 0);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (d: Depense) => {
    setEditingId(d.id);
    setForm({ date: d.date, categorie: d.categorie, libelle: d.libelle, montant: d.montant, fournisseur: d.fournisseur, moyenPaiement: d.moyenPaiement, statut: d.statut });
    setOpen(true);
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
        action={editable ? <Button onClick={openCreate}><Plus size={16} /> {t('de.new')}</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('de.total')} value={fmtMoney(total, settings.devise)} icon={<TrendingDown size={18} />} tone="red" />
        <StatCard label={t('de.settled')} value={fmtMoney(payees, settings.devise)} icon={<Wallet size={18} />} tone="green" />
        <StatCard label={t('de.pending')} value={fmtMoney(enAttente, settings.devise)} icon={<Clock size={18} />} tone="amber" />
      </div>

      <Card className="mb-4 p-3">
        <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-56">
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
            <DefRow label={t('cf.amount')} value={fmtMoney(view.montant, settings.devise)} />
            <DefRow label={t('common.status')} value={<Badge tone={L.statutDepense[view.statut].tone}>{L.statutDepense[view.statut].label}</Badge>} />
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
    </div>
  );
}
