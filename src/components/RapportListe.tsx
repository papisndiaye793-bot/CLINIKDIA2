import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Droplets, FileText } from 'lucide-react';
import { Button, Select } from '@/components/ui';
import { downloadListePDF, fmtDateLong, slugify } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { ClinicSettings } from '@/types';

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type ColonneRapport<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Valeur texte pour l'export CSV. À fournir quand `cell` ne renvoie pas
   *  déjà une chaîne / un nombre. */
  text?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
};

type Props<T> = {
  open: boolean;
  onClose: () => void;
  /** Titre du rapport (ex. « Liste des dépenses »). */
  titre: string;
  settings: ClinicSettings;
  /** Lignes source (non filtrées par période). */
  rows: T[];
  /** Renvoie la date ISO d'une ligne, sert au filtrage par période. */
  dateOf: (row: T) => string | undefined;
  colonnes: ColonneRapport<T>[];
  /** Bloc de synthèse optionnel (totaux) rendu sous le tableau. */
  synthese?: (rows: T[]) => React.ReactNode;
  /** Version texte de la synthèse pour l'export PDF (totaux label/valeur). */
  syntheseRows?: (rows: T[]) => { label: string; value: string }[];
};

export function RapportListe<T>({ open, onClose, titre, settings, rows, dateOf, colonnes, synthese, syntheseRows }: Props<T>) {
  const { lang } = useT();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const MOIS = lang === 'en' ? MOIS_EN : MOIS_FR;
  const now = new Date();
  const [mode, setMode] = useState<'mensuel' | 'annuel'>('annuel');
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth());
  const sheetRef = useRef<HTMLDivElement>(null);

  // Ajuste automatiquement l'échelle pour que le rapport tienne sur UNE page A4
  // paysage à l'impression (marges 1,2 cm → zone utile ≈ 273 × 186 mm).
  useEffect(() => {
    if (!open) return;
    const PAGE_W = 1031; // 273 mm @ 96 dpi
    const PAGE_H = 690; // 186 mm @ 96 dpi (léger retrait de sécurité)
    const fit = () => {
      const el = sheetRef.current;
      if (!el) return;
      // Mesure hors flux, à la largeur d'impression, pour une hauteur fiable
      // quelle que soit la largeur de la fenêtre.
      const saved = {
        position: el.style.position, left: el.style.left, top: el.style.top,
        width: el.style.width, maxWidth: el.style.maxWidth,
        visibility: el.style.visibility, transform: el.style.transform,
      };
      el.style.visibility = 'hidden';
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '0';
      el.style.maxWidth = 'none';
      el.style.width = `${PAGE_W}px`;
      el.style.transform = 'none';
      const h = el.scrollHeight;
      Object.assign(el.style, saved);
      const scale = Math.min(1, PAGE_H / h);
      el.style.setProperty('--print-scale', String(scale));
    };
    window.addEventListener('beforeprint', fit);
    return () => window.removeEventListener('beforeprint', fit);
  }, [open]);

  // Années présentes dans les données (plus l'année courante), triées décroissant.
  const annees = useMemo(() => {
    const set = new Set<number>([now.getFullYear()]);
    for (const r of rows) {
      const d = dateOf(r);
      if (d) { const y = new Date(d).getFullYear(); if (!isNaN(y)) set.add(y); }
    }
    return [...set].sort((a, b) => b - a);
  }, [rows, dateOf, now]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const iso = dateOf(r);
      if (!iso) return false;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== annee) return false;
      if (mode === 'mensuel' && d.getMonth() !== mois) return false;
      return true;
    });
  }, [rows, dateOf, mode, annee, mois]);

  const periodeLabel = mode === 'mensuel' ? `${MOIS[mois]} ${annee}` : `${L('Année','Year')} ${annee}`;

  const cellText = (c: ColonneRapport<T>, r: T): string | number => {
    if (c.text) return c.text(r);
    const v = c.cell(r);
    return typeof v === 'string' || typeof v === 'number' ? v : '';
  };
  const fileBase = `${slugify(titre)}-${slugify(periodeLabel)}`;

  const exportPDF = () => {
    downloadListePDF(fileBase, {
      settings,
      titre,
      periode: periodeLabel,
      headers: colonnes.map((c) => c.header),
      rows: filtered.map((r) => colonnes.map((c) => cellText(c, r))),
      aligns: colonnes.map((c) => c.align ?? 'left'),
      synthese: syntheseRows ? syntheseRows(filtered) : undefined,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-900/60">
      {/* Barre d'actions — non imprimée, collée en haut */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="mr-auto text-sm font-semibold text-slate-700">{titre}</span>
        <Select value={mode} onChange={(e) => setMode(e.target.value as 'mensuel' | 'annuel')} className="!w-36 shrink-0">
          <option value="annuel">{L('Annuel','Yearly')}</option>
          <option value="mensuel">{L('Mensuel','Monthly')}</option>
        </Select>
        {mode === 'mensuel' && (
          <Select value={mois} onChange={(e) => setMois(Number(e.target.value))} className="!w-36 shrink-0">
            {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </Select>
        )}
        <Select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="!w-28 shrink-0">
          {annees.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Button onClick={exportPDF}><FileText size={16} /> {L('Télécharger en PDF','Download as PDF')}</Button>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
          <X size={18} />
        </button>
      </div>

      <div ref={sheetRef} className="liste-sheet mx-auto my-6 w-full max-w-[1100px] rounded-lg bg-white p-10 text-slate-800 shadow-2xl">
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
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-brand-700">{titre}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{periodeLabel}</div>
            <div className="mt-0.5 text-xs text-slate-500">{L('Édité le','Issued on')} {fmtDateLong(now.toISOString().slice(0, 10))}</div>
          </div>
        </div>

        {/* Tableau */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">{L('Aucune donnée pour cette période.','No data for this period.')}</div>
        ) : (
          <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left">
                {colonnes.map((c, i) => (
                  <th key={i} className={'px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 ' + (c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, ri) => (
                <tr key={ri} className={ri % 2 ? 'bg-slate-50' : ''}>
                  {colonnes.map((c, ci) => (
                    <td key={ci} className={'border-b border-slate-100 px-3 py-2 align-top ' + (c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left') + ' ' + (c.className ?? '')}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Synthèse / totaux */}
        {filtered.length > 0 && synthese && (
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              {synthese(filtered)}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-slate-400">{filtered.length} {L('ligne(s)','row(s)')} — {periodeLabel}</div>

        {/* Bande de pied de page — épinglée en bas de la page à l'impression */}
        <div className="print-footer -mx-10 mt-8 border-t border-slate-200 px-10 pt-3 text-center text-[10px] font-medium text-slate-500">
          {settings.nom} — {settings.adresse} · {settings.telephone} · {settings.email}
        </div>
      </div>
    </div>
  );
}
