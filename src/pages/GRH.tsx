import { useMemo, useRef, useState } from 'react';
import { Wallet, Users2, FileText, CalendarClock, Plus, FileUp, Trash2, Phone, Eye, Pencil, Download, X, Image as ImageIcon, Printer } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
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
  DefList,
  DefRow,
  ConfirmDialog,
  EmptyState,
} from '@/components/ui';
import { downloadDocumentPDF, fmtDate, fmtFileSize, fmtMoney, initials, readFileAsDataURL, slugify, todayISO } from '@/lib/utils';
import { roleLabel, typeContratLabel } from '@/lib/labels';
import { DocumentBuilder } from '@/components/DocumentBuilder';
import { RapportListe } from '@/components/RapportListe';
import { DOC_MODELES, signaturesFor } from '@/lib/hrDocuments';
import type { DocumentRH, Staff, TypeContrat, StaffDocument } from '@/types';

const DOC_TYPES = ['Contrat de travail', 'CNI / Pièce d\'identité', 'Diplôme', 'Visite médicale', 'Attestation', 'CV', 'Autre'];
const MAX_DOC_BYTES = 3 * 1024 * 1024; // 3 Mo

const uid = () => Math.random().toString(36).slice(2, 9);

export default function GRH() {
  const { staff, settings, documentsRH, updateStaff, deleteDocumentRH, logAction } = useStore();
  const { canWrite } = useAuth();
  const editable = canWrite('grh');

  const [view, setView] = useState<Staff | null>(null);
  const [edit, setEdit] = useState<Staff | null>(null);
  const [preview, setPreview] = useState<StaffDocument | null>(null);
  const [docBuilder, setDocBuilder] = useState<{ open: boolean; staffId?: string }>({ open: false });
  const [delDoc, setDelDoc] = useState<DocumentRH | null>(null);
  const [histOpen, setHistOpen] = useState(false);

  const reDownload = (d: DocumentRH) => {
    const modele = DOC_MODELES.find((m) => m.id === d.modeleId);
    const s = staff.find((x) => x.id === d.staffId);
    // Régénère le corps avec les infos établissement à jour, sauf si le texte a
    // été modifié à la main (on conserve alors la version figée).
    const corps = modele && s && d.values && !d.edited
      ? modele.build({ s, c: settings, v: d.values, today: d.date })
      : d.corps;
    downloadDocumentPDF(`${slugify(d.titre)}-${slugify(d.staffNom)}`, {
      settings,
      titre: d.titre,
      corps,
      signatures: signaturesFor(d.modeleId),
      reference: modele?.description,
    });
  };

  const masseSalariale = staff.filter((s) => s.actif).reduce((a, s) => a + (s.salaireBase ?? 0), 0);
  const cdi = staff.filter((s) => s.typeContrat === 'CDI').length;
  const echeances = staff.filter((s) => s.dateFinContrat && s.dateFinContrat >= todayISO()).length;

  return (
    <div>
      <PageHeader
        title="GRH — Ressources humaines"
        subtitle="Contrats, paie et dossiers du personnel"
        action={editable ? <Button onClick={() => setDocBuilder({ open: true })}><FileText size={16} /> Établir un document</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Effectif actif" value={staff.filter((s) => s.actif).length} icon={<Users2 size={18} />} tone="blue" hint={`${staff.length} au total`} />
        <StatCard label="Masse salariale / mois" value={fmtMoney(masseSalariale, settings.devise)} icon={<Wallet size={18} />} tone="purple" />
        <StatCard label="Contrats CDI" value={cdi} icon={<FileText size={18} />} tone="green" />
        <StatCard label="CDD / contrats à terme" value={echeances} icon={<CalendarClock size={18} />} tone="amber" />
      </div>

      <Card>
        <CardHeader title="Dossiers du personnel" subtitle={`${staff.length} employés`} />
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr>
              <Th>Employé</Th><Th>Fonction</Th><Th>Contrat</Th><Th>Embauche</Th><Th>Échéance</Th><Th>Salaire de base</Th><Th>Documents</Th><Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => {
              const r = roleLabel[s.role];
              const c = s.typeContrat ? typeContratLabel[s.typeContrat] : null;
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
                  <Td><Badge tone={r.tone}>{r.label}</Badge></Td>
                  <Td>{c ? <Badge tone={c.tone}>{c.label}</Badge> : '—'}</Td>
                  <Td>{fmtDate(s.dateEmbauche)}</Td>
                  <Td>{s.dateFinContrat ? fmtDate(s.dateFinContrat) : '—'}</Td>
                  <Td className="font-medium">{s.salaireBase ? fmtMoney(s.salaireBase, settings.devise) : '—'}</Td>
                  <Td><span className="inline-flex items-center gap-1 text-xs text-slate-500"><FileText size={13} /> {s.documents?.length ?? 0}</span></Td>
                  <Td>
                    <RowActions
                      onView={() => setView(s)}
                      onEdit={editable ? () => setEdit(s) : undefined}
                      extra={editable ? (
                        <button
                          title="Établir un document"
                          onClick={() => setDocBuilder({ open: true, staffId: s.id })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                        >
                          <FileText size={15} />
                        </button>
                      ) : undefined}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {/* Registre des documents établis */}
      <Card className="mt-6">
        <CardHeader
          title="Documents établis"
          subtitle={`${documentsRH.length} document(s) généré(s)`}
          action={
            <div className="flex items-center gap-2">
              {documentsRH.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => setHistOpen(true)}><Printer size={16} /> Historique</Button>
              )}
              {editable && <Button size="sm" variant="secondary" onClick={() => setDocBuilder({ open: true })}><FileText size={16} /> Nouveau document</Button>}
            </div>
          }
        />
        {documentsRH.length === 0 ? (
          <EmptyState icon={<FileText size={22} />} title="Aucun document établi" hint="Utilisez « Établir un document » pour générer contrats, attestations et certificats." />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>Date</Th><Th>Employé</Th><Th>Type de document</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documentsRH.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td className="whitespace-nowrap text-slate-500">{fmtDate(d.date)}</Td>
                  <Td>
                    <div className="font-medium text-slate-800">{d.staffNom}</div>
                    {d.staffCode && <div className="text-xs text-slate-400">{d.staffCode}</div>}
                  </Td>
                  <Td><Badge tone="blue">{d.titre}</Badge></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Télécharger en PDF" tone="view" onClick={() => reDownload(d)}><Download size={15} /></IconBtn>
                      {editable && <IconBtn title="Supprimer du registre" tone="delete" onClick={() => setDelDoc(d)}><Trash2 size={15} /></IconBtn>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!delDoc}
        title="Supprimer le document du registre"
        message={<span className="font-semibold text-slate-700">{delDoc?.titre} — {delDoc?.staffNom}</span>}
        onConfirm={() => { if (delDoc) { deleteDocumentRH(delDoc.id); logAction('delete', 'grh', `Document supprimé : ${delDoc.titre} — ${delDoc.staffNom}`); } }}
        onClose={() => setDelDoc(null)}
      />

      {/* Fiche RH */}
      <Modal open={!!view} onClose={() => setView(null)} title="Dossier RH" size="xl">
        {view && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">{initials(view.nom, view.prenom)}</span>
                <div>
                  <div className="text-lg font-semibold text-slate-800">{view.role === 'nephrologue' ? 'Dr ' : ''}{view.prenom} {view.nom}</div>
                  <div className="text-sm text-slate-400">{view.code} · {roleLabel[view.role].label}</div>
                </div>
              </div>
              <DefList>
                <DefRow label="Date de naissance" value={fmtDate(view.dateNaissance)} />
                <DefRow label="Adresse" value={view.adresse || '—'} />
                <DefRow label="Téléphone" value={view.telephone} />
                <DefRow label="Email" value={view.email} />
                <DefRow label="Date d'embauche" value={fmtDate(view.dateEmbauche)} />
                <DefRow label="Type de contrat" value={view.typeContrat ? typeContratLabel[view.typeContrat].label : '—'} />
                <DefRow label="Catégorie" value={<Badge tone={view.cadre ? 'purple' : 'slate'}>{view.cadre ? 'Cadre' : 'Non-cadre'}</Badge>} />
                <DefRow label="Fin de contrat" value={view.dateFinContrat ? fmtDate(view.dateFinContrat) : '—'} />
                <DefRow label="Salaire de base" value={view.salaireBase ? fmtMoney(view.salaireBase, settings.devise) : '—'} />
              </DefList>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-semibold text-slate-700">Contacts d'urgence</div>
                <div className="space-y-2">
                  {(view.contactsUrgence ?? []).length === 0 && <p className="text-sm text-slate-400">Aucun contact renseigné.</p>}
                  {(view.contactsUrgence ?? []).map((c, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-700">{c.nom} <span className="font-normal text-slate-400">· {c.lien}</span></div>
                      <div className="inline-flex items-center gap-1 text-xs text-slate-500"><Phone size={12} /> {c.telephone}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-slate-700">Documents ({(view.documents ?? []).length})</div>
                <div className="space-y-2">
                  {(view.documents ?? []).length === 0 && <p className="text-sm text-slate-400">Aucun document.</p>}
                  {(view.documents ?? []).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setPreview(d)}
                      title="Aperçu du document"
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 text-slate-700">
                        <DocIcon mime={d.mime} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{d.type}</span>
                          <span className="block truncate text-xs text-slate-400">{d.nom}{d.taille ? ` · ${fmtFileSize(d.taille)}` : ''}</span>
                        </span>
                      </span>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                        <Eye size={15} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Édition RH + documents */}
      {edit && (
        <EditHrModal
          staff={edit}
          devise={settings.devise}
          onPreview={setPreview}
          onClose={() => setEdit(null)}
          onSave={(data) => {
            updateStaff(edit.id, data);
            logAction('update', 'grh', `Dossier RH mis à jour : ${edit.prenom} ${edit.nom}`);
            setEdit(null);
          }}
        />
      )}

      {/* Aperçu de document */}
      {preview && <DocPreview doc={preview} onClose={() => setPreview(null)} />}

      {/* Établissement de documents administratifs */}
      <DocumentBuilder
        open={docBuilder.open}
        initialStaffId={docBuilder.staffId}
        onClose={() => setDocBuilder({ open: false })}
      />

      {/* Historique imprimable des documents établis */}
      <RapportListe
        open={histOpen}
        onClose={() => setHistOpen(false)}
        titre="Historique des documents établis"
        settings={settings}
        rows={documentsRH}
        dateOf={(d) => d.date}
        colonnes={[
          { header: 'Date', cell: (d) => fmtDate(d.date), text: (d) => fmtDate(d.date) },
          { header: 'Employé', cell: (d) => d.staffNom },
          { header: 'Matricule', cell: (d) => d.staffCode ?? '—' },
          { header: 'Type de document', cell: (d) => d.titre },
        ]}
      />
    </div>
  );
}

function DocIcon({ mime }: { mime?: string }) {
  if (mime?.startsWith('image/')) return <ImageIcon size={15} className="shrink-0 text-teal-500" />;
  return <FileText size={15} className="shrink-0 text-brand-500" />;
}

function DocPreview({ doc, onClose }: { doc: StaffDocument; onClose: () => void }) {
  const isImage = doc.mime?.startsWith('image/');
  const isPdf = doc.mime === 'application/pdf';
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="no-print mb-3 flex items-center justify-between">
        <div className="min-w-0 text-white">
          <div className="truncate text-sm font-semibold">{doc.type}</div>
          <div className="truncate text-xs text-white/60">{doc.nom}{doc.taille ? ` · ${fmtFileSize(doc.taille)}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          {doc.dataUrl && (
            <a href={doc.dataUrl} download={doc.nom} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/25">
              <Download size={15} /> Télécharger
            </a>
          )}
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"><X size={18} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-white">
        {!doc.dataUrl ? (
          <div className="p-10 text-center text-slate-400">Aucun fichier joint à ce document.</div>
        ) : isImage ? (
          <img src={doc.dataUrl} alt={doc.nom} className="max-h-full max-w-full object-contain" />
        ) : isPdf ? (
          <iframe src={doc.dataUrl} title={doc.nom} className="h-full w-full rounded-xl" />
        ) : (
          <div className="p-10 text-center">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">Aperçu non disponible pour ce format.</p>
            <a href={doc.dataUrl} download={doc.nom} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
              <Download size={15} /> Télécharger le fichier
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function EditHrModal({ staff, devise, onClose, onSave, onPreview }: { staff: Staff; devise: string; onClose: () => void; onSave: (data: Partial<Staff>) => void; onPreview: (d: StaffDocument) => void }) {
  const [f, setF] = useState({
    adresse: staff.adresse ?? '',
    dateNaissance: staff.dateNaissance ?? '',
    dateEmbauche: staff.dateEmbauche ?? '',
    typeContrat: (staff.typeContrat ?? 'CDI') as TypeContrat,
    dateFinContrat: staff.dateFinContrat ?? '',
    salaireBase: staff.salaireBase ?? 0,
  });
  const [docs, setDocs] = useState<StaffDocument[]>(staff.documents ?? []);
  const [newType, setNewType] = useState(DOC_TYPES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const onAddFile = async (file?: File | null) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) { setError(`Fichier trop volumineux (max ${fmtFileSize(MAX_DOC_BYTES)}).`); return; }
    const dataUrl = await readFileAsDataURL(file);
    setDocs((d) => [...d, { id: uid(), type: newType, nom: file.name, dateAjout: todayISO(), mime: file.type, taille: file.size, dataUrl }]);
    if (addInputRef.current) addInputRef.current.value = '';
  };

  const onReplaceFile = async (id: string, file?: File | null) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) { setError(`Fichier trop volumineux (max ${fmtFileSize(MAX_DOC_BYTES)}).`); return; }
    const dataUrl = await readFileAsDataURL(file);
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, nom: file.name, mime: file.type, taille: file.size, dataUrl, dateAjout: todayISO() } : x)));
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Dossier RH — ${staff.prenom} ${staff.nom}`}
      size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button onClick={() => onSave({ ...f, salaireBase: Number(f.salaireBase), dateFinContrat: f.dateFinContrat || undefined, documents: docs })}>Enregistrer</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date de naissance"><Input type="date" value={f.dateNaissance} onChange={(e) => set('dateNaissance', e.target.value)} /></Field>
        <Field label="Adresse"><Input value={f.adresse} onChange={(e) => set('adresse', e.target.value)} /></Field>
        <Field label="Date d'embauche"><Input type="date" value={f.dateEmbauche} onChange={(e) => set('dateEmbauche', e.target.value)} /></Field>
        <Field label="Type de contrat">
          <Select value={f.typeContrat} onChange={(e) => set('typeContrat', e.target.value)}>
            {Object.entries(typeContratLabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Fin de contrat (si applicable)"><Input type="date" value={f.dateFinContrat} onChange={(e) => set('dateFinContrat', e.target.value)} /></Field>
        <Field label={`Salaire de base (${devise})`}><Input type="number" value={f.salaireBase} onChange={(e) => set('salaireBase', e.target.value)} /></Field>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Documents ({docs.length})</div>

        <div className="space-y-2">
          {docs.length === 0 && <p className="text-sm text-slate-400">Aucun document. Ajoutez-en ci-dessous.</p>}
          {docs.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
                  <DocIcon mime={d.mime} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.type}</span>
                    <span className="block truncate text-xs text-slate-400">{d.nom}{d.taille ? ` · ${fmtFileSize(d.taille)}` : ' · sans fichier'}</span>
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {d.dataUrl && <IconBtn title="Aperçu" tone="view" onClick={() => onPreview(d)}><Eye size={15} /></IconBtn>}
                  <IconBtn title="Modifier" tone="edit" onClick={() => setEditingId(editingId === d.id ? null : d.id)}><Pencil size={15} /></IconBtn>
                  <IconBtn title="Supprimer" tone="delete" onClick={() => setDocs(docs.filter((x) => x.id !== d.id))}><Trash2 size={15} /></IconBtn>
                </div>
              </div>

              {editingId === d.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
                  <Field label="Type" className="w-full sm:w-48">
                    <Select value={d.type} onChange={(e) => setDocs(docs.map((x) => (x.id === d.id ? { ...x, type: e.target.value } : x)))}>
                      {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </Field>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <FileUp size={15} /> Remplacer le fichier
                    <input ref={replaceInputRef} type="file" className="hidden" onChange={(e) => onReplaceFile(d.id, e.target.files?.[0])} />
                  </label>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Terminé</Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ajouter un document (upload) */}
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Ajouter un document</div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Type" className="w-full sm:w-48">
              <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
              <FileUp size={16} /> Téléverser un fichier
              <input ref={addInputRef} type="file" accept="image/*,application/pdf,.doc,.docx" className="hidden" onChange={(e) => onAddFile(e.target.files?.[0])} />
            </label>
            <span className="text-xs text-slate-400">PDF, image ou Word · max {fmtFileSize(MAX_DOC_BYTES)}</span>
          </div>
          {error && <div className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">{error}</div>}
        </div>
      </div>
    </Modal>
  );
}

function IconBtn({ title, tone, onClick, children }: { title: string; tone: 'view' | 'edit' | 'delete'; onClick: () => void; children: React.ReactNode }) {
  const styles = {
    view: 'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600',
    edit: 'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600',
    delete: 'hover:border-red-300 hover:bg-red-50 hover:text-red-600',
  }[tone];
  return (
    <button title={title} onClick={onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition ${styles}`}>
      {children}
    </button>
  );
}
