import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Printer, X, RotateCcw, Droplets } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { downloadDocumentPDF, fmtDateLong, slugify, todayISO } from '@/lib/utils';
import { DOC_MODELES, defaultFieldValues, signaturesFor, type DocCtx } from '@/lib/hrDocuments';
import type { Staff } from '@/types';

export function DocumentBuilder({ open, onClose, initialStaffId }: { open: boolean; onClose: () => void; initialStaffId?: string }) {
  const { staff, settings, addDocumentRH } = useStore();
  const today = todayISO();

  const [staffId, setStaffId] = useState(initialStaffId ?? staff[0]?.id ?? '');
  const [modeleId, setModeleId] = useState(DOC_MODELES[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [corps, setCorps] = useState('');
  const [dirty, setDirty] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const s = useMemo<Staff | undefined>(() => staff.find((x) => x.id === staffId), [staff, staffId]);
  const modele = useMemo(() => DOC_MODELES.find((m) => m.id === modeleId) ?? DOC_MODELES[0], [modeleId]);

  const ctx = useMemo<DocCtx | null>(() => (s ? { s, c: settings, v: values, today } : null), [s, settings, values, today]);

  // (Re)génère les valeurs par défaut quand l'employé ou le modèle change.
  useEffect(() => {
    if (!s) return;
    setValues(defaultFieldValues(modele, { s, c: settings, today }));
    setDirty(false);
  }, [s, modele, settings, today]);

  // (Re)génère le corps depuis le modèle tant que l'utilisateur ne l'a pas édité.
  useEffect(() => {
    if (!ctx || dirty) return;
    setCorps(modele.build(ctx));
  }, [ctx, modele, dirty]);

  if (!open) return null;

  const setV = (k: string, val: string) => setValues((p) => ({ ...p, [k]: val }));
  const regenerate = () => { if (ctx) { setCorps(modele.build(ctx)); setDirty(false); } };

  const signatures = signaturesFor(modele.id);

  const fileBase = s ? `${slugify(modele.titre)}-${slugify(`${s.prenom}-${s.nom}`)}` : slugify(modele.titre);

  const generatePDF = () => {
    downloadDocumentPDF(fileBase, { settings, titre: modele.titre, corps, signatures, reference: modele.description });
  };

  // Établit le document (l'enregistre dans le registre) puis le télécharge.
  const etablirEtTelecharger = () => {
    if (!s) return;
    addDocumentRH({
      modeleId: modele.id,
      titre: modele.titre,
      staffId: s.id,
      staffNom: `${s.prenom} ${s.nom}`,
      staffCode: s.code,
      date: today,
      corps,
    });
    generatePDF();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-900/60">
      {/* Barre d'actions */}
      <div className="no-print flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="mr-auto inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText size={16} /> Établissement de documents
        </span>
        <Button variant="secondary" onClick={regenerate} title="Régénérer depuis le modèle"><RotateCcw size={15} /> Régénérer</Button>
        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Imprimer</Button>
        <Button variant="secondary" onClick={generatePDF} disabled={!s} title="Télécharger sans enregistrer"><FileText size={16} /> PDF</Button>
        <Button onClick={etablirEtTelecharger} disabled={!s}><FileText size={16} /> Établir &amp; télécharger</Button>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
          <X size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
        {/* Panneau de configuration */}
        <div className="no-print w-full shrink-0 space-y-4 overflow-y-auto border-r border-slate-200 bg-white p-5 lg:w-96">
          <Field label="Employé">
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staff.map((x) => <option key={x.id} value={x.id}>{x.role === 'nephrologue' ? 'Dr ' : ''}{x.prenom} {x.nom} — {x.code}</option>)}
            </Select>
          </Field>
          <Field label="Type de document">
            <Select value={modeleId} onChange={(e) => setModeleId(e.target.value)}>
              {DOC_MODELES.map((m) => <option key={m.id} value={m.id}>{m.titre}</option>)}
            </Select>
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Champs du document</div>
            <div className="space-y-3">
              {modele.fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.type === 'textarea' ? (
                    <Textarea rows={2} value={values[f.key] ?? ''} onChange={(e) => setV(f.key, e.target.value)} />
                  ) : (
                    <Input type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} value={values[f.key] ?? ''} onChange={(e) => setV(f.key, e.target.value)} />
                  )}
                </Field>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Modifier un champ met à jour l'aperçu (tant que le corps n'a pas été édité à la main).</p>
          </div>

          <Field label="Corps du document (modifiable)" hint="Le texte entre **…** apparaît en gras (valeurs à remplir).">
            <Textarea rows={12} value={corps} onChange={(e) => { setCorps(e.target.value); setDirty(true); }} className="font-mono text-xs leading-relaxed" />
          </Field>
        </div>

        {/* Aperçu du document */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <div ref={sheetRef} className="doc-sheet mx-auto w-full max-w-[820px] rounded-lg bg-white p-12 text-slate-800 shadow-2xl">
            {/* En-tête établissement */}
            <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4">
              <div className="flex items-start gap-3">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="h-11 w-11 rounded-xl object-contain" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white"><Droplets size={24} /></div>
                )}
                <div>
                  <div className="text-lg font-extrabold tracking-tight text-slate-900">{settings.nom}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {settings.adresse}{settings.telephone ? ` · Tél : ${settings.telephone}` : ''}
                    {settings.ninea ? <><br />NINEA : {settings.ninea}{settings.registreCommerce ? ` · RC : ${settings.registreCommerce}` : ''}</> : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Titre */}
            <div className="mt-8 text-center">
              <h2 className="inline-block border-b-2 border-brand-500 pb-1 text-xl font-bold uppercase tracking-wide text-brand-800">{modele.titre}</h2>
              <div className="mt-1.5 text-xs italic text-slate-400">{modele.description}</div>
            </div>

            {/* Corps — les segments **…** (valeurs à remplir) sont mis en gras */}
            <div className="mt-8 whitespace-pre-wrap text-justify text-[13.5px] leading-relaxed text-slate-700">
              {corps.split('**').map((seg, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{seg}</strong> : <span key={i}>{seg}</span>))}
            </div>

            {/* Signatures */}
            <div className={'mt-12 ' + (signatures.length === 2 ? 'grid grid-cols-2 gap-8' : 'flex justify-end')}>
              {signatures.map((label, i) => (
                <div key={i} className={signatures.length === 2 ? 'text-center' : 'text-center'}>
                  <div className="text-sm font-semibold text-slate-700">{label}</div>
                  <div className="mt-1 text-xs italic text-slate-400">(cachet et signature)</div>
                  <div className="mt-10 border-t border-dashed border-slate-300" />
                </div>
              ))}
            </div>

            {/* Pied de page */}
            <div className="print-footer mt-10 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
              {settings.nom} — {settings.adresse}{settings.email ? ` · ${settings.email}` : ''} · Édité le {fmtDateLong(today)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
