import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const fmtMoney = (n: number, devise = 'FCFA') =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} ${devise}`;

export const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const fmtDateLong = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const age = (dateNaissance: string) => {
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return '—';
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

export const initials = (nom: string, prenom: string) =>
  `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();

export const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── Sécurité — politique de mot de passe (ISO/IEC 27002 — 5.17) ─────────────
/**
 * Valide un mot de passe selon la politique : ≥ 8 caractères,
 * au moins une lettre et un chiffre. Renvoie un message d'erreur ou null si OK.
 */
export function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd))
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  return null;
}

// ─── Fichiers ───────────────────────────────────────────────────────────────
export const fmtFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

// ─── Export CSV (ouvrable dans Excel / LibreOffice) ──────────────────────────
/** Échappe une valeur pour le format CSV (RFC 4180). */
const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Déclenche le téléchargement d'un CSV. Séparateur « ; » (attendu par Excel FR)
 * et BOM UTF-8 pour que les accents s'affichent correctement.
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(';'));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Nom de fichier sûr : minuscules, sans accents ni caractères spéciaux. */
export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

// ─── Export PDF (jsPDF + autotable) ──────────────────────────────────────────
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ClinicSettings } from '@/types';

type PdfListe = {
  settings: ClinicSettings;
  titre: string;
  periode: string;
  headers: string[];
  rows: (string | number)[][];
  /** Alignements par colonne (défaut : left). */
  aligns?: ('left' | 'right' | 'center')[];
  /** Lignes de synthèse (totaux) rendues sous le tableau. */
  synthese?: { label: string; value: string }[];
  /** Orientation de la page (défaut : paysage). */
  orientation?: 'portrait' | 'landscape';
};

/**
 * Génère et télécharge un PDF « liste » : en-tête clinique, tableau paginé,
 * synthèse optionnelle et pied de page répété sur chaque page.
 */
export function downloadListePDF(filename: string, o: PdfListe) {
  const doc = new jsPDF({ orientation: o.orientation ?? 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 12; // marge en mm
  const brand: [number, number, number] = [13, 148, 136]; // teal ~ brand-600
  const s = o.settings;
  // Les polices standard de jsPDF (WinAnsi) ne connaissent pas l'espace fine
  // insécable (U+202F/U+00A0) qu'Intl insère dans les montants — elle s'affiche
  // sinon comme un « / » parasite. On la remplace par une espace normale.
  const P = (v: unknown) => String(v ?? '').replace(/[\u202F\u00A0\u2009\u2007]/g, ' ');

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(P(s.nom), M, M + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text([P(s.adresse), `Tél : ${P(s.telephone)} · ${P(s.email)}`], M, M + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 118, 110);
  doc.text(P(o.titre), pageW - M, M + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(P(o.periode), pageW - M, M + 10, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Édité le ${fmtDateLong(todayISO())}`, pageW - M, M + 15, { align: 'right' });

  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.5);
  doc.line(M, M + 20, pageW - M, M + 20);

  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center' }> = {};
  (o.aligns ?? []).forEach((a, i) => { if (a) columnStyles[i] = { halign: a }; });

  const footer = P(`${s.nom} — ${s.adresse} · ${s.telephone} · ${s.email}`);

  autoTable(doc, {
    head: [o.headers.map(P)],
    body: o.rows.map((r) => r.map((c) => P(c))),
    startY: M + 24,
    margin: { left: M, right: M, bottom: M + 8 },
    tableWidth: pageW - 2 * M,
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    didDrawPage: () => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(M, pageH - M - 3, pageW - M, pageH - M - 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(footer, pageW / 2, pageH - M + 1, { align: 'center' });
    },
  });

  // Synthèse (totaux)
  if (o.synthese?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = ((doc as any).lastAutoTable?.finalY ?? M + 24) + 8;
    if (y > pageH - M - 20) { doc.addPage(); y = M + 10; }
    const boxW = 80;
    const boxX = pageW - M - boxW;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(boxX, y, boxW, o.synthese.length * 6 + 4, 1.5, 1.5, 'FD');
    doc.setFontSize(8.5);
    o.synthese.forEach((line, i) => {
      const ly = y + 6 + i * 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(P(line.label), boxX + 4, ly);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(P(line.value), boxX + boxW - 4, ly, { align: 'right' });
    });
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

// ─── Export PDF — Tableau de bord (KPI + analyse) ────────────────────────────
type PdfDashboard = {
  settings: ClinicSettings;
  titre: string;
  date: string;
  kpis: { label: string; value: string; hint?: string }[];
  /** Titres de section + paragraphes d'analyse générés à partir des données. */
  analyse: { titre: string; points: string[] }[];
};

/** Génère un PDF portrait du tableau de bord : grille de KPI + analyse rédigée. */
export function downloadDashboardPDF(filename: string, o: PdfDashboard) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 16;
  const brand: [number, number, number] = [13, 148, 136];
  const s = o.settings;
  const P = (v: unknown) => String(v ?? '').replace(/[\u202F\u00A0\u2009\u2007]/g, ' ');

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(P(s.nom), M, M + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${P(s.adresse)} · ${P(s.telephone)}`, M, M + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 118, 110);
  doc.text(P(o.titre), pageW - M, M + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(P(o.date), pageW - M, M + 10, { align: 'right' });
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.5);
  doc.line(M, M + 15, pageW - M, M + 15);

  // Grille de KPI (2 colonnes)
  let y = M + 24;
  const cols = 2;
  const gap = 6;
  const cardW = (pageW - 2 * M - gap * (cols - 1)) / cols;
  const cardH = 22;
  o.kpis.forEach((k, i) => {
    const cx = M + (i % cols) * (cardW + gap);
    const cy = y + Math.floor(i / cols) * (cardH + gap);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(P(k.label).toUpperCase(), cx + 5, cy + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(P(k.value), cx + 5, cy + 15);
    if (k.hint) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(P(k.hint), cx + 5, cy + 19.5);
    }
  });
  y += Math.ceil(o.kpis.length / cols) * (cardH + gap) + 6;

  // Analyse & interprétation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110);
  doc.text('Analyse & interprétation', M, y);
  y += 7;

  for (const sec of o.analyse) {
    if (y > pageH - M - 20) { doc.addPage(); y = M + 6; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(P(sec.titre), M, y);
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    for (const pt of sec.points) {
      const lines = doc.splitTextToSize(P(pt), pageW - 2 * M - 5) as string[];
      if (y + lines.length * 5 > pageH - M - 12) { doc.addPage(); y = M + 6; }
      doc.setFillColor(brand[0], brand[1], brand[2]);
      doc.circle(M + 1.2, y - 1.4, 0.8, 'F');
      doc.text(lines, M + 5, y);
      y += lines.length * 5 + 1.5;
    }
    y += 3;
  }

  // Pied de page
  const footer = P(`${s.nom} — ${s.adresse} · ${s.telephone} · ${s.email}`);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(M, pageH - M + 2, pageW - M, pageH - M + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(footer, pageW / 2, pageH - M + 6, { align: 'center' });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

// ─── Export PDF — Document administratif RH ──────────────────────────────────
type PdfDocument = {
  settings: ClinicSettings;
  titre: string;
  /** Corps du document (paragraphes séparés par des retours à la ligne). */
  corps: string;
  /** Blocs de signature en pied (1 = attestation, 2 = contrat). */
  signatures: string[];
  /** Référence / sous-titre optionnel sous le titre. */
  reference?: string;
};

/** Génère un document administratif RH en PDF portrait A4, corps justifié. */
export function downloadDocumentPDF(filename: string, o: PdfDocument) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 20;
  const contentW = pageW - 2 * M;
  const brand: [number, number, number] = [13, 148, 136];
  const s = o.settings;
  const P = (v: unknown) => String(v ?? '').replace(/[\u202F\u00A0\u2009\u2007]/g, ' ');

  const footer = () => {
    const parts = [s.nom, s.adresse, s.ninea ? `NINEA ${s.ninea}` : '', s.registreCommerce ? `RC ${s.registreCommerce}` : '', s.telephone, s.email].filter(Boolean);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(M, pageH - M + 2, pageW - M, pageH - M + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(P(parts.join(' · ')), pageW / 2, pageH - M + 6, { align: 'center', maxWidth: contentW });
  };

  // En-tête établissement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(P(s.nom), M, M);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(P(`${s.adresse}${s.telephone ? ' · Tél : ' + s.telephone : ''}`), M, M + 5.5);
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.4);
  doc.line(M, M + 9, pageW - M, M + 9);

  // Titre
  let y = M + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 118, 110);
  doc.text(P(o.titre).toUpperCase(), pageW / 2, y, { align: 'center' });
  const tw = doc.getTextWidth(P(o.titre).toUpperCase());
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.5);
  doc.line((pageW - tw) / 2, y + 1.8, (pageW + tw) / 2, y + 1.8);
  if (o.reference) {
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(P(o.reference), pageW / 2, y, { align: 'center' });
  }
  y += 12;

  // Corps — les segments encadrés par `**…**` sont rendus en gras (valeurs à
  // remplir). On découpe en mots typés (gras / normal) et on assemble les
  // lignes avec césure manuelle, chaque mot étant mesuré dans sa police.
  const FS = 10.5;
  const lineH = 5.6;
  const applyBodyStyle = (bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(FS);
    doc.setTextColor(30, 41, 59);
  };
  applyBodyStyle();

  type Word = { text: string; bold: boolean };
  const wordsOf = (para: string): Word[] => {
    const out: Word[] = [];
    // Segments alternés autour de `**` : indices pairs = normal, impairs = gras.
    para.split('**').forEach((seg, i) => {
      if (seg === '') return;
      const bold = i % 2 === 1;
      seg.split(/(\s+)/).forEach((tok) => { if (tok !== '') out.push({ text: tok, bold }); });
    });
    return out;
  };
  const wordW = (w: Word) => {
    doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
    return doc.getTextWidth(w.text);
  };
  const drawLine = (words: Word[]) => {
    if (y > pageH - M - 6) { footer(); doc.addPage(); y = M; }
    let x = M;
    // Regroupe les mots consécutifs de même graisse en un seul tracé.
    let i = 0;
    while (i < words.length) {
      const bold = words[i].bold;
      let text = '';
      while (i < words.length && words[i].bold === bold) { text += words[i].text; i++; }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, x, y);
      x += doc.getTextWidth(text);
    }
    y += lineH;
  };

  for (const para of P(o.corps).split('\n')) {
    if (para.trim() === '') { y += lineH * 0.6; continue; }
    let line: Word[] = [];
    let lineW = 0;
    for (const w of wordsOf(para)) {
      const ww = wordW(w);
      // Ignore l'espace en début de ligne issu d'une césure.
      if (line.length === 0 && /^\s+$/.test(w.text)) continue;
      if (lineW + ww > contentW && line.length > 0) {
        // Retire l'espace de fin avant de tracer la ligne.
        while (line.length && /^\s+$/.test(line[line.length - 1].text)) { lineW -= wordW(line[line.length - 1]); line.pop(); }
        drawLine(line);
        line = []; lineW = 0;
        if (/^\s+$/.test(w.text)) continue;
      }
      line.push(w); lineW += ww;
    }
    if (line.length) drawLine(line);
  }
  applyBodyStyle();

  // Signatures
  y += 8;
  const blockH = 26;
  if (y > pageH - M - blockH) { footer(); doc.addPage(); y = M + 6; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  if (o.signatures.length === 1) {
    doc.text(P(o.signatures[0]), pageW - M, y, { align: 'right' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('(cachet et signature)', pageW - M, y + 5, { align: 'right' });
  } else {
    const colW = contentW / 2;
    o.signatures.slice(0, 2).forEach((label, i) => {
      const cx = M + i * colW + colW / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(P(label), cx, y, { align: 'center' });
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('(cachet et signature)', cx, y + 5, { align: 'center' });
    });
  }

  footer();
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── Montant en lettres (français) ──────────────────────────────────────────
const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', '', 'quatre-vingt', ''];

function sous100(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7) return u === 0 ? 'soixante-dix' : u === 1 ? 'soixante et onze' : 'soixante-' + UNITES[10 + u];
  if (d === 9) return 'quatre-vingt-' + UNITES[10 + u];
  const base = d === 8 ? 'quatre-vingt' : DIZAINES[d];
  if (u === 0) return d === 8 ? 'quatre-vingts' : base;
  if (u === 1 && d !== 8) return base + ' et un';
  return base + '-' + UNITES[u];
}

function sous1000(n: number): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  let s = '';
  if (c > 0) {
    s += (c > 1 ? UNITES[c] + ' ' : '') + 'cent';
    if (c > 1 && r === 0) s += 's';
    if (r > 0) s += ' ';
  }
  if (r > 0) s += sous100(r);
  return s;
}

export function montantEnLettres(montant: number, devise = 'francs CFA'): string {
  const n = Math.round(montant);
  if (n === 0) return `zéro ${devise}`;
  const groupes: number[] = [];
  let x = n;
  while (x > 0) {
    groupes.push(x % 1000);
    x = Math.floor(x / 1000);
  }
  const echelles = ['', 'mille', 'million', 'milliard'];
  const parts: string[] = [];
  for (let i = groupes.length - 1; i >= 0; i--) {
    const g = groupes[i];
    if (g === 0) continue;
    let w: string;
    if (i === 1 && g === 1) w = 'mille';
    else {
      w = sous1000(g);
      if (i > 0) w += ' ' + echelles[i];
      if (i >= 2 && g > 1) w += 's';
    }
    parts.push(w);
  }
  const phrase = parts.join(' ');
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} ${devise}`;
}
