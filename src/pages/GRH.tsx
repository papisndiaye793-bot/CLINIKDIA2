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
import { downloadDocumentPDF, downloadListePDF, fmtDate, fmtFileSize, fmtMoney, initials, readFileAsDataURL, slugify, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import { DocumentBuilder } from '@/components/DocumentBuilder';
import { RapportListe } from '@/components/RapportListe';
import { DOC_MODELES, signaturesFor, tl } from '@/lib/hrDocuments';
import type { DocumentRH, Staff, TypeContrat, StaffDocument } from '@/types';

const DOC_TYPES_FR = ['Contrat de travail', 'CNI / Pièce d\'identité', 'Diplôme', 'Visite médicale', 'Attestation', 'CV', 'Autre'];
const DOC_TYPES_EN = ['Employment contract', 'ID card', 'Diploma', 'Medical check', 'Certificate', 'CV', 'Other'];
const MAX_DOC_BYTES = 3 * 1024 * 1024; // 3 Mo

const uid = () => Math.random().toString(36).slice(2, 9);

export default function GRH() {
  const { staff, settings, documentsRH, updateStaff, deleteDocumentRH, logAction } = useStore();
  const { canWrite } = useAuth();
  const { lang } = useT();
  const Lg = useLabels();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const roleLabel = Lg.roleLabel;
  const typeContratLabel = Lg.typeContratLabel;
  const editable = canWrite('grh');

  const [view, setView] = useState<Staff | null>(null);
  const [edit, setEdit] = useState<Staff | null>(null);
  const [preview, setPreview] = useState<StaffDocument | null>(null);
  const [docBuilder, setDocBuilder] = useState<{ open: boolean; staffId?: string }>({ open: false });
  const [delDoc, setDelDoc] = useState<DocumentRH | null>(null);
  const [histOpen, setHistOpen] = useState(false);

  const exportPersonnelPDF = () => {
    downloadListePDF('liste-rh-personnel', {
      settings,
      titre: L('GRH — Dossiers du personnel','HR — Staff records'),
      periode: `${staff.length} ${L('employé(s)','employee(s)')}`,
      headers: [L('Employé','Employee'), L('Fonction','Role'), L('Contrat','Contract'), L('Embauche','Hired'), L('Échéance','End date'), L('Salaire de base','Base salary'), L('Documents','Documents')],
      aligns: ['left', 'left', 'left', 'left', 'left', 'right', 'right'],
      rows: staff.map((s) => [
        `${s.role === 'nephrologue' ? 'Dr ' : ''}${s.prenom} ${s.nom} (${s.code})`,
        roleLabel[s.role].label,
        s.typeContrat ? typeContratLabel[s.typeContrat].label : '—',
        fmtDate(s.dateEmbauche),
        s.dateFinContrat ? fmtDate(s.dateFinContrat) : '—',
        s.salaireBase ? fmtMoney(s.salaireBase, settings.devise) : '—',
        String(s.documents?.length ?? 0),
      ]),
      synthese: [
        { label: L('Effectif','Headcount'), value: String(staff.length) },
        { label: L('Masse salariale / mois','Monthly payroll'), value: fmtMoney(masseSalariale, settings.devise) },
      ],
    });
  };

  const reDownload = (d: DocumentRH) => {
    const modele = DOC_MODELES.find((m) => m.id === d.modeleId);
    const s = staff.find((x) => x.id === d.staffId);
    // Régénère le corps avec les infos établissement à jour, sauf si le texte a
    // été modifié à la main (on conserve alors la version figée).
    const corps = modele && s && d.values && !d.edited
      ? modele.build({ s, c: settings, v: d.values, today: d.date, lang })
      : d.corps;
    downloadDocumentPDF(`${slugify(d.titre)}-${slugify(d.staffNom)}`, {
      settings,
      titre: d.titre,
      corps,
      signatures: signaturesFor(d.modeleId, lang),
      reference: modele ? tl(modele.description, lang) : undefined,
    });
  };

  const masseSalariale = staff.filter((s) => s.actif).reduce((a, s) => a + (s.salaireBase ?? 0), 0);
  const cdi = staff.filter((s) => s.typeContrat === 'CDI').length;
  const echeances = staff.filter((s) => s.dateFinContrat && s.dateFinContrat >= todayISO()).length;

  return (
    <div>
      <PageHeader
        title={L('GRH — Ressources humaines','HR — Human resources')}
        subtitle={L('Contrats, paie et dossiers du personnel','Contracts, payroll and staff records')}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={exportPersonnelPDF} disabled={staff.length === 0}><Download size={16} /> {L('Télécharger en PDF','Download as PDF')}</Button>
            {editable && <Button onClick={() => setDocBuilder({ open: true })}><FileText size={16} /> {L('Établir un document','Create a document')}</Button>}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={L('Effectif actif','Active headcount')} value={staff.filter((s) => s.actif).length} icon={<Users2 size={18} />} tone="blue" hint={`${staff.length} ${L('au total','total')}`} />
        <StatCard label={L('Masse salariale / mois','Monthly payroll')} value={fmtMoney(masseSalariale, settings.devise)} icon={<Wallet size={18} />} tone="purple" />
        <StatCard label={L('Contrats CDI','Permanent contracts')} value={cdi} icon={<FileText size={18} />} tone="green" />
        <StatCard label={L('CDD / contrats à terme','Fixed-term contracts')} value={echeances} icon={<CalendarClock size={18} />} tone="amber" />
      </div>

      <Card>
        <CardHeader title={L('Dossiers du personnel','Staff records')} subtitle={`${staff.length} ${L('employés','employees')}`} />
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr>
              <Th>{L('Employé','Employee')}</Th><Th>{L('Fonction','Role')}</Th><Th>{L('Contrat','Contract')}</Th><Th>{L('Embauche','Hired')}</Th><Th>{L('Échéance','End date')}</Th><Th>{L('Salaire de base','Base salary')}</Th><Th>{L('Documents','Documents')}</Th><Th className="text-right">{L('Actions','Actions')}</Th>
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
                          title={L('Établir un document','Create a document')}
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
          title={L('Documents établis','Issued documents')}
          subtitle={`${documentsRH.length} ${L('document(s) généré(s)','document(s) issued')}`}
          action={
            <div className="flex items-center gap-2">
              {documentsRH.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => setHistOpen(true)}><Printer size={16} /> {L('Historique','History')}</Button>
              )}
              {editable && <Button size="sm" variant="secondary" onClick={() => setDocBuilder({ open: true })}><FileText size={16} /> {L('Nouveau document','New document')}</Button>}
            </div>
          }
        />
        {documentsRH.length === 0 ? (
          <EmptyState icon={<FileText size={22} />} title={L('Aucun document établi','No document issued')} hint={L('Utilisez « Établir un document » pour générer contrats, attestations et certificats.','Use "Create a document" to generate contracts, certificates and attestations.')} />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>{L('Date','Date')}</Th><Th>{L('Employé','Employee')}</Th><Th>{L('Type de document','Document type')}</Th><Th className="text-right">{L('Actions','Actions')}</Th></tr>
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
                      <IconBtn title={L('Télécharger en PDF','Download as PDF')} tone="view" onClick={() => reDownload(d)}><Download size={15} /></IconBtn>
                      {editable && <IconBtn title={L('Supprimer du registre','Remove from registry')} tone="delete" onClick={() => setDelDoc(d)}><Trash2 size={15} /></IconBtn>}
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
        title={L('Supprimer le document du registre','Remove document from registry')}
        message={<span className="font-semibold text-slate-700">{delDoc?.titre} — {delDoc?.staffNom}</span>}
        onConfirm={() => { if (delDoc) { deleteDocumentRH(delDoc.id); logAction('delete', 'grh', `Document supprimé : ${delDoc.titre} — ${delDoc.staffNom}`); } }}
        onClose={() => setDelDoc(null)}
      />

      {/* Fiche RH */}
      <Modal open={!!view} onClose={() => setView(null)} title={L('Dossier RH','HR record')} size="xl">
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
                <DefRow label={L('Date de naissance','Date of birth')} value={fmtDate(view.dateNaissance)} />
                <DefRow label={L('Adresse','Address')} value={view.adresse || '—'} />
                <DefRow label={L('Téléphone','Phone')} value={view.telephone} />
                <DefRow label={L('Email','Email')} value={view.email} />
                <DefRow label={L("Date d'embauche",'Hire date')} value={fmtDate(view.dateEmbauche)} />
                <DefRow label={L('Type de contrat','Contract type')} value={view.typeContrat ? typeContratLabel[view.typeContrat].label : '—'} />
                <DefRow label={L('Catégorie','Category')} value={<Badge tone={view.cadre ? 'purple' : 'slate'}>{view.cadre ? L('Cadre','Manager') : L('Non-cadre','Non-manager')}</Badge>} />
                <DefRow label={L('Fin de contrat','Contract end')} value={view.dateFinContrat ? fmtDate(view.dateFinContrat) : '—'} />
                <DefRow label={L('Salaire de base','Base salary')} value={view.salaireBase ? fmtMoney(view.salaireBase, settings.devise) : '—'} />
              </DefList>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-semibold text-slate-700">{L("Contacts d'urgence",'Emergency contacts')}</div>
                <div className="space-y-2">
                  {(view.contactsUrgence ?? []).length === 0 && <p className="text-sm text-slate-400">{L('Aucun contact renseigné.','No contact provided.')}</p>}
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
                  {(view.documents ?? []).length === 0 && <p className="text-sm text-slate-400">{L('Aucun document.','No document.')}</p>}
                  {(view.documents ?? []).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setPreview(d)}
                      title={L('Aperçu du document','Document preview')}
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
        titre={L('Historique des documents établis','Issued documents history')}
        settings={settings}
        rows={documentsRH}
        dateOf={(d) => d.date}
        colonnes={[
          { header: L('Date','Date'), cell: (d) => fmtDate(d.date), text: (d) => fmtDate(d.date) },
          { header: L('Employé','Employee'), cell: (d) => d.staffNom },
          { header: L('Matricule','ID'), cell: (d) => d.staffCode ?? '—' },
          { header: L('Type de document','Document type'), cell: (d) => d.titre },
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
  const { lang } = useT();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
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
              <Download size={15} /> {L('Télécharger','Download')}
            </a>
          )}
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"><X size={18} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-white">
        {!doc.dataUrl ? (
          <div className="p-10 text-center text-slate-400">{L('Aucun fichier joint à ce document.','No file attached to this document.')}</div>
        ) : isImage ? (
          <img src={doc.dataUrl} alt={doc.nom} className="max-h-full max-w-full object-contain" />
        ) : isPdf ? (
          <iframe src={doc.dataUrl} title={doc.nom} className="h-full w-full rounded-xl" />
        ) : (
          <div className="p-10 text-center">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">{L('Aperçu non disponible pour ce format.','Preview not available for this format.')}</p>
            <a href={doc.dataUrl} download={doc.nom} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
              <Download size={15} /> {L('Télécharger le fichier','Download file')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function EditHrModal({ staff, devise, onClose, onSave, onPreview }: { staff: Staff; devise: string; onClose: () => void; onSave: (data: Partial<Staff>) => void; onPreview: (d: StaffDocument) => void }) {
  const { lang } = useT();
  const Lg = useLabels();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const typeContratLabel = Lg.typeContratLabel;
  const DOC_TYPES = lang === 'en' ? DOC_TYPES_EN : DOC_TYPES_FR;
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
    if (file.size > MAX_DOC_BYTES) { setError(`${L('Fichier trop volumineux','File too large')} (max ${fmtFileSize(MAX_DOC_BYTES)}).`); return; }
    const dataUrl = await readFileAsDataURL(file);
    setDocs((d) => [...d, { id: uid(), type: newType, nom: file.name, dateAjout: todayISO(), mime: file.type, taille: file.size, dataUrl }]);
    if (addInputRef.current) addInputRef.current.value = '';
  };

  const onReplaceFile = async (id: string, file?: File | null) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) { setError(`${L('Fichier trop volumineux','File too large')} (max ${fmtFileSize(MAX_DOC_BYTES)}).`); return; }
    const dataUrl = await readFileAsDataURL(file);
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, nom: file.name, mime: file.type, taille: file.size, dataUrl, dateAjout: todayISO() } : x)));
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${L('Dossier RH','HR record')} — ${staff.prenom} ${staff.nom}`}
      size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>{L('Annuler','Cancel')}</Button><Button onClick={() => onSave({ ...f, salaireBase: Number(f.salaireBase), dateFinContrat: f.dateFinContrat || undefined, documents: docs })}>{L('Enregistrer','Save')}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={L('Date de naissance','Date of birth')}><Input type="date" value={f.dateNaissance} onChange={(e) => set('dateNaissance', e.target.value)} /></Field>
        <Field label={L('Adresse','Address')}><Input value={f.adresse} onChange={(e) => set('adresse', e.target.value)} /></Field>
        <Field label={L("Date d'embauche",'Hire date')}><Input type="date" value={f.dateEmbauche} onChange={(e) => set('dateEmbauche', e.target.value)} /></Field>
        <Field label={L('Type de contrat','Contract type')}>
          <Select value={f.typeContrat} onChange={(e) => set('typeContrat', e.target.value)}>
            {Object.entries(typeContratLabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label={L('Fin de contrat (si applicable)','Contract end (if applicable)')}><Input type="date" value={f.dateFinContrat} onChange={(e) => set('dateFinContrat', e.target.value)} /></Field>
        <Field label={`${L('Salaire de base','Base salary')} (${devise})`}><Input type="number" value={f.salaireBase} onChange={(e) => set('salaireBase', e.target.value)} /></Field>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">{L('Documents','Documents')} ({docs.length})</div>

        <div className="space-y-2">
          {docs.length === 0 && <p className="text-sm text-slate-400">{L('Aucun document. Ajoutez-en ci-dessous.','No document. Add one below.')}</p>}
          {docs.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
                  <DocIcon mime={d.mime} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.type}</span>
                    <span className="block truncate text-xs text-slate-400">{d.nom}{d.taille ? ` · ${fmtFileSize(d.taille)}` : ` · ${L('sans fichier','no file')}`}</span>
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {d.dataUrl && <IconBtn title={L('Aperçu','Preview')} tone="view" onClick={() => onPreview(d)}><Eye size={15} /></IconBtn>}
                  <IconBtn title={L('Modifier','Edit')} tone="edit" onClick={() => setEditingId(editingId === d.id ? null : d.id)}><Pencil size={15} /></IconBtn>
                  <IconBtn title={L('Supprimer','Delete')} tone="delete" onClick={() => setDocs(docs.filter((x) => x.id !== d.id))}><Trash2 size={15} /></IconBtn>
                </div>
              </div>

              {editingId === d.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
                  <Field label={L('Type','Type')} className="w-full sm:w-48">
                    <Select value={d.type} onChange={(e) => setDocs(docs.map((x) => (x.id === d.id ? { ...x, type: e.target.value } : x)))}>
                      {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </Field>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <FileUp size={15} /> {L('Remplacer le fichier','Replace file')}
                    <input ref={replaceInputRef} type="file" className="hidden" onChange={(e) => onReplaceFile(d.id, e.target.files?.[0])} />
                  </label>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>{L('Terminé','Done')}</Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ajouter un document (upload) */}
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{L('Ajouter un document','Add a document')}</div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={L('Type','Type')} className="w-full sm:w-48">
              <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
              <FileUp size={16} /> {L('Téléverser un fichier','Upload a file')}
              <input ref={addInputRef} type="file" accept="image/*,application/pdf,.doc,.docx" className="hidden" onChange={(e) => onAddFile(e.target.files?.[0])} />
            </label>
            <span className="text-xs text-slate-400">{L('PDF, image ou Word','PDF, image or Word')} · max {fmtFileSize(MAX_DOC_BYTES)}</span>
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
