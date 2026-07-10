import { useState } from 'react';
import { Boxes, Plus, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Repeat } from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  PageHeader,
  Card,
  CardHeader,
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
  DefList,
  DefRow,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { fmtDate, fmtMoney, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import type { ArticleStock, CategorieStock, TypeMouvement } from '@/types';

const emptyArt = {
  designation: '',
  code: '',
  categorie: 'consommable' as CategorieStock,
  unite: 'unité',
  quantite: 0,
  seuilAlerte: 0,
  prixUnitaire: 0,
  fournisseur: '',
};

export default function Stock() {
  const { articlesStock, mouvementsStock, settings, addArticle, updateArticle, deleteArticle, addMouvement } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const editable = canWrite('stock');
  const deletable = canDelete('stock');
  const [openArt, setOpenArt] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<ArticleStock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArticleStock | null>(null);
  const [mvtArticle, setMvtArticle] = useState<ArticleStock | null>(null);
  const [filtre, setFiltre] = useState('');

  const [artForm, setArtForm] = useState({ ...emptyArt });
  const setA = (k: keyof typeof artForm, v: unknown) => setArtForm((f) => ({ ...f, [k]: v }));

  const filtered = articlesStock.filter((a) => !filtre || a.categorie === filtre);
  const alertes = articlesStock.filter((a) => a.quantite <= a.seuilAlerte);
  const valorisation = articlesStock.reduce((a, x) => a + x.quantite * x.prixUnitaire, 0);

  const openCreate = () => {
    setEditingId(null);
    setArtForm({ ...emptyArt });
    setOpenArt(true);
  };

  const openEdit = (a: ArticleStock) => {
    setEditingId(a.id);
    setArtForm({
      designation: a.designation,
      code: a.code,
      categorie: a.categorie,
      unite: a.unite,
      quantite: a.quantite,
      seuilAlerte: a.seuilAlerte,
      prixUnitaire: a.prixUnitaire,
      fournisseur: a.fournisseur,
    });
    setOpenArt(true);
  };

  const submitArt = () => {
    if (!artForm.designation) return;
    const payload = { ...artForm, quantite: Number(artForm.quantite), seuilAlerte: Number(artForm.seuilAlerte), prixUnitaire: Number(artForm.prixUnitaire) };
    if (editingId) {
      updateArticle(editingId, payload);
    } else {
      addArticle({ ...payload, code: artForm.code || `ART-${Date.now().toString().slice(-4)}` });
    }
    setArtForm({ ...emptyArt });
    setEditingId(null);
    setOpenArt(false);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.stock')}
        subtitle={t('st.subtitle').replace('{n}', String(articlesStock.length))}
        action={editable ? <Button onClick={openCreate}><Plus size={16} /> {t('st.new')}</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('st.refs')} value={articlesStock.length} icon={<Boxes size={18} />} tone="blue" />
        <StatCard label={t('st.alerts')} value={alertes.length} icon={<AlertTriangle size={18} />} tone={alertes.length ? 'red' : 'green'} />
        <StatCard label={t('st.value')} value={fmtMoney(valorisation, settings.devise)} icon={<TrendingUp size={18} />} tone="purple" />
      </div>

      {alertes.length > 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <AlertTriangle size={16} /> {t('st.alertBanner').replace('{n}', String(alertes.length))} {alertes.map((a) => a.designation).join(', ')}
          </div>
        </Card>
      )}

      <Card className="mb-4 p-3">
        <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-full sm:w-56">
          <option value="">{t('cf.allCategories')}</option>
          {Object.entries(L.categorieStock).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Card>

      <Card className="mb-5">
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr><Th>{t('cf.designation')}</Th><Th>{t('cf.category')}</Th><Th>{t('cf.stock')}</Th><Th>{t('cf.threshold')}</Th><Th>{t('cf.unitPrice')}</Th><Th>{t('cf.supplier')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const bas = a.quantite <= a.seuilAlerte;
              return (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="font-medium text-slate-800">{a.designation}</div>
                    <div className="text-xs text-slate-400">{a.code}</div>
                  </Td>
                  <Td>{L.categorieStock[a.categorie]}</Td>
                  <Td>
                    <span className={'font-semibold ' + (bas ? 'text-red-600' : 'text-slate-700')}>{a.quantite}</span>
                    <span className="text-xs text-slate-400"> {a.unite}</span>
                    {bas && <Badge tone="red">{t('st.low')}</Badge>}
                  </Td>
                  <Td>{a.seuilAlerte}</Td>
                  <Td>{fmtMoney(a.prixUnitaire, settings.devise)}</Td>
                  <Td className="text-slate-500">{a.fournisseur}</Td>
                  <Td>
                    <RowActions
                      onView={() => setViewTarget(a)}
                      onEdit={editable ? () => openEdit(a) : undefined}
                      onDelete={deletable ? () => setDeleteTarget(a) : undefined}
                      extra={editable ? <ActionButton tone="view" icon={<Repeat size={15} />} label={t('st.move')} onClick={() => setMvtArticle(a)} /> : undefined}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title={t('st.movements')} subtitle={`${mouvementsStock.length}`} />
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr><Th>{t('cf.designation')}</Th><Th>{t('cf.type')}</Th><Th>{t('cf.qty')}</Th><Th>{t('cf.date')}</Th><Th>{t('st.reason')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mouvementsStock.slice(0, 12).map((m) => {
              const art = articlesStock.find((a) => a.id === m.articleId);
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <Td className="font-medium">{art?.designation ?? '—'}</Td>
                  <Td>{m.type === 'entree' ? <Badge tone="green">{t('st.entry')}</Badge> : <Badge tone="amber">{t('st.exit')}</Badge>}</Td>
                  <Td>{m.type === 'entree' ? '+' : '−'}{m.quantite}</Td>
                  <Td>{fmtDate(m.date)}</Td>
                  <Td className="text-slate-500">{m.motif}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={openArt}
        onClose={() => setOpenArt(false)}
        title={editingId ? t('st.editTitle') : t('st.newTitle')}
        footer={<><Button variant="secondary" onClick={() => setOpenArt(false)}>{t('common.cancel')}</Button><Button onClick={submitArt}><Plus size={16} /> {editingId ? t('common.save') : t('common.create')}</Button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('cf.designation')} className="col-span-2"><Input value={artForm.designation} onChange={(e) => setA('designation', e.target.value)} /></Field>
          <Field label={t('cf.code')}><Input value={artForm.code} onChange={(e) => setA('code', e.target.value)} placeholder="Auto" /></Field>
          <Field label={t('cf.category')}>
            <Select value={artForm.categorie} onChange={(e) => setA('categorie', e.target.value)}>
              {Object.entries(L.categorieStock).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label={t('cf.unit')}><Input value={artForm.unite} onChange={(e) => setA('unite', e.target.value)} /></Field>
          <Field label={t('cf.supplier')}><Input value={artForm.fournisseur} onChange={(e) => setA('fournisseur', e.target.value)} /></Field>
          <Field label={t('st.initialQty')}><Input type="number" value={artForm.quantite} onChange={(e) => setA('quantite', e.target.value)} /></Field>
          <Field label={t('cf.threshold')}><Input type="number" value={artForm.seuilAlerte} onChange={(e) => setA('seuilAlerte', e.target.value)} /></Field>
          <Field label={`${t('cf.unitPrice')} (${settings.devise})`} className="col-span-2"><Input type="number" value={artForm.prixUnitaire} onChange={(e) => setA('prixUnitaire', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title={t('st.detailTitle')}>
        {viewTarget && (
          <DefList>
            <DefRow label={t('cf.designation')} value={viewTarget.designation} />
            <DefRow label={t('cf.code')} value={viewTarget.code} />
            <DefRow label={t('cf.category')} value={L.categorieStock[viewTarget.categorie]} />
            <DefRow label={t('st.current')} value={`${viewTarget.quantite} ${viewTarget.unite}`} />
            <DefRow label={t('cf.threshold')} value={viewTarget.seuilAlerte} />
            <DefRow label={t('cf.unitPrice')} value={fmtMoney(viewTarget.prixUnitaire, settings.devise)} />
            <DefRow label={t('st.valueInStock')} value={fmtMoney(viewTarget.quantite * viewTarget.prixUnitaire, settings.devise)} />
            <DefRow label={t('cf.supplier')} value={viewTarget.fournisseur} />
          </DefList>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('st.deleteTitle')}
        message={<span className="font-semibold text-slate-700">{deleteTarget?.designation}</span>}
        onConfirm={() => deleteTarget && deleteArticle(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      {mvtArticle && <MouvementModal article={mvtArticle} onClose={() => setMvtArticle(null)} onSave={(type, quantite, motif) => { addMouvement({ articleId: mvtArticle.id, type, quantite, motif, date: todayISO() }); setMvtArticle(null); }} />}
    </div>
  );
}

function MouvementModal({ article, onClose, onSave }: { article: ArticleStock; onClose: () => void; onSave: (type: TypeMouvement, q: number, motif: string) => void }) {
  const { t } = useT();
  const [type, setType] = useState<TypeMouvement>('entree');
  const [quantite, setQuantite] = useState(0);
  const [motif, setMotif] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('st.moveTitle')} — ${article.designation}`}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => quantite > 0 && onSave(type, Number(quantite), motif || (type === 'entree' ? 'Réapprovisionnement' : 'Consommation'))}>{t('common.save')}</Button></>}
    >
      <p className="mb-4 text-sm text-slate-500">{t('st.current')} : <span className="font-semibold text-slate-700">{article.quantite} {article.unite}</span></p>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setType('entree')} className={'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ' + (type === 'entree' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500')}><ArrowDownToLine size={16} /> {t('st.entry')}</button>
          <button onClick={() => setType('sortie')} className={'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ' + (type === 'sortie' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500')}><ArrowUpFromLine size={16} /> {t('st.exit')}</button>
        </div>
        <Field label={t('cf.qty')}><Input type="number" value={quantite} onChange={(e) => setQuantite(Number(e.target.value))} /></Field>
        <Field label={t('st.reason')}><Input value={motif} onChange={(e) => setMotif(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
