import type { ClinicSettings, Lang, Staff } from '@/types';
import { fmtDateLong, fmtMoney, montantEnLettres } from '@/lib/utils';
import { roleLabelFor } from '@/lib/labels';

// ─── Modèles de documents RH (droit du travail sénégalais) ───────────────────
// Références : Loi n° 97-17 du 1er décembre 1997 portant Code du travail du
// Sénégal, et Convention collective nationale interprofessionnelle (CCNI).
// Bilingues (FR/EN) : titres, descriptions, libellés de champs et corps.

export type DocFieldType = 'text' | 'date' | 'number' | 'textarea';

/** Chaîne bilingue. */
export type Bi = { fr: string; en: string };
/** Résout une chaîne bilingue (ou simple) dans la langue voulue. */
export const tl = (x: Bi | string, lang: Lang) => (typeof x === 'string' ? x : x[lang]);

export type DocField = {
  key: string;
  label: Bi;
  type?: DocFieldType;
  default?: (ctx: DocCtx) => string;
};

export type DocCtx = {
  s: Staff;
  c: ClinicSettings;
  /** Valeurs des champs éditables. */
  v: Record<string, string>;
  today: string;
  /** Langue du document (défaut : fr). */
  lang?: Lang;
};

export type DocModele = {
  id: string;
  titre: Bi;
  description: Bi;
  /** Champs structurés éditables (pré-remplis). */
  fields: DocField[];
  /** Génère le corps du document à partir du contexte. */
  build: (ctx: DocCtx) => string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const isEn = (ctx: DocCtx) => ctx.lang === 'en';
/** Sélecteur FR/EN dans le corps des documents. */
const T = (ctx: DocCtx, fr: string, en: string) => (isEn(ctx) ? en : fr);
const civilite = (ctx: DocCtx) => (ctx.s.role === 'nephrologue' ? T(ctx, 'le Docteur', 'Dr') : T(ctx, 'M./Mme', 'Mr/Ms'));
// Les valeurs « à remplir » (données fusionnées) sont encadrées par `**…**`.
const B = (x: string | number) => `**${x}**`;
const nomComplet = (s: Staff) => `${s.prenom} ${s.nom}`;
const nomB = (s: Staff) => B(nomComplet(s));
const posteDefaut = (ctx: DocCtx) => ctx.s.specialite || roleLabelFor(ctx.lang ?? 'fr')[ctx.s.role].label;
const dateFr = (iso?: string) => B(iso ? fmtDateLong(iso) : '……………………');
const val = (ctx: DocCtx, k: string) => (ctx.v[k] ?? '').trim();
const vb = (ctx: DocCtx, k: string, repli = '……………………') => B(val(ctx, k) || repli);
const money = (ctx: DocCtx, n: string) => {
  const x = Number(n);
  if (!x || isNaN(x)) return B('……………………');
  const enLettres = isEn(ctx) ? '' : ` (${montantEnLettres(x, ctx.c.devise === 'FCFA' ? 'francs CFA' : ctx.c.devise)})`;
  return B(`${fmtMoney(x, ctx.c.devise)}${enLettres}`);
};

/** Bloc « Entre les soussignés » commun aux contrats. */
function enTeteContrat(ctx: DocCtx): string {
  const { c, s } = ctx;
  const rc = c.registreCommerce ? T(ctx, `, immatriculée au Registre du Commerce sous le n° ${B(c.registreCommerce)}`, `, registered in the Trade Register under no. ${B(c.registreCommerce)}`) : '';
  const ninea = c.ninea ? `, NINEA ${B(c.ninea)}` : '';
  return T(ctx,
`Entre les soussignés :

${B(c.nom)}, établissement de santé privé sis à ${B(c.adresse)}${ninea}${rc}, représenté(e) par ${vb(ctx, 'signataire', 'la Direction')}, agissant en qualité de ${vb(ctx, 'qualiteSignataire', 'Directeur/Directrice')}, ci-après désigné(e) « l'Employeur », d'une part,

Et ${civilite(ctx)} ${nomB(s)}, né(e) le ${dateFr(s.dateNaissance)}${s.adresse ? `, demeurant à ${B(s.adresse)}` : ''}${s.telephone ? `, téléphone ${B(s.telephone)}` : ''}, ci-après désigné(e) « le/la Salarié(e) », d'autre part,

Il a été arrêté et convenu ce qui suit :`,
`Between the undersigned:

${B(c.nom)}, a private healthcare establishment located at ${B(c.adresse)}${ninea}${rc}, represented by ${vb(ctx, 'signataire', 'Management')}, acting as ${vb(ctx, 'qualiteSignataire', 'Director')}, hereinafter "the Employer", on the one hand,

And ${civilite(ctx)} ${nomB(s)}, born on ${dateFr(s.dateNaissance)}${s.adresse ? `, residing at ${B(s.adresse)}` : ''}${s.telephone ? `, phone ${B(s.telephone)}` : ''}, hereinafter "the Employee", on the other hand,

It has been agreed as follows:`);
}

const estCadre = (ctx: DocCtx) => (val(ctx, 'statutPro') || (ctx.s.cadre ? 'Cadre' : 'Non-cadre')).toLowerCase().startsWith('cadre') || (val(ctx, 'statutPro') || '').toLowerCase().startsWith('manager');

function articleClassification(ctx: DocCtx, num: number): string {
  const statut = val(ctx, 'statutPro') || T(ctx, ctx.s.cadre ? 'Cadre' : 'Non-cadre', ctx.s.cadre ? 'Manager' : 'Non-manager');
  const cat = val(ctx, 'categorie');
  return T(ctx,
`Article ${num} — Classification et statut
Le/la Salarié(e) est engagé(e) sous le statut de ${B(statut)}. ${cat ? `Il/elle est classé(e) dans la catégorie professionnelle « ${B(cat)} »` : `Il/elle est classé(e) dans la catégorie professionnelle correspondant à sa qualification`} de la Convention collective nationale interprofessionnelle (CCNI) et de la grille de classification applicable à l'établissement.${estCadre(ctx) ? " En sa qualité de cadre, il/elle relève du régime de retraite complémentaire des cadres de l'IPRES et est soumis(e) aux obligations particulières attachées à ce statut (disponibilité, confidentialité renforcée, devoir de loyauté)." : ''}`,
`Article ${num} — Classification and status
The Employee is engaged with the status of ${B(statut)}. ${cat ? `He/she is classified in the professional category "${B(cat)}"` : `He/she is classified in the professional category matching his/her qualification`} under the National Interprofessional Collective Agreement (CCNI) and the establishment's classification scale.${estCadre(ctx) ? " As a manager, he/she is covered by the IPRES supplementary managerial pension scheme and is subject to the specific obligations of that status (availability, enhanced confidentiality, duty of loyalty)." : ''}`);
}

function articlesCommuns(ctx: DocCtx, n: number): string {
  const cadre = estCadre(ctx);
  return T(ctx,
`Article ${n} — Protection sociale
L'Employeur procède à l'immatriculation du/de la Salarié(e) auprès de la Caisse de Sécurité Sociale et de l'Institution de Prévoyance Retraite du Sénégal (IPRES)${cadre ? ', y compris le régime complémentaire des cadres,' : ''} ainsi qu'à son affiliation à une Institution de Prévoyance Maladie (IPM), conformément à la réglementation en vigueur. Les cotisations sociales sont réparties entre l'Employeur et le/la Salarié(e) selon les taux légaux.

Article ${n + 1} — Obligations et confidentialité
Le/la Salarié(e) s'engage à exercer ses fonctions avec diligence, probité et loyauté, à respecter le règlement intérieur, les consignes d'hygiène et de sécurité, le secret professionnel et médical, ainsi que la confidentialité des données des patients, conformément au Code du travail et à la déontologie médicale.

Article ${n + 2} — Discipline et sanctions
Le/la Salarié(e) est soumis(e) au pouvoir disciplinaire de l'Employeur dans les conditions fixées par le règlement intérieur et le Code du travail (avertissement, mise à pied, licenciement pour faute).

Article ${n + 3} — Rupture du contrat
La rupture du présent contrat obéit aux dispositions du Code du travail du Sénégal (Loi n° 97-17 du 1er décembre 1997) et de la CCNI, notamment en matière de préavis, d'indemnité de licenciement et d'indemnité de départ à la retraite, dont la durée et le montant varient selon l'ancienneté et le statut (cadre / non-cadre) du/de la Salarié(e).

Article ${n + 4} — Droit applicable et différends
Le présent contrat est régi par le droit sénégalais. Tout différend relatif à sa formation, son exécution ou sa rupture relève, à défaut de règlement amiable, de la compétence de l'Inspection du Travail et, le cas échéant, du Tribunal du Travail territorialement compétent.

Fait à ${vb(ctx, 'lieu', 'Dakar')}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}, en deux (2) exemplaires originaux.`,
`Article ${n} — Social protection
The Employer registers the Employee with the Social Security Fund and the Senegalese Retirement Provident Institution (IPRES)${cadre ? ', including the supplementary managerial scheme,' : ''} as well as with a Health Provident Institution (IPM), in accordance with applicable regulations. Social contributions are shared between the Employer and the Employee at the statutory rates.

Article ${n + 1} — Obligations and confidentiality
The Employee undertakes to perform his/her duties with diligence, integrity and loyalty, to comply with the internal rules, hygiene and safety instructions, professional and medical secrecy, and the confidentiality of patient data, in accordance with the Labour Code and medical ethics.

Article ${n + 2} — Discipline and sanctions
The Employee is subject to the Employer's disciplinary authority under the conditions set by the internal rules and the Labour Code (warning, suspension, dismissal for misconduct).

Article ${n + 3} — Termination
Termination of this contract is governed by the Senegalese Labour Code (Act no. 97-17 of 1 December 1997) and the CCNI, in particular regarding notice, severance pay and retirement indemnity, the duration and amount of which vary according to the Employee's seniority and status (manager / non-manager).

Article ${n + 4} — Governing law and disputes
This contract is governed by Senegalese law. Any dispute relating to its formation, performance or termination shall, failing amicable settlement, fall within the jurisdiction of the Labour Inspectorate and, where applicable, the competent Labour Court.

Done at ${vb(ctx, 'lieu', 'Dakar')}, on ${dateFr(val(ctx, 'dateEdition') || ctx.today)}, in two (2) original copies.`);
}

const champsSignature: DocField[] = [
  { key: 'signataire', label: { fr: 'Signataire (Employeur)', en: 'Signatory (Employer)' }, default: (c) => (c.lang === 'en' ? 'Management' : 'La Direction') },
  { key: 'qualiteSignataire', label: { fr: 'Qualité du signataire', en: 'Signatory title' }, default: (c) => (c.lang === 'en' ? 'Director' : 'Directeur/Directrice') },
  { key: 'lieu', label: { fr: 'Fait à', en: 'Done at' }, default: (c) => {
    const parts = (c.c.adresse || '').split(',').map((x) => x.trim()).filter(Boolean);
    return (parts.length >= 2 ? parts[parts.length - 2] : parts[0]) || 'Dakar';
  } },
  { key: 'dateEdition', label: { fr: "Date d'édition", en: 'Issue date' }, type: 'date', default: (c) => c.today },
];

// ── Modèles ──────────────────────────────────────────────────────────────────
export const DOC_MODELES: DocModele[] = [
  {
    id: 'cdi',
    titre: { fr: 'Contrat de travail à durée indéterminée (CDI)', en: 'Permanent employment contract (CDI)' },
    description: { fr: 'Engagement permanent — Code du travail sénégalais', en: 'Permanent engagement — Senegalese Labour Code' },
    fields: [
      { key: 'poste', label: { fr: 'Poste / Fonction', en: 'Position / Role' }, default: (c) => posteDefaut(c) },
      { key: 'statutPro', label: { fr: 'Statut', en: 'Status' }, default: (c) => (c.lang === 'en' ? (c.s.cadre ? 'Manager' : 'Non-manager') : (c.s.cadre ? 'Cadre' : 'Non-cadre')) },
      { key: 'categorie', label: { fr: 'Catégorie / classification (CCNI)', en: 'Category / classification (CCNI)' }, default: () => '' },
      { key: 'dateDebut', label: { fr: 'Date de prise de fonction', en: 'Start date' }, type: 'date', default: (c) => c.s.dateEmbauche ?? c.today },
      { key: 'periodeEssai', label: { fr: "Période d'essai", en: 'Probation period' }, default: (c) => (c.lang === 'en' ? (c.s.cadre ? 'six (6) months, renewable once' : 'three (3) months, renewable once') : (c.s.cadre ? 'six (6) mois renouvelable une fois' : 'trois (3) mois renouvelable une fois')) },
      { key: 'salaire', label: { fr: 'Salaire brut mensuel', en: 'Gross monthly salary' }, type: 'number', default: (c) => String(c.s.salaireBase ?? '') },
      { key: 'primes', label: { fr: 'Primes et indemnités', en: 'Bonuses and allowances' }, default: (c) => (c.lang === 'en' ? 'seniority bonus, transport and responsibility allowances per the CCNI' : "prime d'ancienneté, indemnité de transport et de responsabilité selon la CCNI") },
      { key: 'lieuTravail', label: { fr: 'Lieu de travail', en: 'Place of work' }, default: (c) => c.c.adresse },
      { key: 'horaire', label: { fr: 'Durée hebdomadaire', en: 'Weekly hours' }, default: (c) => (c.lang === 'en' ? '40 hours' : '40 heures') },
      ...champsSignature,
    ],
    build: (ctx) => T(ctx,
`${enTeteContrat(ctx)}

Article 1 — Engagement
L'Employeur engage ${civilite(ctx)} ${nomB(ctx.s)} par contrat de travail à durée indéterminée, à compter du ${dateFr(val(ctx, 'dateDebut'))}.

Article 2 — Fonctions
Le/la Salarié(e) est engagé(e) en qualité de ${B(val(ctx, 'poste') || posteDefaut(ctx))}. Il/elle exercera ses fonctions sous l'autorité de la Direction et pourra se voir confier toute tâche connexe correspondant à sa qualification.

${articleClassification(ctx, 3)}

Article 4 — Période d'essai
Le présent contrat ne devient définitif qu'à l'issue d'une période d'essai de ${vb(ctx, 'periodeEssai', 'trois (3) mois')}, durant laquelle chacune des parties peut y mettre fin sans préavis ni indemnité, conformément au Code du travail.

Article 5 — Rémunération
En contrepartie de son travail, le/la Salarié(e) percevra un salaire brut mensuel de ${money(ctx, val(ctx, 'salaire'))}, payable à terme échu, sous déduction des cotisations sociales et fiscales en vigueur. À ce salaire de base s'ajoutent, le cas échéant, ${vb(ctx, 'primes', 'les primes et indemnités prévues par la CCNI')}.

Article 6 — Lieu et durée du travail
Le/la Salarié(e) exercera ses fonctions à ${B(val(ctx, 'lieuTravail') || ctx.c.adresse)}, pour une durée hebdomadaire de ${vb(ctx, 'horaire', '40 heures')}, selon les plannings établis par l'Employeur.

Article 7 — Congés payés
Le/la Salarié(e) bénéficie des congés payés dans les conditions fixées par le Code du travail, soit deux (2) jours ouvrables par mois de service effectif.

${articlesCommuns(ctx, 8)}`,
`${enTeteContrat(ctx)}

Article 1 — Engagement
The Employer hires ${civilite(ctx)} ${nomB(ctx.s)} on a permanent employment contract, effective ${dateFr(val(ctx, 'dateDebut'))}.

Article 2 — Duties
The Employee is hired as ${B(val(ctx, 'poste') || posteDefaut(ctx))}. He/she shall perform his/her duties under the authority of Management and may be assigned any related task matching his/her qualification.

${articleClassification(ctx, 3)}

Article 4 — Probation period
This contract becomes final only after a probation period of ${vb(ctx, 'periodeEssai', 'three (3) months')}, during which either party may terminate it without notice or indemnity, in accordance with the Labour Code.

Article 5 — Remuneration
In consideration of his/her work, the Employee shall receive a gross monthly salary of ${money(ctx, val(ctx, 'salaire'))}, payable in arrears, subject to applicable social and tax deductions. Where applicable, this base salary is supplemented by ${vb(ctx, 'primes', 'the bonuses and allowances provided by the CCNI')}.

Article 6 — Place and working hours
The Employee shall work at ${B(val(ctx, 'lieuTravail') || ctx.c.adresse)}, for a weekly duration of ${vb(ctx, 'horaire', '40 hours')}, according to the schedules set by the Employer.

Article 7 — Paid leave
The Employee is entitled to paid leave under the conditions set by the Labour Code, i.e. two (2) working days per month of effective service.

${articlesCommuns(ctx, 8)}`),
  },
  {
    id: 'cdd',
    titre: { fr: 'Contrat de travail à durée déterminée (CDD)', en: 'Fixed-term employment contract (CDD)' },
    description: { fr: 'Engagement à terme — Code du travail sénégalais', en: 'Fixed-term engagement — Senegalese Labour Code' },
    fields: [
      { key: 'poste', label: { fr: 'Poste / Fonction', en: 'Position / Role' }, default: (c) => posteDefaut(c) },
      { key: 'statutPro', label: { fr: 'Statut', en: 'Status' }, default: (c) => (c.lang === 'en' ? (c.s.cadre ? 'Manager' : 'Non-manager') : (c.s.cadre ? 'Cadre' : 'Non-cadre')) },
      { key: 'categorie', label: { fr: 'Catégorie / classification (CCNI)', en: 'Category / classification (CCNI)' }, default: () => '' },
      { key: 'dateDebut', label: { fr: 'Date de début', en: 'Start date' }, type: 'date', default: (c) => c.s.dateEmbauche ?? c.today },
      { key: 'dateFin', label: { fr: 'Date de fin', en: 'End date' }, type: 'date', default: (c) => c.s.dateFinContrat ?? '' },
      { key: 'motif', label: { fr: 'Motif du recours au CDD', en: 'Reason for the fixed term' }, default: (c) => (c.lang === 'en' ? 'a temporary increase in activity' : "surcroît temporaire d'activité") },
      { key: 'periodeEssai', label: { fr: "Période d'essai", en: 'Probation period' }, default: (c) => (c.lang === 'en' ? 'one (1) month' : 'un (1) mois') },
      { key: 'salaire', label: { fr: 'Salaire brut mensuel', en: 'Gross monthly salary' }, type: 'number', default: (c) => String(c.s.salaireBase ?? '') },
      { key: 'primes', label: { fr: 'Primes et indemnités', en: 'Bonuses and allowances' }, default: (c) => (c.lang === 'en' ? 'the allowances provided by the CCNI' : 'les indemnités prévues par la CCNI') },
      { key: 'lieuTravail', label: { fr: 'Lieu de travail', en: 'Place of work' }, default: (c) => c.c.adresse },
      ...champsSignature,
    ],
    build: (ctx) => T(ctx,
`${enTeteContrat(ctx)}

Article 1 — Objet et durée
L'Employeur engage ${civilite(ctx)} ${nomB(ctx.s)} par contrat de travail à durée déterminée, pour un motif de ${vb(ctx, 'motif', "surcroît temporaire d'activité")}, du ${dateFr(val(ctx, 'dateDebut'))} au ${dateFr(val(ctx, 'dateFin'))} inclus.

Article 2 — Fonctions
Le/la Salarié(e) est engagé(e) en qualité de ${B(val(ctx, 'poste') || posteDefaut(ctx))}, sous l'autorité de la Direction.

${articleClassification(ctx, 3)}

Article 4 — Période d'essai
Le présent contrat comporte une période d'essai de ${vb(ctx, 'periodeEssai', 'un (1) mois')}, durant laquelle chacune des parties peut y mettre fin sans préavis ni indemnité.

Article 5 — Rémunération
Le/la Salarié(e) percevra un salaire brut mensuel de ${money(ctx, val(ctx, 'salaire'))}, sous déduction des cotisations sociales et fiscales en vigueur, outre ${vb(ctx, 'primes', 'les indemnités prévues par la CCNI')}.

Article 6 — Lieu de travail
Le/la Salarié(e) exercera ses fonctions à ${B(val(ctx, 'lieuTravail') || ctx.c.adresse)}, selon les plannings établis par l'Employeur.

Article 7 — Congés payés
Le/la Salarié(e) bénéficie des congés payés au prorata de son temps de présence, conformément au Code du travail.

Article 8 — Fin du contrat
Le contrat prend fin de plein droit à l'échéance du terme fixé à l'article 1, sans préavis. Une indemnité de fin de contrat sera versée dans les conditions prévues par le Code du travail, sauf conclusion d'un contrat à durée indéterminée à l'issue du terme.

${articlesCommuns(ctx, 9)}`,
`${enTeteContrat(ctx)}

Article 1 — Purpose and term
The Employer hires ${civilite(ctx)} ${nomB(ctx.s)} on a fixed-term employment contract, on grounds of ${vb(ctx, 'motif', 'a temporary increase in activity')}, from ${dateFr(val(ctx, 'dateDebut'))} to ${dateFr(val(ctx, 'dateFin'))} inclusive.

Article 2 — Duties
The Employee is hired as ${B(val(ctx, 'poste') || posteDefaut(ctx))}, under the authority of Management.

${articleClassification(ctx, 3)}

Article 4 — Probation period
This contract includes a probation period of ${vb(ctx, 'periodeEssai', 'one (1) month')}, during which either party may terminate it without notice or indemnity.

Article 5 — Remuneration
The Employee shall receive a gross monthly salary of ${money(ctx, val(ctx, 'salaire'))}, subject to applicable social and tax deductions, in addition to ${vb(ctx, 'primes', 'the allowances provided by the CCNI')}.

Article 6 — Place of work
The Employee shall work at ${B(val(ctx, 'lieuTravail') || ctx.c.adresse)}, according to the schedules set by the Employer.

Article 7 — Paid leave
The Employee is entitled to paid leave in proportion to time worked, in accordance with the Labour Code.

Article 8 — End of contract
The contract ends automatically at the term set in Article 1, without notice. An end-of-contract indemnity shall be paid under the conditions provided by the Labour Code, unless a permanent contract is concluded at the end of the term.

${articlesCommuns(ctx, 9)}`),
  },
  {
    id: 'prestation',
    titre: { fr: 'Contrat de prestation de service', en: 'Service provision agreement' },
    description: { fr: 'Prestation indépendante — hors lien de subordination', en: 'Independent provision — no subordination link' },
    fields: [
      { key: 'objet', label: { fr: 'Objet de la prestation', en: 'Scope of the service' }, default: (c) => posteDefaut(c) },
      { key: 'dateDebut', label: { fr: 'Date de début', en: 'Start date' }, type: 'date', default: (c) => c.today },
      { key: 'dateFin', label: { fr: 'Date de fin', en: 'End date' }, type: 'date', default: (c) => c.s.dateFinContrat ?? '' },
      { key: 'honoraires', label: { fr: 'Honoraires (montant)', en: 'Fees (amount)' }, type: 'number', default: (c) => String(c.s.salaireBase ?? '') },
      { key: 'periodicite', label: { fr: 'Périodicité de facturation', en: 'Billing frequency' }, default: (c) => (c.lang === 'en' ? 'monthly, on invoice' : 'mensuelle, sur présentation de facture') },
      { key: 'lieu', label: { fr: 'Fait à', en: 'Done at' }, default: (c) => {
        const parts = (c.c.adresse || '').split(',').map((x) => x.trim()).filter(Boolean);
        return (parts.length >= 2 ? parts[parts.length - 2] : parts[0]) || 'Dakar';
      } },
      { key: 'signataire', label: { fr: "Signataire (Donneur d'ordre)", en: 'Signatory (Principal)' }, default: (c) => (c.lang === 'en' ? 'Management' : 'La Direction') },
      { key: 'qualiteSignataire', label: { fr: 'Qualité du signataire', en: 'Signatory title' }, default: (c) => (c.lang === 'en' ? 'Director' : 'Directeur/Directrice') },
      { key: 'dateEdition', label: { fr: "Date d'édition", en: 'Issue date' }, type: 'date', default: (c) => c.today },
    ],
    build: (ctx) => T(ctx,
`Entre les soussignés :

${B(ctx.c.nom)}, sis à ${B(ctx.c.adresse)}${ctx.c.ninea ? `, NINEA ${B(ctx.c.ninea)}` : ''}${ctx.c.registreCommerce ? `, RC ${B(ctx.c.registreCommerce)}` : ''}, représenté(e) par ${vb(ctx, 'signataire', 'la Direction')}, en qualité de ${vb(ctx, 'qualiteSignataire', 'Directeur/Directrice')}, ci-après désigné(e) « le Donneur d'ordre », d'une part,

Et ${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.adresse ? `, demeurant à ${B(ctx.s.adresse)}` : ''}${ctx.s.telephone ? `, téléphone ${B(ctx.s.telephone)}` : ''}, agissant en qualité de prestataire indépendant, ci-après désigné(e) « le Prestataire », d'autre part,

Il a été convenu ce qui suit :

Article 1 — Objet
Le Prestataire s'engage à réaliser, au profit du Donneur d'ordre, la prestation suivante : ${B(val(ctx, 'objet') || posteDefaut(ctx))}.

Article 2 — Nature juridique et indépendance
Le présent contrat est un contrat de prestation de service régi par le droit des obligations. Il ne crée aucun lien de subordination ni contrat de travail entre les parties. Le Prestataire exerce en toute indépendance et demeure seul responsable de ses obligations fiscales et sociales.

Article 3 — Durée
La prestation est réalisée du ${dateFr(val(ctx, 'dateDebut'))}${val(ctx, 'dateFin') ? ` au ${dateFr(val(ctx, 'dateFin'))}` : ', pour la durée nécessaire à sa bonne exécution'}.

Article 4 — Honoraires et modalités de paiement
En rémunération de sa prestation, le Prestataire percevra des honoraires de ${money(ctx, val(ctx, 'honoraires'))}, payables selon une périodicité ${vb(ctx, 'periodicite', 'mensuelle, sur présentation de facture')}. Les retenues fiscales applicables seront opérées conformément à la réglementation.

Article 5 — Obligations du Prestataire
Le Prestataire s'engage à exécuter sa mission avec diligence et professionnalisme, dans le respect des règles de l'art, de la confidentialité et du secret médical, ainsi que des consignes d'hygiène et de sécurité du site.

Article 6 — Assurances et responsabilité
Le Prestataire déclare être couvert par une assurance de responsabilité civile professionnelle et fait son affaire personnelle de toute couverture requise.

Article 7 — Résiliation
Chacune des parties peut résilier le présent contrat moyennant un préavis écrit de trente (30) jours, sans préjudice des prestations déjà exécutées et des honoraires dus.

Article 8 — Droit applicable et différends
Le présent contrat est régi par le droit sénégalais. Tout différend sera soumis, à défaut de règlement amiable, aux juridictions compétentes de Dakar.

Fait à ${vb(ctx, 'lieu', 'Dakar')}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}, en deux (2) exemplaires originaux.`,
`Between the undersigned:

${B(ctx.c.nom)}, located at ${B(ctx.c.adresse)}${ctx.c.ninea ? `, NINEA ${B(ctx.c.ninea)}` : ''}${ctx.c.registreCommerce ? `, TR ${B(ctx.c.registreCommerce)}` : ''}, represented by ${vb(ctx, 'signataire', 'Management')}, acting as ${vb(ctx, 'qualiteSignataire', 'Director')}, hereinafter "the Principal", on the one hand,

And ${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.adresse ? `, residing at ${B(ctx.s.adresse)}` : ''}${ctx.s.telephone ? `, phone ${B(ctx.s.telephone)}` : ''}, acting as an independent contractor, hereinafter "the Provider", on the other hand,

It has been agreed as follows:

Article 1 — Purpose
The Provider undertakes to perform, for the Principal, the following service: ${B(val(ctx, 'objet') || posteDefaut(ctx))}.

Article 2 — Legal nature and independence
This is a service provision agreement governed by the law of obligations. It creates no subordination link or employment contract between the parties. The Provider acts fully independently and remains solely responsible for his/her tax and social obligations.

Article 3 — Duration
The service is performed from ${dateFr(val(ctx, 'dateDebut'))}${val(ctx, 'dateFin') ? ` to ${dateFr(val(ctx, 'dateFin'))}` : ', for the time needed for its proper completion'}.

Article 4 — Fees and payment terms
In consideration of the service, the Provider shall receive fees of ${money(ctx, val(ctx, 'honoraires'))}, payable on a ${vb(ctx, 'periodicite', 'monthly, on invoice')} basis. Applicable tax withholdings shall be made in accordance with regulations.

Article 5 — Provider's obligations
The Provider undertakes to carry out the assignment with diligence and professionalism, complying with best practice, confidentiality and medical secrecy, and the site's hygiene and safety instructions.

Article 6 — Insurance and liability
The Provider declares to hold professional civil liability insurance and is personally responsible for any required cover.

Article 7 — Termination
Either party may terminate this contract with thirty (30) days' written notice, without prejudice to services already performed and fees due.

Article 8 — Governing law and disputes
This contract is governed by Senegalese law. Any dispute shall, failing amicable settlement, be submitted to the competent courts of Dakar.

Done at ${vb(ctx, 'lieu', 'Dakar')}, on ${dateFr(val(ctx, 'dateEdition') || ctx.today)}, in two (2) original copies.`),
  },
  {
    id: 'attestation_travail',
    titre: { fr: 'Attestation de travail', en: 'Certificate of employment' },
    description: { fr: "Atteste l'emploi en cours d'un salarié", en: "Attests an employee's current employment" },
    fields: [
      { key: 'poste', label: { fr: 'Poste / Fonction', en: 'Position / Role' }, default: (c) => posteDefaut(c) },
      { key: 'depuis', label: { fr: 'En poste depuis', en: 'Employed since' }, type: 'date', default: (c) => c.s.dateEmbauche ?? '' },
      { key: 'usage', label: { fr: 'Destinée à (usage)', en: 'Purpose' }, default: (c) => (c.lang === 'en' ? 'all legal purposes' : 'servir et valoir ce que de droit') },
      ...champsSignature,
    ],
    build: (ctx) => T(ctx,
`Je soussigné(e), ${vb(ctx, 'signataire', 'la Direction')}, agissant en qualité de ${vb(ctx, 'qualiteSignataire', 'Directeur/Directrice')} de ${B(ctx.c.nom)}, atteste que :

${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.code ? ` (matricule ${B(ctx.s.code)})` : ''}, né(e) le ${dateFr(ctx.s.dateNaissance)}, est employé(e) au sein de notre établissement en qualité de ${B(val(ctx, 'poste') || posteDefaut(ctx))}, depuis le ${dateFr(val(ctx, 'depuis'))}.

L'intéressé(e) fait toujours partie de nos effectifs à ce jour.

La présente attestation est délivrée à l'intéressé(e) pour ${vb(ctx, 'usage', 'servir et valoir ce que de droit')}.

Fait à ${vb(ctx, 'lieu', 'Dakar')}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`,
`I, the undersigned, ${vb(ctx, 'signataire', 'Management')}, acting as ${vb(ctx, 'qualiteSignataire', 'Director')} of ${B(ctx.c.nom)}, hereby certify that:

${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.code ? ` (ID ${B(ctx.s.code)})` : ''}, born on ${dateFr(ctx.s.dateNaissance)}, is employed in our establishment as ${B(val(ctx, 'poste') || posteDefaut(ctx))}, since ${dateFr(val(ctx, 'depuis'))}.

The person concerned is still part of our workforce as of today.

This certificate is issued for ${vb(ctx, 'usage', 'all legal purposes')}.

Done at ${vb(ctx, 'lieu', 'Dakar')}, on ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`),
  },
  {
    id: 'certificat_travail',
    titre: { fr: 'Certificat de travail', en: 'Work certificate (end of contract)' },
    description: { fr: 'Délivré en fin de contrat (art. L.63 Code du travail)', en: 'Issued at end of contract (art. L.63 Labour Code)' },
    fields: [
      { key: 'poste', label: { fr: 'Emploi occupé', en: 'Position held' }, default: (c) => posteDefaut(c) },
      { key: 'dateDebut', label: { fr: "Date d'entrée", en: 'Start date' }, type: 'date', default: (c) => c.s.dateEmbauche ?? '' },
      { key: 'dateFin', label: { fr: 'Date de sortie', en: 'End date' }, type: 'date', default: (c) => c.s.dateFinContrat ?? c.today },
      ...champsSignature,
    ],
    build: (ctx) => T(ctx,
`Je soussigné(e), ${vb(ctx, 'signataire', 'la Direction')}, ${vb(ctx, 'qualiteSignataire', 'Directeur/Directrice')} de ${B(ctx.c.nom)}, sis à ${B(ctx.c.adresse)}, certifie que :

${civilite(ctx)} ${nomB(ctx.s)}, né(e) le ${dateFr(ctx.s.dateNaissance)}, a été employé(e) dans notre établissement du ${dateFr(val(ctx, 'dateDebut'))} au ${dateFr(val(ctx, 'dateFin'))}, en qualité de ${B(val(ctx, 'poste') || posteDefaut(ctx))}.

Conformément à l'article L.63 du Code du travail, le/la Salarié(e) quitte l'établissement libre de tout engagement.

En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.

Fait à ${vb(ctx, 'lieu', 'Dakar')}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`,
`I, the undersigned, ${vb(ctx, 'signataire', 'Management')}, ${vb(ctx, 'qualiteSignataire', 'Director')} of ${B(ctx.c.nom)}, located at ${B(ctx.c.adresse)}, hereby certify that:

${civilite(ctx)} ${nomB(ctx.s)}, born on ${dateFr(ctx.s.dateNaissance)}, was employed in our establishment from ${dateFr(val(ctx, 'dateDebut'))} to ${dateFr(val(ctx, 'dateFin'))}, as ${B(val(ctx, 'poste') || posteDefaut(ctx))}.

In accordance with article L.63 of the Labour Code, the Employee leaves the establishment free of any commitment.

In witness whereof, this certificate is issued for all legal purposes.

Done at ${vb(ctx, 'lieu', 'Dakar')}, on ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`),
  },
  {
    id: 'attestation_salaire',
    titre: { fr: 'Attestation de salaire', en: 'Salary certificate' },
    description: { fr: 'Justificatif de revenu (banque, bailleur, organisme)', en: 'Income proof (bank, landlord, institution)' },
    fields: [
      { key: 'poste', label: { fr: 'Poste / Fonction', en: 'Position / Role' }, default: (c) => posteDefaut(c) },
      { key: 'salaire', label: { fr: 'Salaire brut mensuel', en: 'Gross monthly salary' }, type: 'number', default: (c) => String(c.s.salaireBase ?? '') },
      { key: 'depuis', label: { fr: 'En poste depuis', en: 'Employed since' }, type: 'date', default: (c) => c.s.dateEmbauche ?? '' },
      { key: 'destinataire', label: { fr: "À l'attention de", en: 'To the attention of' }, default: (c) => (c.lang === 'en' ? 'the relevant institution' : "l'organisme concerné") },
      ...champsSignature,
    ],
    build: (ctx) => T(ctx,
`Je soussigné(e), ${vb(ctx, 'signataire', 'la Direction')}, ${vb(ctx, 'qualiteSignataire', 'Directeur/Directrice')} de ${B(ctx.c.nom)}, atteste que :

${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.code ? ` (matricule ${B(ctx.s.code)})` : ''} est employé(e) dans notre établissement depuis le ${dateFr(val(ctx, 'depuis'))} en qualité de ${B(val(ctx, 'poste') || posteDefaut(ctx))}.

À ce titre, il/elle perçoit une rémunération brute mensuelle de ${money(ctx, val(ctx, 'salaire'))}.

La présente attestation est établie à l'attention de ${vb(ctx, 'destinataire', "l'organisme concerné")}, pour servir et valoir ce que de droit.

Fait à ${vb(ctx, 'lieu', 'Dakar')}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`,
`I, the undersigned, ${vb(ctx, 'signataire', 'Management')}, ${vb(ctx, 'qualiteSignataire', 'Director')} of ${B(ctx.c.nom)}, hereby certify that:

${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.code ? ` (ID ${B(ctx.s.code)})` : ''} has been employed in our establishment since ${dateFr(val(ctx, 'depuis'))} as ${B(val(ctx, 'poste') || posteDefaut(ctx))}.

As such, he/she receives a gross monthly remuneration of ${money(ctx, val(ctx, 'salaire'))}.

This certificate is issued to the attention of ${vb(ctx, 'destinataire', 'the relevant institution')}, for all legal purposes.

Done at ${vb(ctx, 'lieu', 'Dakar')}, on ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`),
  },
  {
    id: 'autorisation_absence',
    titre: { fr: "Autorisation d'absence", en: 'Leave authorization' },
    description: { fr: 'Congé, permission ou absence exceptionnelle', en: 'Leave, permission or exceptional absence' },
    fields: [
      { key: 'poste', label: { fr: 'Poste / Fonction', en: 'Position / Role' }, default: (c) => posteDefaut(c) },
      { key: 'motif', label: { fr: "Motif de l'absence", en: 'Reason for absence' }, default: (c) => c.s.absenceMotif || (c.lang === 'en' ? 'annual leave' : 'congé annuel') },
      { key: 'dateDebut', label: { fr: 'Absent(e) à partir du', en: 'Absent from' }, type: 'date', default: (c) => c.s.absenceDebut ?? '' },
      { key: 'dateRetour', label: { fr: 'Reprise le', en: 'Return on' }, type: 'date', default: (c) => c.s.absenceRetour ?? '' },
      ...champsSignature,
    ],
    build: (ctx) => T(ctx,
`Je soussigné(e), ${vb(ctx, 'signataire', 'la Direction')}, ${vb(ctx, 'qualiteSignataire', 'Directeur/Directrice')} de ${B(ctx.c.nom)}, autorise :

${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.code ? ` (matricule ${B(ctx.s.code)})` : ''}, ${B(val(ctx, 'poste') || posteDefaut(ctx))}, à s'absenter de son poste pour le motif suivant : ${vb(ctx, 'motif', 'congé annuel')}.

Cette absence court du ${dateFr(val(ctx, 'dateDebut'))} au ${dateFr(val(ctx, 'dateRetour'))} inclus, la reprise du service étant fixée au lendemain de cette dernière date.

La présente autorisation est délivrée pour servir et valoir ce que de droit.

Fait à ${vb(ctx, 'lieu', 'Dakar')}, le ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`,
`I, the undersigned, ${vb(ctx, 'signataire', 'Management')}, ${vb(ctx, 'qualiteSignataire', 'Director')} of ${B(ctx.c.nom)}, authorize:

${civilite(ctx)} ${nomB(ctx.s)}${ctx.s.code ? ` (ID ${B(ctx.s.code)})` : ''}, ${B(val(ctx, 'poste') || posteDefaut(ctx))}, to be absent from his/her post for the following reason: ${vb(ctx, 'motif', 'annual leave')}.

This absence runs from ${dateFr(val(ctx, 'dateDebut'))} to ${dateFr(val(ctx, 'dateRetour'))} inclusive, with return to service set for the day after that latter date.

This authorization is issued for all legal purposes.

Done at ${vb(ctx, 'lieu', 'Dakar')}, on ${dateFr(val(ctx, 'dateEdition') || ctx.today)}.`),
  },
];

/** Libellés des blocs de signature selon le modèle et la langue. */
export function signaturesFor(modeleId: string, lang: Lang = 'fr'): string[] {
  const en = lang === 'en';
  if (modeleId === 'cdi' || modeleId === 'cdd') return [en ? 'For the Employer' : "Pour l'Employeur", en ? 'The Employee' : 'Le/la Salarié(e)'];
  if (modeleId === 'prestation') return [en ? 'For the Principal' : "Pour le Donneur d'ordre", en ? 'The Provider' : 'Le Prestataire'];
  return [en ? 'For the Employer' : "Pour l'Employeur"];
}

/** Construit les valeurs par défaut des champs pour un modèle et un contexte. */
export function defaultFieldValues(modele: DocModele, ctx: Omit<DocCtx, 'v'>): Record<string, string> {
  const base: DocCtx = { ...ctx, v: {} };
  const out: Record<string, string> = {};
  for (const f of modele.fields) out[f.key] = f.default ? f.default(base) : '';
  return out;
}
