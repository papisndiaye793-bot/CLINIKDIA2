import { useState } from 'react';
import { Plus, Phone, Mail, AlertTriangle, CalendarClock, FileText } from 'lucide-react';
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
  Textarea,
  Table,
  Th,
  Td,
  RowActions,
  ActionButton,
  ConfirmDialog,
  DefList,
  DefRow,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { fmtDate, initials, downloadListePDF, slugify } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import type { RoleStaff, Staff, TypeContrat, ContactUrgence, StatutPresence } from '@/types';

const emptyContacts: ContactUrgence[] = [
  { nom: '', lien: '', telephone: '' },
  { nom: '', lien: '', telephone: '' },
];

const emptyForm = {
  nom: '',
  prenom: '',
  role: 'infirmier' as RoleStaff,
  telephone: '',
  email: '',
  specialite: '',
  adresse: '',
  dateNaissance: '',
  dateEmbauche: '',
  typeContrat: 'CDI' as TypeContrat,
  dateFinContrat: '',
  alerteContratJours: 30,
  cadre: false,
  salaireBase: 0,
  contactsUrgence: emptyContacts,
};

/** Contrats à durée déterminée (fin de contrat requise). */
const CONTRATS_A_TERME: TypeContrat[] = ['CDD', 'stage', 'vacation', 'prestation'];

/** Jours restants avant la fin du contrat (null si non applicable). */
export function joursRestants(s: { typeContrat?: TypeContrat; dateFinContrat?: string }): number | null {
  if (!s.dateFinContrat || !s.typeContrat || !CONTRATS_A_TERME.includes(s.typeContrat)) return null;
  return Math.ceil((new Date(s.dateFinContrat).getTime() - Date.now()) / 86_400_000);
}

export default function Personnel() {
  const { staff, settings, addStaff, updateStaff, deleteStaff } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const editable = canWrite('personnel');
  const deletable = canDelete('personnel');
  const [open, setOpen] = useState(false);
  const [filtre, setFiltre] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<Staff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [presenceTarget, setPresenceTarget] = useState<Staff | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = staff.filter((s) => !filtre || s.role === filtre);
  const counts = staff.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1;
    return acc;
  }, {});

  const exportPDF = () => {
    const periode = filtre ? L.roleLabel[filtre as RoleStaff].label : t('pe.allRoles');
    downloadListePDF(`liste-personnel-${slugify(periode)}`, {
      settings,
      titre: t('nav.personnel'),
      periode,
      headers: [t('pe.member'), t('cf.role'), t('cf.specialty'), t('cf.phone'), t('cf.email'), t('pe.contractType'), t('pe.hireDate'), t('common.status')],
      rows: filtered.map((s) => [
        `${s.role === 'nephrologue' ? 'Dr ' : ''}${s.prenom} ${s.nom} (${s.code})`,
        L.roleLabel[s.role].label,
        s.specialite || '—',
        s.telephone,
        s.email,
        s.typeContrat ? L.typeContratLabel[s.typeContrat].label : '—',
        fmtDate(s.dateEmbauche),
        (s.actif ? t('cf.active') : t('cf.inactive')) + (s.statutPresence && s.statutPresence !== 'present' ? ` · ${L.statutPresence[s.statutPresence].label}` : ''),
      ]),
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, contactsUrgence: emptyContacts.map((c) => ({ ...c })) });
    setOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({
      nom: s.nom,
      prenom: s.prenom,
      role: s.role,
      telephone: s.telephone,
      email: s.email,
      specialite: s.specialite ?? '',
      adresse: s.adresse ?? '',
      dateNaissance: s.dateNaissance ?? '',
      dateEmbauche: s.dateEmbauche ?? '',
      typeContrat: s.typeContrat ?? 'CDI',
      dateFinContrat: s.dateFinContrat ?? '',
      alerteContratJours: s.alerteContratJours ?? 30,
      cadre: s.cadre ?? false,
      salaireBase: s.salaireBase ?? 0,
      contactsUrgence: s.contactsUrgence?.length ? [
        s.contactsUrgence[0] ?? { nom: '', lien: '', telephone: '' },
        s.contactsUrgence[1] ?? { nom: '', lien: '', telephone: '' },
      ] : emptyContacts.map((c) => ({ ...c })),
    });
    setOpen(true);
  };

  const setContact = (idx: number, key: keyof ContactUrgence, value: string) =>
    setForm((f) => ({
      ...f,
      contactsUrgence: f.contactsUrgence.map((c, i) => (i === idx ? { ...c, [key]: value } : c)),
    }));

  const submit = () => {
    if (!form.nom || !form.prenom) return;
    const aTerme = CONTRATS_A_TERME.includes(form.typeContrat);
    const payload = {
      ...form,
      salaireBase: Number(form.salaireBase) || 0,
      alerteContratJours: Number(form.alerteContratJours) || 30,
      // Pas de fin de contrat pour un CDI
      dateFinContrat: aTerme ? form.dateFinContrat : '',
    };
    if (editingId) {
      updateStaff(editingId, payload);
    } else {
      const prefix = { nephrologue: 'NEPH', infirmier: 'INF', technicien: 'TECH', aide_soignant: 'AS', admin: 'ADM' }[form.role];
      addStaff({ ...payload, code: `${prefix}-${String(counts[form.role] ? counts[form.role] + 1 : 1).padStart(2, '0')}`, actif: true });
    }
    setForm({ ...emptyForm });
    setEditingId(null);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.personnel')}
        subtitle={t('pe.subtitle').replace('{n}', String(staff.length))}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={exportPDF} disabled={filtered.length === 0}>
              <FileText size={16} /> {t('common.downloadPdf')}
            </Button>
            {editable && <Button onClick={openCreate}><Plus size={16} /> {t('pe.add')}</Button>}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(L.roleLabel).map(([k, v]) => (
          <button key={k} onClick={() => setFiltre(filtre === k ? '' : k)} className={'rounded-xl border p-4 text-left transition ' + (filtre === k ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
            <div className="text-2xl font-bold text-slate-800">{counts[k] ?? 0}</div>
            <div className="text-xs text-slate-500">{v.label}</div>
          </button>
        ))}
      </div>

      <Card>
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr><Th>{t('pe.member')}</Th><Th>{t('cf.role')}</Th><Th>{t('cf.specialty')}</Th><Th>{t('pe.contact')}</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => {
              const r = L.roleLabel[s.role];
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
                  <Td className="text-slate-500">{s.specialite || '—'}</Td>
                  <Td>
                    <div className="space-y-0.5 text-xs text-slate-500">
                      <div className="inline-flex items-center gap-1"><Phone size={12} /> {s.telephone}</div>
                      <div className="inline-flex items-center gap-1"><Mail size={12} /> {s.email}</div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <button
                        onClick={() => editable && updateStaff(s.id, { actif: !s.actif })}
                        title={s.actif ? t('pe.deactivate') : t('pe.activate')}
                      >
                        {s.actif ? <Badge tone="green">{t('cf.active')}</Badge> : <Badge tone="slate">{t('cf.inactive')}</Badge>}
                      </button>
                      {s.statutPresence && s.statutPresence !== 'present' && (
                        <span title={[s.absenceMotif, s.absenceDebut && `du ${fmtDate(s.absenceDebut)}`, s.absenceRetour && `au ${fmtDate(s.absenceRetour)}`].filter(Boolean).join(' ')}>
                          <Badge tone={L.statutPresence[s.statutPresence].tone}>
                            {L.statutPresence[s.statutPresence].label}
                            {s.absenceRetour ? ` · retour ${fmtDate(s.absenceRetour)}` : ''}
                          </Badge>
                        </span>
                      )}
                      {(() => {
                        const j = joursRestants(s);
                        const seuil = s.alerteContratJours ?? 30;
                        if (j === null || j > seuil) return null;
                        return (
                          <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ' + (j <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                            <AlertTriangle size={10} />
                            {j <= 0 ? t('pe.contractExpired') : t('pe.contractExpires').replace('{n}', String(j))}
                          </span>
                        );
                      })()}
                    </div>
                  </Td>
                  <Td>
                    <RowActions
                      onView={() => setViewTarget(s)}
                      onEdit={editable ? () => openEdit(s) : undefined}
                      onDelete={deletable ? () => setDeleteTarget(s) : undefined}
                      extra={editable ? <ActionButton tone="edit" icon={<CalendarClock size={15} />} label={t('pe.managePresence')} onClick={() => setPresenceTarget(s)} /> : undefined}
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
        title={editingId ? t('pe.editTitle') : t('pe.addTitle')}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><Plus size={16} /> {editingId ? t('common.save') : t('common.add')}</Button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('cf.firstname')}><Input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Field>
          <Field label={t('cf.name')}><Input value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          <Field label={t('cf.role')}>
            <Select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {Object.entries(L.roleLabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label={t('cf.specialty')}><Input value={form.specialite} onChange={(e) => set('specialite', e.target.value)} /></Field>
          <Field label={t('pe.birthDate')}><Input type="date" value={form.dateNaissance} onChange={(e) => set('dateNaissance', e.target.value)} /></Field>
          <Field label={t('cf.phone')}><Input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></Field>
          <Field label={t('cf.email')} className="col-span-2"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label={t('cf.address')} className="col-span-2"><Input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} /></Field>
          <Field label={t('pe.hireDate')}><Input type="date" value={form.dateEmbauche} onChange={(e) => set('dateEmbauche', e.target.value)} /></Field>
          <Field label={t('pe.contractType')}>
            <Select value={form.typeContrat} onChange={(e) => set('typeContrat', e.target.value)}>
              {Object.entries(L.typeContratLabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          {CONTRATS_A_TERME.includes(form.typeContrat) && (
            <div className="col-span-2 grid grid-cols-2 gap-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <Field label={t('pe.contractEnd')} required>
                <Input type="date" value={form.dateFinContrat} onChange={(e) => set('dateFinContrat', e.target.value)} />
              </Field>
              <Field label={t('pe.alertDays')} hint={t('pe.alertDaysHint')}>
                <Input type="number" min={1} value={form.alerteContratJours} onChange={(e) => set('alerteContratJours', e.target.value)} />
              </Field>
            </div>
          )}
          <Field label={t('pe.category')}>
            <Select value={form.cadre ? '1' : '0'} onChange={(e) => set('cadre', e.target.value === '1')}>
              <option value="0">{t('pa.nonCadre')}</option>
              <option value="1">{t('pa.cadre')}</option>
            </Select>
          </Field>
          <Field label={t('pe.baseSalary')}><Input type="number" value={form.salaireBase} onChange={(e) => set('salaireBase', e.target.value)} /></Field>

          <div className="col-span-2 mt-1 border-t border-slate-100 pt-3">
            <div className="mb-2 text-sm font-semibold text-slate-700">{t('pe.emergency')}</div>
            {form.contactsUrgence.map((c, i) => (
              <div key={i} className="mb-2 grid grid-cols-3 gap-2">
                <Input placeholder={`${t('cf.name')} ${i + 1}`} value={c.nom} onChange={(e) => setContact(i, 'nom', e.target.value)} />
                <Input placeholder={t('pe.relation')} value={c.lien} onChange={(e) => setContact(i, 'lien', e.target.value)} />
                <Input placeholder={t('cf.phone')} value={c.telephone} onChange={(e) => setContact(i, 'telephone', e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title={t('pe.fileTitle')}>
        {viewTarget && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">
                {initials(viewTarget.nom, viewTarget.prenom)}
              </span>
              <div>
                <div className="text-lg font-semibold text-slate-800">{viewTarget.role === 'nephrologue' ? 'Dr ' : ''}{viewTarget.prenom} {viewTarget.nom}</div>
                <div className="text-sm text-slate-400">{viewTarget.code}</div>
              </div>
            </div>
            <DefList>
              <DefRow label={t('cf.role')} value={<Badge tone={L.roleLabel[viewTarget.role].tone}>{L.roleLabel[viewTarget.role].label}</Badge>} />
              <DefRow label={t('cf.specialty')} value={viewTarget.specialite || '—'} />
              <DefRow label={t('pe.birthDate')} value={fmtDate(viewTarget.dateNaissance)} />
              <DefRow label={t('cf.phone')} value={viewTarget.telephone} />
              <DefRow label={t('cf.email')} value={viewTarget.email} />
              <DefRow label={t('cf.address')} value={viewTarget.adresse || '—'} />
              <DefRow label={t('pe.hireDate')} value={fmtDate(viewTarget.dateEmbauche)} />
              <DefRow label={t('pe.contractType')} value={viewTarget.typeContrat ? L.typeContratLabel[viewTarget.typeContrat].label : '—'} />
              <DefRow label={t('pe.category')} value={<Badge tone={viewTarget.cadre ? 'purple' : 'slate'}>{viewTarget.cadre ? t('pa.cadre') : t('pa.nonCadre')}</Badge>} />
              <DefRow label={t('common.status')} value={viewTarget.actif ? <Badge tone="green">{t('cf.active')}</Badge> : <Badge tone="slate">{t('cf.inactive')}</Badge>} />
            </DefList>
            {(viewTarget.contactsUrgence ?? []).some((c) => c.nom) && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-slate-700">{t('gr.emergency')}</div>
                <div className="space-y-2">
                  {(viewTarget.contactsUrgence ?? []).filter((c) => c.nom).map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{c.nom} <span className="font-normal text-slate-400">· {c.lien}</span></span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Phone size={12} /> {c.telephone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('pe.deleteTitle')}
        message={<span className="font-semibold text-slate-700">{deleteTarget?.prenom} {deleteTarget?.nom}</span>}
        onConfirm={() => deleteTarget && deleteStaff(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      {presenceTarget && (
        <PresenceModal
          staff={presenceTarget}
          onClose={() => setPresenceTarget(null)}
          onSave={(data) => { updateStaff(presenceTarget.id, data); setPresenceTarget(null); }}
        />
      )}
    </div>
  );
}

/** Modale de gestion de la présence : congé, maladie ou autre absence. */
function PresenceModal({ staff, onClose, onSave }: { staff: Staff; onClose: () => void; onSave: (data: Partial<Staff>) => void }) {
  const { t } = useT();
  const L = useLabels();
  const [statut, setStatut] = useState<StatutPresence>(staff.statutPresence ?? 'present');
  const [debut, setDebut] = useState(staff.absenceDebut ?? '');
  const [retour, setRetour] = useState(staff.absenceRetour ?? '');
  const [motif, setMotif] = useState(staff.absenceMotif ?? '');
  const absent = statut !== 'present';

  const save = () => {
    if (!absent) {
      onSave({ statutPresence: 'present', absenceDebut: '', absenceRetour: '', absenceMotif: '' });
      return;
    }
    onSave({ statutPresence: statut, absenceDebut: debut || undefined, absenceRetour: retour || undefined, absenceMotif: motif || undefined });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('pe.managePresence')} — ${staff.prenom} ${staff.nom}`}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save} disabled={absent && (!debut || !retour || retour < debut)}>{t('common.save')}</Button></>}
    >
      <div className="space-y-4">
        <Field label={t('pe.presenceStatus')}>
          <Select value={statut} onChange={(e) => setStatut(e.target.value as StatutPresence)}>
            {Object.entries(L.statutPresence).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        {absent && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('pe.absenceStart')} required><Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} /></Field>
              <Field label={t('pe.absenceReturn')} required><Input type="date" value={retour} onChange={(e) => setRetour(e.target.value)} /></Field>
            </div>
            <Field label={t('pe.absenceReason')} hint={t('pe.absenceReasonHint')}>
              <Textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={statut === 'conge' ? 'Congé annuel' : statut === 'maladie' ? 'Arrêt maladie' : 'Formation, mission…'} />
            </Field>
            {debut && retour && retour < debut && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{t('pe.dateOrderError')}</div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
