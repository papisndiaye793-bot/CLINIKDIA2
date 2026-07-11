import QRCode from 'qrcode';
import { roleLabel } from '@/lib/labels';
import { initials, slugify } from '@/lib/utils';
import type { ClinicSettings, Staff } from '@/types';

// ─── Badge de pointage (carte CR80 : 85,6 × 54 mm) ──────────────────────────

/** Contenu encodé dans le QR du badge. */
export const badgeQrText = (staffId: string) => `CLK:${staffId}`;

/** Extrait l'identifiant employé d'un QR scanné (ou null si étranger). */
export function parseBadgeQr(text: string): string | null {
  const m = /^CLK:(.+)$/.exec(text.trim());
  return m ? m[1] : null;
}

/** Génère le QR d'un badge en dataURL (pour l'aperçu et le PDF). */
export function badgeQrDataUrl(staffId: string): Promise<string> {
  return QRCode.toDataURL(badgeQrText(staffId), { width: 480, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
}

/**
 * Télécharge le badge d'un employé en PDF au format carte CR80
 * (85,6 × 54 mm) : bande clinique, photo (ou initiales), identité et QR de
 * pointage. Imprimable sur imprimante à badges ou sur A4 puis découpé.
 */
export async function downloadBadgePDF(staff: Staff, settings: ClinicSettings) {
  const { jsPDF } = await import('jspdf');
  const qr = await badgeQrDataUrl(staff.id);

  const W = 85.6;
  const H = 54;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
  const brand: [number, number, number] = [13, 148, 136];

  // Fond
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Bande supérieure aux couleurs de la clinique
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, W, 11, 'F');
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 11, W, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(settings.nom, 4, 5.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(204, 251, 241);
  doc.text('BADGE PERSONNEL — POINTAGE', 4, 9);

  // Photo (ou pavé initiales)
  const phX = 4;
  const phY = 15;
  const phW = 20;
  const phH = 25;
  if (staff.photoUrl) {
    try {
      doc.addImage(staff.photoUrl, phX, phY, phW, phH, undefined, 'FAST');
    } catch {
      // format d'image non géré → repli initiales
      drawInitials();
    }
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(phX, phY, phW, phH);
  } else {
    drawInitials();
  }
  function drawInitials() {
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.setLineWidth(0.3);
    doc.rect(phX, phY, phW, phH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text(initials(staff.nom, staff.prenom), phX + phW / 2, phY + phH / 2 + 2, { align: 'center' });
  }

  // Identité
  const txX = phX + phW + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${staff.role === 'nephrologue' ? 'Dr ' : ''}${staff.prenom}`, txX, 21, { maxWidth: 34 });
  doc.text(staff.nom.toUpperCase(), txX, 26, { maxWidth: 34 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(roleLabel[staff.role].label, txX, 31, { maxWidth: 34 });
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 118, 110);
  doc.text(staff.code, txX, 36.5);

  // QR de pointage
  const qrS = 24;
  doc.addImage(qr, 'PNG', W - qrS - 4, 14, qrS, qrS, undefined, 'FAST');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Scanner à la borne de pointage', W - 4 - qrS / 2, 14 + qrS + 3, { align: 'center' });

  // Bande inférieure
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, H - 3.5, W, 3.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`${settings.adresse} · ${settings.telephone}`, W / 2, H - 1.3, { align: 'center' });

  doc.save(`badge-${slugify(`${staff.prenom}-${staff.nom}`)}-${slugify(staff.code)}.pdf`);
}
