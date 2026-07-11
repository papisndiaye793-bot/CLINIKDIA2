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
// jsPDF et son plugin autotable pèsent lourd : ils sont chargés à la demande
// (import dynamique) pour ne pas alourdir le bundle initial de l'application.
import type { ClinicSettings } from '@/types';

async function loadPdf() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

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
export async function downloadListePDF(filename: string, o: PdfListe) {
  const { jsPDF, autoTable } = await loadPdf();
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
export async function downloadDashboardPDF(filename: string, o: PdfDashboard) {
  const { jsPDF, autoTable } = await loadPdf();
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

// ─── Export PDF — Dossier médical patient ────────────────────────────────────
type DossierSection =
  | { type: 'infos'; titre: string; rows: { label: string; value: string }[] }
  | { type: 'table'; titre: string; headers: string[]; rows: (string | number)[][]; aligns?: ('left' | 'right' | 'center')[]; vide?: string }
  | { type: 'kv'; titre: string; rows: { label: string; value: string }[] }
  | { type: 'texte'; titre: string; lignes: string[] };

type PdfDossier = {
  settings: ClinicSettings;
  titrePatient: string; // « Prénom Nom »
  codePatient?: string; // « PAT-0001 »
  initiales?: string; // « MD » — badge du bandeau
  sousTitre?: string; // âge · sexe · groupe sanguin…
  /** Indicateurs affichés sous le bandeau (nb séances, total facturé…). */
  stats?: { label: string; value: string }[];
  sections: DossierSection[];
};

/**
 * Génère le dossier médical complet d'un patient : en-tête clinique, bandeau
 * patient, puis sections (fiches d'informations en 2 colonnes, tableaux
 * paginés, blocs de texte), avec pied de page répété sur chaque page.
 */
export async function downloadDossierPDF(filename: string, o: PdfDossier) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const contentW = pageW - 2 * M;
  const brand: [number, number, number] = [13, 148, 136];
  const s = o.settings;
  const P = (v: unknown) => String(v ?? '').replace(/[\u202F\u00A0\u2009\u2007]/g, ' ');

  const footer = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(M, pageH - M + 2, pageW - M, pageH - M + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(P(`${s.nom} — ${s.adresse} · ${s.telephone} · ${s.email}`), pageW / 2, pageH - M + 6, { align: 'center', maxWidth: contentW });
    doc.text('Document confidentiel — secret médical', pageW / 2, pageH - M + 9.5, { align: 'center' });
  };
  const breakIf = (needed: number, y: number): number => {
    if (y + needed > pageH - M - 6) { footer(); doc.addPage(); return M; }
    return y;
  };

  // ── En-tête « papier à en-tête » : bande pleine aux couleurs de la clinique ──
  const headerH = 26;
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(15, 118, 110);
  doc.rect(0, headerH, pageW, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(P(s.nom), M, 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(204, 251, 241);
  doc.text(P(s.adresse), M, 17);
  doc.text(P(`Tél : ${s.telephone}${s.email ? ' · ' + s.email : ''}`), M, 21.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('DOSSIER MÉDICAL', pageW - M, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(204, 251, 241);
  doc.text(`Édité le ${P(fmtDateLong(todayISO()))}`, pageW - M, 18.5, { align: 'right' });

  // ── Bandeau patient (badge initiales + identité) ──
  let y = headerH + 8;
  const bannerH = 18;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(153, 246, 228);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, contentW, bannerH, 2.5, 2.5, 'FD');
  // Badge rond avec initiales
  const cx = M + 10.5;
  const cy = y + bannerH / 2;
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.circle(cx, cy, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(P(o.initiales ?? o.titrePatient.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()), cx, cy + 1.6, { align: 'center' });
  // Nom + sous-titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(P(o.titrePatient), M + 20, y + 8);
  if (o.sousTitre) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(P(o.sousTitre), M + 20, y + 13.5);
  }
  if (o.codePatient) {
    // Pastille code dossier à droite
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const codeTxt = P(o.codePatient);
    const cw = doc.getTextWidth(codeTxt) + 8;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(pageW - M - cw - 4, y + bannerH / 2 - 3.6, cw, 7.2, 3.6, 3.6, 'FD');
    doc.setTextColor(15, 118, 110);
    doc.text(codeTxt, pageW - M - 4 - cw / 2, y + bannerH / 2 + 1.4, { align: 'center' });
  }
  y += bannerH + 4;

  // ── Indicateurs (chips avec liseré d'accent) ──
  if (o.stats?.length) {
    const n = o.stats.length;
    const gap = 3;
    const chipW = (contentW - gap * (n - 1)) / n;
    const chipH = 14;
    o.stats.forEach((k, i) => {
      const x = M + i * (chipW + gap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, y, chipW, chipH, 1.8, 1.8, 'FD');
      // Liseré d'accent en haut de la carte
      doc.setFillColor(brand[0], brand[1], brand[2]);
      doc.roundedRect(x, y, chipW, 1.1, 0.55, 0.55, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(P(k.label).toUpperCase(), x + 3, y + 5.4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 118, 110);
      doc.text(P(k.value), x + 3, y + 10.8);
    });
    y += chipH + 8;
  } else {
    y += 2;
  }

  const sectionTitle = (titre: string) => {
    y = breakIf(16, y);
    // Bandeau de section plein
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(M, y - 4.6, contentW, 7, 1.2, 1.2, 'F');
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.roundedRect(M, y - 4.6, 1.6, 7, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text(P(titre).toUpperCase(), M + 4.5, y);
    y += 7;
  };

  for (const sec of o.sections) {
    sectionTitle(sec.titre);

    if (sec.type === 'infos') {
      // Fiche en 2 colonnes label/valeur, avec retour à la ligne des valeurs
      // longues et filets discrets entre les lignes.
      const colW = contentW / 2;
      const labelW = 32;
      const valueW = colW - labelW - 6;
      const lineH = 4.4;
      const half = Math.ceil(sec.rows.length / 2);
      for (let i = 0; i < half; i++) {
        const items = [sec.rows[i], sec.rows[i + half]];
        doc.setFontSize(8.5);
        const wrapped = items.map((it) => (it ? (doc.splitTextToSize(P(it.value || '—'), valueW) as string[]) : []));
        const rowLines = Math.max(1, ...wrapped.map((w) => w.length));
        const rowH = rowLines * lineH + 3;
        y = breakIf(rowH, y);
        // Zébrure une ligne sur deux
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, y - 3.4, contentW, rowH, 'F');
        }
        for (const col of [0, 1]) {
          const item = items[col];
          if (!item) continue;
          const x = M + 2 + col * colW + (col === 1 ? 4 : 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          doc.text(P(item.label), x, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(wrapped[col], x + labelW, y);
        }
        y += rowH;
      }
      y += 4;
    } else if (sec.type === 'kv') {
      // Encadré de totaux (style synthèse) aligné à droite
      const boxW = 90;
      const boxH = sec.rows.length * 6.2 + 5;
      y = breakIf(boxH + 4, y);
      const boxX = pageW - M - boxW;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(boxX, y - 2, boxW, boxH, 1.8, 1.8, 'FD');
      sec.rows.forEach((r, i) => {
        const ly = y + 3 + i * 6.2;
        const last = i === sec.rows.length - 1;
        doc.setFont('helvetica', last ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(last ? 15 : 71, last ? 23 : 85, last ? 42 : 105);
        doc.text(P(r.label), boxX + 4, ly);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(P(r.value), boxX + boxW - 4, ly, { align: 'right' });
        if (last && sec.rows.length > 1) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.2);
          doc.line(boxX + 3, ly - 4.4, boxX + boxW - 3, ly - 4.4);
        }
      });
      y += boxH + 5;
    } else if (sec.type === 'table') {
      if (sec.rows.length === 0) {
        y = breakIf(8, y);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(P(sec.vide ?? 'Aucune donnée.'), M, y);
        y += 8;
      } else {
        const columnStyles: Record<number, { halign: 'left' | 'right' | 'center' }> = {};
        (sec.aligns ?? []).forEach((a, i) => { if (a) columnStyles[i] = { halign: a }; });
        autoTable(doc, {
          head: [sec.headers.map(P)],
          body: sec.rows.map((r) => r.map((c) => P(c))),
          startY: y,
          margin: { left: M, right: M, bottom: M + 10 },
          tableWidth: contentW,
          styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles,
          didDrawPage: (data) => { if (data.pageNumber > 1 || data.cursor) footer(); },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = ((doc as any).lastAutoTable?.finalY ?? y) + 7;
      }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      for (const ligne of sec.lignes) {
        const wrapped = doc.splitTextToSize(P(ligne), contentW) as string[];
        for (const l of wrapped) {
          y = breakIf(5.2, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 41, 59);
          doc.text(l, M, y);
          y += 5.2;
        }
      }
      y += 4;
    }
  }

  footer();

  // Numérotation « Page i / n » sur chaque page
  const nPages = doc.getNumberOfPages();
  for (let i = 1; i <= nPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} / ${nPages}`, pageW - M, pageH - M + 9.5, { align: 'right' });
  }

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
export async function downloadDocumentPDF(filename: string, o: PdfDocument) {
  const { jsPDF, autoTable } = await loadPdf();
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
    if (y > pageH - M - 6) {
      footer();
      doc.addPage();
      y = M;
      // footer() a laissé la police en taille 7 / gris clair : on rétablit la
      // taille et la couleur du corps (setFont ci-dessous ne règle que la graisse).
      applyBodyStyle();
    }
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
