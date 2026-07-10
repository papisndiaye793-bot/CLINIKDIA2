import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserPlus, Trash2, FileText } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
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
  EmptyState,
  RowActions,
  ConfirmDialog,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { age, fmtDate, initials, downloadListePDF, slugify } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import type { Patient, Sexe, StatutPatient, AbordVasculaire, PriseEnCharge, SituationFamiliale, Serologie } from '@/types';

const emptyForm = {
  // Identité
  prenom: '',
  nom: '',
  sexe: 'F' as Sexe,
  dateNaissance: '',
  lieuNaissance: '',
  taille: '' as number | string,
  groupeSanguin: 'O+',
  situationFamiliale: 'celibataire' as SituationFamiliale,
  nationalite: 'Sénégalaise',
  numCNI: '',
  // Coordonnées
  telephone: '',
  adresse: '',
  contactUrgenceNom: '',
  contactUrgenceTel: '',
  // Prise en charge & parcours
  statut: 'actif' as StatutPatient,
  nephrologueId: '',
  priseEnCharge: 'IPRES' as PriseEnCharge,
  prisesEnCharge: [] as { type: PriseEnCharge; pourcentage: number }[],
  numAssurance: '',
  centreOrigine: '',
  // Néphrologie
  nephropathie: '',
  dateDebutDialyse: '',
  datePremiereDialyseCentre: '',
  poidsSec: 60 as number | string,
  frequenceHebdo: 3 as number | string,
  // Abord vasculaire
  abord: 'FAV' as AbordVasculaire,
  abordDatePose: '',
  abordDateConfection: '',
  abordDatePremierePonction: '',
  // Dialyse
  dialyseurType: '',
  dialyseurSurface: '',
  anticoagulant: '',
  // Sérologies & allergies
  vhb: 'inconnu' as Serologie,
  vhc: 'inconnu' as Serologie,
  vih: 'inconnu' as Serologie,
  vaccinationVHB: false,
  allergies: '',
};

export default function Patients() {
  const { patients, staff, settings, addPatient, updatePatient, deletePatient, setPatients } = useStore();
  const { canWrite, canDelete } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const editable = canWrite('patients');
  const deletable = canDelete('patients');
  const navigate = useNavigate();
  const nephrologues = staff.filter((s) => s.role === 'nephrologue');
  const [q, setQ] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [form, setForm] = useState({ ...emptyForm, nephrologueId: nephrologues[0]?.id ?? '' });

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchQ =
        !q ||
        `${p.prenom} ${p.nom} ${p.code}`.toLowerCase().includes(q.toLowerCase());
      const matchS = !filtreStatut || p.statut === filtreStatut;
      return matchQ && matchS;
    });
  }, [patients, q, filtreStatut]);

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const nephrologueName = (id: string) => {
    const n = staff.find((s) => s.id === id);
    return n ? `Dr ${n.prenom} ${n.nom}` : '—';
  };

  const exportPDF = () => {
    const periode = filtreStatut
      ? `${t('common.status')} : ${L.statutPatient[filtreStatut as StatutPatient]?.label ?? filtreStatut}`
      : t('pt.allStatus');
    downloadListePDF(`liste-patients-${slugify(periode)}`, {
      settings,
      titre: t('nav.patients'),
      periode,
      headers: [
        t('pt.col.patient'),
        t('pt.f.sex'),
        t('pt.col.age'),
        t('pt.f.phone'),
        t('pt.col.access'),
        t('pt.col.coverage'),
        t('pt.col.start'),
        t('pt.f.neph'),
        t('common.status'),
      ],
      rows: filtered.map((p) => [
        `${p.prenom} ${p.nom} (${p.code})`,
        p.sexe === 'M' ? t('pt.man') : t('pt.woman'),
        `${age(p.dateNaissance)} ${t('pt.ageUnit')}`,
        p.telephone,
        L.abordLabel[p.abord],
        L.priseEnChargeLabel[p.priseEnCharge],
        fmtDate(p.dateDebutDialyse),
        nephrologueName(p.nephrologueId),
        L.statutPatient[p.statut].label,
      ]),
    });
  };

  useEffect(() => {
    apiGet<Patient[]>('/patients')
      .then((data) => setPatients(data))
      .catch((err) => {
        console.warn('Impossible de charger la liste des patients', err);
      });
  }, [setPatients]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, nephrologueId: nephrologues[0]?.id ?? '' });
    setOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditingId(p.id);
    setForm({
      prenom: p.prenom,
      nom: p.nom,
      sexe: p.sexe,
      dateNaissance: p.dateNaissance,
      lieuNaissance: p.lieuNaissance ?? '',
      taille: p.taille ?? '',
      groupeSanguin: p.groupeSanguin,
      situationFamiliale: p.situationFamiliale ?? 'celibataire',
      nationalite: p.nationalite ?? 'Sénégalaise',
      numCNI: p.numCNI ?? '',
      telephone: p.telephone,
      adresse: p.adresse,
      contactUrgenceNom: p.contactUrgence?.nom ?? '',
      contactUrgenceTel: p.contactUrgence?.telephone ?? '',
      statut: p.statut,
      nephrologueId: p.nephrologueId,
      priseEnCharge: p.priseEnCharge,
      prisesEnCharge: p.prisesEnCharge ?? [],
      numAssurance: p.numAssurance ?? '',
      centreOrigine: p.centreOrigine ?? '',
      nephropathie: p.nephropathie,
      dateDebutDialyse: p.dateDebutDialyse,
      datePremiereDialyseCentre: p.datePremiereDialyseCentre ?? '',
      poidsSec: p.poidsSec,
      frequenceHebdo: p.frequenceHebdo,
      abord: p.abord,
      abordDatePose: p.abordDatePose ?? '',
      abordDateConfection: p.abordDateConfection ?? '',
      abordDatePremierePonction: p.abordDatePremierePonction ?? '',
      dialyseurType: p.dialyseurType ?? '',
      dialyseurSurface: p.dialyseurSurface ?? '',
      anticoagulant: p.anticoagulant ?? '',
      vhb: p.serologies.vhb,
      vhc: p.serologies.vhc,
      vih: p.serologies.vih,
      vaccinationVHB: p.vaccinationVHB ?? false,
      allergies: p.allergies ?? '',
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.nom || !form.prenom) return;
    const payload = {
      prenom: form.prenom,
      nom: form.nom,
      sexe: form.sexe,
      dateNaissance: form.dateNaissance,
      lieuNaissance: form.lieuNaissance || undefined,
      taille: form.taille ? Number(form.taille) : undefined,
      groupeSanguin: form.groupeSanguin,
      situationFamiliale: form.situationFamiliale,
      nationalite: form.nationalite || undefined,
      numCNI: form.numCNI || undefined,
      telephone: form.telephone,
      adresse: form.adresse,
      contactUrgence:
        form.contactUrgenceNom || form.contactUrgenceTel
          ? { nom: form.contactUrgenceNom, telephone: form.contactUrgenceTel }
          : undefined,
      statut: form.statut,
      nephrologueId: form.nephrologueId,
      priseEnCharge: form.priseEnCharge,
      prisesEnCharge: form.prisesEnCharge.filter((r) => r.pourcentage > 0),
      numAssurance: form.numAssurance || undefined,
      centreOrigine: form.centreOrigine || undefined,
      nephropathie: form.nephropathie,
      dateDebutDialyse: form.dateDebutDialyse,
      datePremiereDialyseCentre: form.datePremiereDialyseCentre || undefined,
      poidsSec: Number(form.poidsSec),
      frequenceHebdo: Number(form.frequenceHebdo),
      abord: form.abord,
      abordDatePose: form.abordDatePose || undefined,
      abordDateConfection: form.abordDateConfection || undefined,
      abordDatePremierePonction: form.abordDatePremierePonction || undefined,
      dialyseurType: form.dialyseurType || undefined,
      dialyseurSurface: form.dialyseurSurface || undefined,
      anticoagulant: form.anticoagulant || undefined,
      serologies: { vhb: form.vhb, vhc: form.vhc, vih: form.vih },
      vaccinationVHB: form.vaccinationVHB,
      allergies: form.allergies || undefined,
      antecedents: [],
    };

    try {
      if (editingId) {
        const updated = await apiPatch<Patient>(`/patients/${editingId}`, payload);
        updatePatient(editingId, updated);
      } else {
        const created = await apiPost<Patient>('/patients', payload);
        setPatients([created, ...patients]);
      }
      setForm({ ...emptyForm, nephrologueId: nephrologues[0]?.id ?? '' });
      setEditingId(null);
      setOpen(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du patient', err);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('nav.patients')}
        subtitle={t('pt.subtitle').replace('{n}', String(patients.length)).replace('{a}', String(patients.filter((p) => p.statut === 'actif').length))}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={exportPDF} disabled={filtered.length === 0}>
              <FileText size={16} /> Télécharger en PDF
            </Button>
            {editable && (
              <Button onClick={openCreate}>
                <UserPlus size={16} /> {t('pt.new')}
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder={t('pt.search')} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="w-full sm:w-48">
            <option value="">{t('pt.allStatus')}</option>
            {Object.entries(L.statutPatient).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<UserPlus size={22} />} title={t('pt.empty')} hint={t('pt.emptyHint')} />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <Th>{t('pt.col.patient')}</Th>
                <Th>{t('pt.col.age')}</Th>
                <Th>{t('pt.col.access')}</Th>
                <Th>{t('pt.col.coverage')}</Th>
                <Th>{t('pt.col.start')}</Th>
                <Th>{t('common.status')}</Th>
                <Th className="text-right">{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const st = L.statutPatient[p.statut];
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {initials(p.nom, p.prenom)}
                        </span>
                        <div>
                          <div className="font-medium text-slate-800">{p.prenom} {p.nom}</div>
                          <div className="text-xs text-slate-400">{p.code} · {p.sexe === 'M' ? t('pt.man') : t('pt.woman')}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>{age(p.dateNaissance)} {t('pt.ageUnit')}</Td>
                    <Td><span className="text-xs">{L.abordLabel[p.abord]}</span></Td>
                    <Td>{L.priseEnChargeLabel[p.priseEnCharge]}</Td>
                    <Td>{fmtDate(p.dateDebutDialyse)}</Td>
                    <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                    <Td>
                      <RowActions
                        viewLabel={t('pt.openFile')}
                        onView={() => navigate(`/patients/${p.id}`)}
                        onEdit={editable ? () => openEdit(p) : undefined}
                        onDelete={deletable ? () => setDeleteTarget(p) : undefined}
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? t('pt.edit') : t('pt.new')}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={submit}><Plus size={16} /> {editingId ? t('common.save') : t('pt.createBtn')}</Button>
          </>
        }
      >
        {/* Identité */}
        <SectionTitle>{t('pt.sec.identity')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label={t('pt.f.firstname')}><Input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Field>
          <Field label={t('pt.f.lastname')}><Input value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          <Field label={t('pt.f.sex')}>
            <Select value={form.sexe} onChange={(e) => set('sexe', e.target.value)}>
              <option value="F">{t('pt.female')}</option>
              <option value="M">{t('pt.male')}</option>
            </Select>
          </Field>
          <Field label={t('pt.f.birthdate')}><Input type="date" value={form.dateNaissance} onChange={(e) => set('dateNaissance', e.target.value)} /></Field>
          <Field label={t('pt.f.birthplace')}><Input value={form.lieuNaissance} onChange={(e) => set('lieuNaissance', e.target.value)} /></Field>
          <Field label={t('pt.f.height')}><Input type="number" value={form.taille} onChange={(e) => set('taille', e.target.value)} placeholder="171" /></Field>
          <Field label={t('pt.f.blood')}>
            <Select value={form.groupeSanguin} onChange={(e) => set('groupeSanguin', e.target.value)}>
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((g) => <option key={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label={t('pt.f.family')}>
            <Select value={form.situationFamiliale} onChange={(e) => set('situationFamiliale', e.target.value)}>
              {Object.entries(L.situationFamilialeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label={t('pt.f.nationality')}><Input value={form.nationalite} onChange={(e) => set('nationalite', e.target.value)} /></Field>
          <Field label={t('pt.f.cni')}><Input value={form.numCNI} onChange={(e) => set('numCNI', e.target.value)} placeholder="1 234 5678 90123" /></Field>
        </div>

        {/* Coordonnées */}
        <SectionTitle>{t('pt.sec.contact')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label={t('pt.f.phone')}><Input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></Field>
          <Field label={t('pt.f.address')} className="sm:col-span-2 md:col-span-3"><Input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} /></Field>
          <Field label={t('pt.f.emName')} className="sm:col-span-2 md:col-span-3"><Input value={form.contactUrgenceNom} onChange={(e) => set('contactUrgenceNom', e.target.value)} placeholder={t('pt.f.emNamePh')} /></Field>
          <Field label={t('pt.f.emPhone')}><Input value={form.contactUrgenceTel} onChange={(e) => set('contactUrgenceTel', e.target.value)} /></Field>
        </div>

        {/* Prise en charge & parcours */}
        <SectionTitle>{t('pt.sec.coverage')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label={t('common.status')}>
            <Select value={form.statut} onChange={(e) => set('statut', e.target.value)}>
              {Object.entries(L.statutPatient).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label={t('pt.f.coverage')}>
            <Select value={form.priseEnCharge} onChange={(e) => set('priseEnCharge', e.target.value)}>
              {Object.entries(L.priseEnChargeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label={t('pt.f.insNum')}><Input value={form.numAssurance} onChange={(e) => set('numAssurance', e.target.value)} /></Field>
          <Field label={t('pt.f.neph')}>
            <Select value={form.nephrologueId} onChange={(e) => set('nephrologueId', e.target.value)}>
              {nephrologues.map((n) => <option key={n.id} value={n.id}>Dr {n.prenom} {n.nom}</option>)}
            </Select>
          </Field>
          <Field label={t('pt.f.origin')} className="sm:col-span-2 md:col-span-3"><Input value={form.centreOrigine} onChange={(e) => set('centreOrigine', e.target.value)} /></Field>

          {/* Répartition des prises en charge en pourcentages */}
          <div className="sm:col-span-2 md:col-span-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-700">{t('pt.f.coverageSplit')}</span>
              {(() => {
                const tot = form.prisesEnCharge.reduce((a, r) => a + (Number(r.pourcentage) || 0), 0);
                return form.prisesEnCharge.length > 0 ? (
                  <span className={'rounded-full px-2 py-0.5 text-[11px] font-bold ' + (tot === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                    {t('cf.total')} : {tot}%
                  </span>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              {form.prisesEnCharge.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={r.type}
                    onChange={(e) => set('prisesEnCharge', form.prisesEnCharge.map((x, j) => (j === i ? { ...x, type: e.target.value as PriseEnCharge } : x)))}
                    className="flex-1"
                  >
                    {Object.entries(L.priseEnChargeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                  <div className="relative w-28">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={r.pourcentage}
                      onChange={(e) => set('prisesEnCharge', form.prisesEnCharge.map((x, j) => (j === i ? { ...x, pourcentage: Number(e.target.value) || 0 } : x)))}
                      className="pr-8 text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('prisesEnCharge', form.prisesEnCharge.filter((_, j) => j !== i))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const tot = form.prisesEnCharge.reduce((a, r) => a + (Number(r.pourcentage) || 0), 0);
                set('prisesEnCharge', [...form.prisesEnCharge, { type: form.priseEnCharge, pourcentage: Math.max(0, 100 - tot) }]);
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600"
            >
              <Plus size={13} /> {t('pt.f.addCoverage')}
            </button>
            <p className="mt-2 text-[11px] text-slate-400">{t('pt.f.coverageSplitHint')}</p>
          </div>
        </div>

        {/* Données néphrologiques */}
        <SectionTitle>{t('pt.sec.nephro')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label={t('pt.f.nephropathy')} className="sm:col-span-2 md:col-span-3"><Input value={form.nephropathie} onChange={(e) => set('nephropathie', e.target.value)} /></Field>
          <Field label={t('pt.f.first')}><Input type="date" value={form.dateDebutDialyse} onChange={(e) => set('dateDebutDialyse', e.target.value)} /></Field>
          <Field label={t('pt.f.firstCenter')}><Input type="date" value={form.datePremiereDialyseCentre} onChange={(e) => set('datePremiereDialyseCentre', e.target.value)} /></Field>
          <Field label={t('pt.f.freq')}><Input type="number" value={form.frequenceHebdo} onChange={(e) => set('frequenceHebdo', e.target.value)} /></Field>
          <Field label={t('pt.f.dryWeight')}><Input type="number" value={form.poidsSec} onChange={(e) => set('poidsSec', e.target.value)} /></Field>
        </div>

        {/* Abord vasculaire */}
        <SectionTitle>{t('pt.sec.access')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label={t('pt.f.accessType')}>
            <Select value={form.abord} onChange={(e) => set('abord', e.target.value)}>
              {Object.entries(L.abordLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {form.abord === 'FAV' || form.abord === 'pontage' ? (
            <>
              <Field label={t('pt.f.favConf')}><Input type="date" value={form.abordDateConfection} onChange={(e) => set('abordDateConfection', e.target.value)} /></Field>
              <Field label={t('pt.f.favPunct')}><Input type="date" value={form.abordDatePremierePonction} onChange={(e) => set('abordDatePremierePonction', e.target.value)} /></Field>
            </>
          ) : (
            <Field label={t('pt.f.cathPose')}><Input type="date" value={form.abordDatePose} onChange={(e) => set('abordDatePose', e.target.value)} /></Field>
          )}
        </div>

        {/* Dialyse */}
        <SectionTitle>{t('pt.sec.dialysis')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label={t('pt.f.dialyzer')}><Input value={form.dialyseurType} onChange={(e) => set('dialyseurType', e.target.value)} placeholder="FX80 High-flux" /></Field>
          <Field label={t('pt.f.surface')}><Input value={form.dialyseurSurface} onChange={(e) => set('dialyseurSurface', e.target.value)} placeholder="1.8 m²" /></Field>
          <Field label={t('pt.f.anticoag')}><Input value={form.anticoagulant} onChange={(e) => set('anticoagulant', e.target.value)} placeholder="Héparine 5000 UI" /></Field>
        </div>

        {/* Sérologies & allergies */}
        <SectionTitle>{t('pt.sec.sero')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {(['vhb', 'vhc', 'vih'] as const).map((k) => (
            <Field key={k} label={k.toUpperCase()}>
              <Select value={form[k]} onChange={(e) => set(k, e.target.value)}>
                <option value="negatif">{t('sero.negatif')}</option>
                <option value="positif">{t('sero.positif')}</option>
                <option value="inconnu">{t('sero.inconnu')}</option>
              </Select>
            </Field>
          ))}
          <label className="flex items-center gap-2 sm:col-span-2 md:col-span-3">
            <input type="checkbox" checked={form.vaccinationVHB} onChange={(e) => set('vaccinationVHB', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-slate-600">{t('pt.f.vaccVHB')}</span>
          </label>
          <Field label={t('pt.f.allergies')} className="sm:col-span-2 md:col-span-3"><Textarea rows={2} value={form.allergies} onChange={(e) => set('allergies', e.target.value)} /></Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('pt.deleteTitle')}
        message={<span className="font-semibold text-slate-700">{deleteTarget?.prenom} {deleteTarget?.nom}</span>}
        onConfirm={async () => {
        if (!deleteTarget) return;
        try {
          await apiDelete(`/patients/${deleteTarget.id}`);
          deletePatient(deleteTarget.id);
        } catch (err) {
          console.error('Erreur lors de la suppression du patient', err);
        }
      }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-3 first:mt-0">
      <span className="h-1 w-1 rounded-full bg-brand-500 ring-4 ring-brand-100" />
      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-700">{children}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
