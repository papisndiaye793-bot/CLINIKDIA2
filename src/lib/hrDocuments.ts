import type { ClinicSettings, Staff } from '@/types';
import { fmtDateLong, fmtMoney, montantEnLettres } from '@/lib/utils';
import { roleLabel } from '@/lib/labels';

// ─── Modèles de documents RH (droit du travail sénégalais) ───────────────────
// Références : Loi n° 97-17 du 1er décembre 1997 portant Code du travail du
// Sénégal, et Convention collective nationale interprofessionnelle (CCNI).
// Les corps sont pré-remplis automatiquement puis librement modifiables.

export type DocFieldType = 'text' | 'date' | 'number' | 'textarea';

export type DocField = {
  key: string;
  label: string;
  type?: DocFieldType;
  default?: (ctx: DocCtx) => string;
};

export type DocCtx = {
  s: Staff;
  c: ClinicSettings;
  /** Valeurs des champs éditables. */
  v: Record<string, string>;
  today: string;
};

export type DocModele = {
  id: string;
  titre: string;
  description: string;
  /** Champs structurés éditables (pré-remplis). */
  fields: DocField[];
  /** Génère le corps du document à partir du contexte. */
  build: (ctx: DocCtx) => string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const civilite = (s: Staff) => (s.role === 'nephrologue' ? 'le Docteur' : 'M./Mme');
const nomComplet = (s: Staff) => `${s.prenom} ${s.nom}`;
const posteDefaut = (s: Staff) => s.specialite || roleLabel[s.role].label;
const dateFr = (iso?: string) => (iso ? fmtDateLong(iso) : '……………………');
const val = (ctx: DocCtx, k: string) => (ctx.v[k] ?? '').trim();
const money = (ctx: DocCtx, n: string) => {
  const x = Number(n);
  if (!x || isNaN(x)) return '……………………';
  return `${fmtMoney(x, ctx.c.devise)} (${montantEnLettres(x, ctx.c.devise === 'FCFA' ? 'francs CFA' : ctx.c.devise)})`;
};

/** Bloc « Entre les soussignés » commun aux contrats. */
function enTeteContrat(ctx: DocCtx): string {
  const { c, s } = ctx;
  const rc = c.registreCommerce ? `, immatriculée au Registre du Commerce sous le n° ${c.registreCommerce}` : '';
  const ninea = c.ninea ? `, NINEA ${c.ninea}` : '';
  return (
`Entre les soussignés :

${c.nom}, établissement de santé privé sis à ${c.adresse}${ninea}${rc}, représenté(e) par ${val(ctx, 'signataire') || 'la Direction'}, agissant en qualité de ${val(ctx, 'qualiteSignataire') || 'Directeur/Directrice'}, ci-après désigné(e) « l'Employeur », d'une part,

Et ${civilite(s)} ${nomComplet(s)}, né(e) le ${dateFr(s.dateNaissance)}${s.adresse ? `, demeurant à ${s.adresse}` : ''}${s.telephone ? `, téléphone ${s.telephone}` : ''}, ci-après désigné(e) « le/la Salarié(e) », d'autre part,

Il a été arrêté et convenu ce qui suit :`
  );
}

const estCadre = (ctx: DocCtx) => (val(ctx, 'statutPro') || (ctx.s.cadre ? 'Cadre' : 'Non-cadre')).toLowerCase().startsWith('cadre');

/** Article « Classification & statut » (cadre / non-cadre, catégorie CCNI). */
function articleClassification(ctx: DocCtx, num: number): string {
  const statut = val(ctx, 'statutPro') || (ctx.s.cadre ? 'Cadre' : 'Non-cadre');
  const cat = val(ctx, 'categorie');
  const catPhrase = cat
    ? `Il/elle est classé(e) dans la catégorie professionnelle « ${cat} »`
    : `Il/elle est classé(e) dans la catégorie professionnelle correspondant à sa qualification`;
  const cadrePhrase = estCadre(ctx)
    ? ` En sa qualité de cadre, il/elle relève du régime de retraite complémentaire des cadres de l'IPRES et est soumis(e) aux obligations particulières attachées à ce statut (disponibilité, confidentialité renforcée, devoir de loyauté).`
    : '';
  return (
`Article ${num} — Classification et statut
Le/la Salarié(e) est engagé(e) sous le statut de ${statut}. ${catPhrase} de la Convention collective nationale interprofessionnelle (CCNI) et de la grille de classification applicable à l'établissement.${cadrePhrase}`
  );
}

/** Articles communs (protection sociale, obligations, rupture, droit applicable). */
function articlesCommuns(ctx: DocCtx, dernierArticle: number): string {
  const cadre = estCadre(ctx);
  const retraite = cadre
    ? "l'Institution de Prévoyance Retraite du Sénégal (IPRES), y compris le régime complémentaire des cadres,"
    : "l'Institution de Prévoyance Retraite du Sénégal (IPRES)";
  return (
`Article ${dernierArticle} — Protection sociale
L'Employeur procède à l'immatriculation du/de la Salarié(e) auprès de la Caisse de Sécurité Sociale et de ${retraite} ainsi qu'à son affiliation à une Institution de Prévoyance Maladie (IPM), conformément à la réglementation en vigueur. Les cotisations sociales sont réparties entre l'Employeur et le/la Salarié(e) selon les taux légaux.

Article ${dernierArticle + 1} — Obligations et confidentialité
Le/la Salarié(e) s'engage à exercer ses fonctions avec diligence, probité et loyauté, à respecter le règlement intérieur, les consignes d'hygiène et de sécurité, le secret professionnel et médical, ainsi que la confidentialité des données des patients, conformément au Code du travail et à la déontologie médicale. Toute infraction expose le/la Salarié(e) aux sanctions disciplinaires prévues par le règlement intérieur.

Article ${dernierArticle + 2} — Discipline et sanctions
Le/la Salarié(e) est soumis(e) au pouvoir disciplinaire de l'Employeur dans les conditions fixées par le règlement intérieur et le Code du travail (avertissement, mise à pied, licenciement pour faute).

Article ${dernierArticle + 3} — Rupture du contrat
La rupture du présent contrat obéit aux dispositions du Code du travail du Sénégal (Loi n° 97-17 du 1er décembre 1997) et de la CCNI, notamment en matière de préavis, d'indemnité de licenciement et d'indemnité de départ à la retraite, dont la durée et le montant varient selon l'ancienneté et le statut (cadre / non-cadre) du/de la Salarié(e).

Article ${dernierArticle + 4} — Droit applicable et différends
Le présent contrat est régi par le droit sénégalais. Tout différend relatif à sa formation, son exécution ou sa rupture relève, à défaut de règlement amiable, de la compétence de l'Inspection du Travail et, le cas échéant, du Tribunal du Travail territorialement compétent.

Fait à ${val(ctx, 'lieu') || 'Dakar'}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}, en deux (2) exemplaires originaux.`
  );
}

const champsSignature: DocField[] = [
  { key: 'signataire', label: 'Signataire (Employeur)', default: () => 'La Direction' },
  { key: 'qualiteSignataire', label: 'Qualité du signataire', default: () => 'Directeur/Directrice' },
  { key: 'lieu', label: 'Fait à', default: (c) => {
    // On privilégie la ville : avant-dernier segment de l'adresse (le dernier
    // étant généralement le pays), sinon « Dakar ».
    const parts = (c.c.adresse || '').split(',').map((x) => x.trim()).filter(Boolean);
    return (parts.length >= 2 ? parts[parts.length - 2] : parts[0]) || 'Dakar';
  } },
  { key: 'dateEdition', label: "Date d'édition", type: 'date', default: (c) => c.today },
];

// ── Modèles ──────────────────────────────────────────────────────────────────
export const DOC_MODELES: DocModele[] = [
  {
    id: 'cdi',
    titre: 'Contrat de travail à durée indéterminée (CDI)',
    description: 'Engagement permanent — Code du travail sénégalais',
    fields: [
      { key: 'poste', label: 'Poste / Fonction', default: (c) => posteDefaut(c.s) },
      { key: 'statutPro', label: 'Statut', default: (c) => (c.s.cadre ? 'Cadre' : 'Non-cadre') },
      { key: 'categorie', label: 'Catégorie / classification (CCNI)', default: () => '' },
      { key: 'dateDebut', label: "Date de prise de fonction", type: 'date', default: (c) => c.s.dateEmbauche ?? c.today },
      { key: 'periodeEssai', label: "Période d'essai", default: (c) => (c.s.cadre ? 'six (6) mois renouvelable une fois' : 'trois (3) mois renouvelable une fois') },
      { key: 'salaire', label: 'Salaire brut mensuel', type: 'number', default: (c) => String(c.s.salaireBase ?? '') },
      { key: 'primes', label: 'Primes et indemnités', default: () => "prime d'ancienneté, indemnité de transport et de responsabilité selon la CCNI" },
      { key: 'lieuTravail', label: 'Lieu de travail', default: (c) => c.c.adresse },
      { key: 'horaire', label: 'Durée hebdomadaire', default: () => '40 heures' },
      ...champsSignature,
    ],
    build: (ctx) => (
`${enTeteContrat(ctx)}

Article 1 — Engagement
L'Employeur engage ${civilite(ctx.s)} ${nomComplet(ctx.s)} par contrat de travail à durée indéterminée, à compter du ${dateFr(val(ctx, 'dateDebut'))}.

Article 2 — Fonctions
Le/la Salarié(e) est engagé(e) en qualité de ${val(ctx, 'poste') || posteDefaut(ctx.s)}. Il/elle exercera ses fonctions sous l'autorité de la Direction et pourra se voir confier toute tâche connexe correspondant à sa qualification.

${articleClassification(ctx, 3)}

Article 4 — Période d'essai
Le présent contrat ne devient définitif qu'à l'issue d'une période d'essai de ${val(ctx, 'periodeEssai') || 'trois (3) mois'}, durant laquelle chacune des parties peut y mettre fin sans préavis ni indemnité, conformément au Code du travail.

Article 5 — Rémunération
En contrepartie de son travail, le/la Salarié(e) percevra un salaire brut mensuel de ${money(ctx, val(ctx, 'salaire'))}, payable à terme échu, sous déduction des cotisations sociales et fiscales en vigueur. À ce salaire de base s'ajoutent, le cas échéant, ${val(ctx, 'primes') || 'les primes et indemnités prévues par la CCNI'}.

Article 6 — Lieu et durée du travail
Le/la Salarié(e) exercera ses fonctions à ${val(ctx, 'lieuTravail') || ctx.c.adresse}, pour une durée hebdomadaire de ${val(ctx, 'horaire') || '40 heures'}, selon les plannings établis par l'Employeur. Les heures effectuées au-delà de la durée légale ouvrent droit à majoration dans les conditions prévues par la réglementation.

Article 7 — Congés payés
Le/la Salarié(e) bénéficie des congés payés dans les conditions fixées par le Code du travail, soit deux (2) jours ouvrables par mois de service effectif, majorés le cas échéant en fonction de l'ancienneté et des charges de famille.

${articlesCommuns(ctx, 8)}`
    ),
  },
  {
    id: 'cdd',
    titre: 'Contrat de travail à durée déterminée (CDD)',
    description: 'Engagement à terme — Code du travail sénégalais',
    fields: [
      { key: 'poste', label: 'Poste / Fonction', default: (c) => posteDefaut(c.s) },
      { key: 'statutPro', label: 'Statut', default: (c) => (c.s.cadre ? 'Cadre' : 'Non-cadre') },
      { key: 'categorie', label: 'Catégorie / classification (CCNI)', default: () => '' },
      { key: 'dateDebut', label: 'Date de début', type: 'date', default: (c) => c.s.dateEmbauche ?? c.today },
      { key: 'dateFin', label: 'Date de fin', type: 'date', default: (c) => c.s.dateFinContrat ?? '' },
      { key: 'motif', label: 'Motif du recours au CDD', default: () => "surcroît temporaire d'activité" },
      { key: 'periodeEssai', label: "Période d'essai", default: () => "un (1) mois" },
      { key: 'salaire', label: 'Salaire brut mensuel', type: 'number', default: (c) => String(c.s.salaireBase ?? '') },
      { key: 'primes', label: 'Primes et indemnités', default: () => "les indemnités prévues par la CCNI" },
      { key: 'lieuTravail', label: 'Lieu de travail', default: (c) => c.c.adresse },
      ...champsSignature,
    ],
    build: (ctx) => (
`${enTeteContrat(ctx)}

Article 1 — Objet et durée
L'Employeur engage ${civilite(ctx.s)} ${nomComplet(ctx.s)} par contrat de travail à durée déterminée, pour un motif de ${val(ctx, 'motif') || "surcroît temporaire d'activité"}, du ${dateFr(val(ctx, 'dateDebut'))} au ${dateFr(val(ctx, 'dateFin'))} inclus.

Article 2 — Fonctions
Le/la Salarié(e) est engagé(e) en qualité de ${val(ctx, 'poste') || posteDefaut(ctx.s)}, sous l'autorité de la Direction.

${articleClassification(ctx, 3)}

Article 4 — Période d'essai
Le présent contrat comporte une période d'essai de ${val(ctx, 'periodeEssai') || 'un (1) mois'}, durant laquelle chacune des parties peut y mettre fin sans préavis ni indemnité.

Article 5 — Rémunération
Le/la Salarié(e) percevra un salaire brut mensuel de ${money(ctx, val(ctx, 'salaire'))}, sous déduction des cotisations sociales et fiscales en vigueur, outre ${val(ctx, 'primes') || 'les indemnités prévues par la CCNI'}.

Article 6 — Lieu de travail
Le/la Salarié(e) exercera ses fonctions à ${val(ctx, 'lieuTravail') || ctx.c.adresse}, selon les plannings établis par l'Employeur.

Article 7 — Congés payés
Le/la Salarié(e) bénéficie des congés payés au prorata de son temps de présence, conformément au Code du travail.

Article 8 — Fin du contrat
Le contrat prend fin de plein droit à l'échéance du terme fixé à l'article 1, sans préavis. Une indemnité de fin de contrat égale à la fraction légale de la rémunération totale brute sera versée dans les conditions prévues par le Code du travail, sauf conclusion d'un contrat à durée indéterminée à l'issue du terme.

${articlesCommuns(ctx, 9)}`
    ),
  },
  {
    id: 'attestation_travail',
    titre: 'Attestation de travail',
    description: "Atteste l'emploi en cours d'un salarié",
    fields: [
      { key: 'poste', label: 'Poste / Fonction', default: (c) => posteDefaut(c.s) },
      { key: 'depuis', label: 'En poste depuis', type: 'date', default: (c) => c.s.dateEmbauche ?? '' },
      { key: 'usage', label: "Destinée à (usage)", default: () => "servir et valoir ce que de droit" },
      ...champsSignature,
    ],
    build: (ctx) => (
`Je soussigné(e), ${val(ctx, 'signataire') || 'la Direction'}, agissant en qualité de ${val(ctx, 'qualiteSignataire') || 'Directeur/Directrice'} de ${ctx.c.nom}, atteste que :

${civilite(ctx.s)} ${nomComplet(ctx.s)}${ctx.s.code ? ` (matricule ${ctx.s.code})` : ''}, né(e) le ${dateFr(ctx.s.dateNaissance)}, est employé(e) au sein de notre établissement en qualité de ${val(ctx, 'poste') || posteDefaut(ctx.s)}, depuis le ${dateFr(val(ctx, 'depuis'))}.

L'intéressé(e) fait toujours partie de nos effectifs à ce jour.

La présente attestation est délivrée à l'intéressé(e) pour ${val(ctx, 'usage') || 'servir et valoir ce que de droit'}.

Fait à ${val(ctx, 'lieu') || 'Dakar'}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`
    ),
  },
  {
    id: 'certificat_travail',
    titre: 'Certificat de travail',
    description: 'Délivré en fin de contrat (art. L.63 Code du travail)',
    fields: [
      { key: 'poste', label: 'Emploi occupé', default: (c) => posteDefaut(c.s) },
      { key: 'dateDebut', label: "Date d'entrée", type: 'date', default: (c) => c.s.dateEmbauche ?? '' },
      { key: 'dateFin', label: 'Date de sortie', type: 'date', default: (c) => c.s.dateFinContrat ?? c.today },
      ...champsSignature,
    ],
    build: (ctx) => (
`Je soussigné(e), ${val(ctx, 'signataire') || 'la Direction'}, ${val(ctx, 'qualiteSignataire') || 'Directeur/Directrice'} de ${ctx.c.nom}, sis à ${ctx.c.adresse}, certifie que :

${civilite(ctx.s)} ${nomComplet(ctx.s)}, né(e) le ${dateFr(ctx.s.dateNaissance)}, a été employé(e) dans notre établissement du ${dateFr(val(ctx, 'dateDebut'))} au ${dateFr(val(ctx, 'dateFin'))}, en qualité de ${val(ctx, 'poste') || posteDefaut(ctx.s)}.

Conformément à l'article L.63 du Code du travail, le/la Salarié(e) quitte l'établissement libre de tout engagement.

En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.

Fait à ${val(ctx, 'lieu') || 'Dakar'}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`
    ),
  },
  {
    id: 'attestation_salaire',
    titre: 'Attestation de salaire',
    description: 'Justificatif de revenu (banque, bailleur, organisme)',
    fields: [
      { key: 'poste', label: 'Poste / Fonction', default: (c) => posteDefaut(c.s) },
      { key: 'salaire', label: 'Salaire brut mensuel', type: 'number', default: (c) => String(c.s.salaireBase ?? '') },
      { key: 'depuis', label: 'En poste depuis', type: 'date', default: (c) => c.s.dateEmbauche ?? '' },
      { key: 'destinataire', label: 'À l\'attention de', default: () => "l'organisme concerné" },
      ...champsSignature,
    ],
    build: (ctx) => (
`Je soussigné(e), ${val(ctx, 'signataire') || 'la Direction'}, ${val(ctx, 'qualiteSignataire') || 'Directeur/Directrice'} de ${ctx.c.nom}, atteste que :

${civilite(ctx.s)} ${nomComplet(ctx.s)}${ctx.s.code ? ` (matricule ${ctx.s.code})` : ''} est employé(e) dans notre établissement depuis le ${dateFr(val(ctx, 'depuis'))} en qualité de ${val(ctx, 'poste') || posteDefaut(ctx.s)}.

À ce titre, il/elle perçoit une rémunération brute mensuelle de ${money(ctx, val(ctx, 'salaire'))}.

La présente attestation est établie à l'attention de ${val(ctx, 'destinataire') || "l'organisme concerné"}, pour servir et valoir ce que de droit.

Fait à ${val(ctx, 'lieu') || 'Dakar'}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`
    ),
  },
  {
    id: 'autorisation_absence',
    titre: "Autorisation d'absence",
    description: 'Congé, permission ou absence exceptionnelle',
    fields: [
      { key: 'motif', label: "Motif de l'absence", default: (c) => c.s.absenceMotif || 'congé annuel' },
      { key: 'dateDebut', label: 'Absent(e) à partir du', type: 'date', default: (c) => c.s.absenceDebut ?? '' },
      { key: 'dateRetour', label: 'Reprise le', type: 'date', default: (c) => c.s.absenceRetour ?? '' },
      ...champsSignature,
    ],
    build: (ctx) => (
`Je soussigné(e), ${val(ctx, 'signataire') || 'la Direction'}, ${val(ctx, 'qualiteSignataire') || 'Directeur/Directrice'} de ${ctx.c.nom}, autorise :

${civilite(ctx.s)} ${nomComplet(ctx.s)}${ctx.s.code ? ` (matricule ${ctx.s.code})` : ''}, ${val(ctx, 'poste') || posteDefaut(ctx.s)}, à s'absenter de son poste pour le motif suivant : ${val(ctx, 'motif') || 'congé annuel'}.

Cette absence court du ${dateFr(val(ctx, 'dateDebut'))} au ${dateFr(val(ctx, 'dateRetour'))} inclus, la reprise du service étant fixée au lendemain de cette dernière date.

La présente autorisation est délivrée pour servir et valoir ce que de droit.

Fait à ${val(ctx, 'lieu') || 'Dakar'}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`
    ),
  },
];

/** Construit les valeurs par défaut des champs pour un modèle et un contexte. */
export function defaultFieldValues(modele: DocModele, ctx: Omit<DocCtx, 'v'>): Record<string, string> {
  const base: DocCtx = { ...ctx, v: {} };
  const out: Record<string, string> = {};
  for (const f of modele.fields) out[f.key] = f.default ? f.default(base) : '';
  return out;
}
