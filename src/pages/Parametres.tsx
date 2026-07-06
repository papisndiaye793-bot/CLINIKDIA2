import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, RotateCcw, Building2, Database, FileText, Upload, Trash2, CalendarClock, Archive as ArchiveIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { PageHeader, Card, CardHeader, Button, Field, Input, Textarea, Select, ConfirmDialog } from '@/components/ui';
import { fmtFileSize, readFileAsDataURL } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const MAX_LOGO_BYTES = 1.5 * 1024 * 1024; // 1,5 Mo

export default function Parametres() {
  const { settings, updateSettings, resetData, patients, seances, factures, exercice, archives, demarrerNouvelleAnnee } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [confirmYear, setConfirmYear] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const onLogoFile = async (file?: File | null) => {
    setLogoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setLogoError(t('param.imgInvalid')); return; }
    if (file.size > MAX_LOGO_BYTES) { setLogoError(t('param.imgTooBig').replace('{s}', fmtFileSize(MAX_LOGO_BYTES))); return; }
    const dataUrl = await readFileAsDataURL(file);
    set('logoUrl', dataUrl);
  };

  const save = () => {
    updateSettings({ ...form, nbPostes: Number(form.nbPostes), tarifSeance: Number(form.tarifSeance) });
    setSaved(true);
  };

  return (
    <div>
      <PageHeader title={t('param.title')} subtitle={t('param.subtitle')} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('param.establishment')} subtitle={t('param.establishmentSub')} action={<Building2 size={18} className="text-slate-400" />} />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label={t('param.clinicName')} className="sm:col-span-2"><Input value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
            <Field label={t('cf.address')} className="sm:col-span-2"><Input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} /></Field>
            <Field label={t('cf.phone')}><Input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></Field>
            <Field label={t('cf.email')}><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label={t('param.posts')}><Input type="number" value={form.nbPostes} onChange={(e) => set('nbPostes', e.target.value)} /></Field>
            <Field label={`${t('param.sessionRate')} (${form.devise})`}><Input type="number" value={form.tarifSeance} onChange={(e) => set('tarifSeance', e.target.value)} /></Field>
            <Field label={t('param.currency')}><Input value={form.devise} onChange={(e) => set('devise', e.target.value)} /></Field>
            <Field label={t('param.langue')} className="sm:col-span-2">
              <Select value={form.langue ?? 'fr'} onChange={(e) => set('langue', e.target.value)}>
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3">
            <Button onClick={save}><Save size={16} /> {t('common.save')}</Button>
            {saved && <span className="text-sm font-medium text-emerald-600">✓ {t('param.saved')}</span>}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('param.legal')} subtitle={t('param.legalSub')} action={<FileText size={18} className="text-slate-400" />} />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            {/* Logo — upload */}
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">{t('param.logo')}</span>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[11px] text-slate-300">{t('param.none')}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
                    <Upload size={16} /> {t('param.uploadLogo')}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} />
                  </label>
                  {form.logoUrl && (
                    <Button variant="outline" onClick={() => { set('logoUrl', ''); if (logoInputRef.current) logoInputRef.current.value = ''; }}>
                      <Trash2 size={15} /> {t('param.remove')}
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{t('param.logoHint').replace('{s}', fmtFileSize(MAX_LOGO_BYTES))}</p>
              {logoError && <div className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">{logoError}</div>}
            </div>
            <Field label="NINEA"><Input value={form.ninea ?? ''} onChange={(e) => set('ninea', e.target.value)} placeholder={t('param.nineaPh')} /></Field>
            <Field label={t('param.rc')}><Input value={form.registreCommerce ?? ''} onChange={(e) => set('registreCommerce', e.target.value)} placeholder="SN-DKR-…" /></Field>
            <Field label={t('param.legalMentions')} className="sm:col-span-2">
              <Textarea rows={2} value={form.mentionsLegales ?? ''} onChange={(e) => set('mentionsLegales', e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3">
            <Button onClick={save}><Save size={16} /> {t('common.save')}</Button>
            {saved && <span className="text-sm font-medium text-emerald-600">✓ {t('co.saved')}</span>}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('ex.title')} subtitle={t('ex.subtitle')} action={<CalendarClock size={18} className="text-slate-400" />} />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">{t('ex.current')}</span>
                <span className="text-xl font-bold">{exercice}</span>
              </div>
              <p className="flex-1 text-sm text-slate-500">{t('ex.desc')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setConfirmYear(true)}><CalendarClock size={16} /> {t('ex.start')}</Button>
              <Button variant="outline" onClick={() => navigate('/archives')}>
                <ArchiveIcon size={16} /> {t('ex.view')} {archives.length > 0 && `(${archives.length})`}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('param.data')} subtitle={t('param.dataSub')} action={<Database size={18} className="text-slate-400" />} />
          <div className="space-y-3 p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xl font-bold text-slate-800">{patients.length}</div><div className="text-xs text-slate-400">{t('nav.patients')}</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xl font-bold text-slate-800">{seances.length}</div><div className="text-xs text-slate-400">{t('arch.seances')}</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xl font-bold text-slate-800">{factures.length}</div><div className="text-xs text-slate-400">{t('arch.factures')}</div></div>
            </div>
            <p className="text-sm text-slate-500">{t('param.dataStored')}</p>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(t('param.resetConfirm'))) {
                  resetData();
                  setForm(settings);
                }
              }}
            >
              <RotateCcw size={16} /> {t('param.reset')}
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmYear}
        title={t('ex.confirmTitle')}
        message={t('ex.confirm').replace('{y}', String(exercice)).replace('{n}', String(exercice + 1))}
        confirmLabel={t('ex.confirmBtn').replace('{n}', String(exercice + 1))}
        onConfirm={() => { demarrerNouvelleAnnee(); navigate('/archives'); }}
        onClose={() => setConfirmYear(false)}
      />
    </div>
  );
}
