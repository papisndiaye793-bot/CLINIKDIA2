import { useStore } from '@/store/useStore';
import type {
  StatutPatient,
  AbordVasculaire,
  PriseEnCharge,
  RoleStaff,
  StatutMachine,
  StatutSeance,
  Creneau,
  StatutMaintenance,
  TypeMaintenance,
  CategorieStock,
  StatutFacture,
  Serologie,
  SituationFamiliale,
  TypeContrat,
  RoleUser,
  AuditAction,
  StatutConformite,
  DomaineQHSE,
  StatutCertification,
  CategorieDepense,
  StatutDepense,
  StatutPresence,
  Lang,
} from '@/types';

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple' | 'teal';
type Toned = { fr: string; en: string; tone: Tone };
type Bi = { fr: string; en: string };

// ─── Données bilingues ──────────────────────────────────────────────────────
const T = {
  statutPatient: {
    actif: { fr: 'Actif', en: 'Active', tone: 'green' },
    transplante: { fr: 'Transplanté', en: 'Transplanted', tone: 'purple' },
    transfere: { fr: 'Transféré', en: 'Transferred', tone: 'blue' },
    decede: { fr: 'Décédé', en: 'Deceased', tone: 'slate' },
    suspendu: { fr: 'Suspendu', en: 'Suspended', tone: 'amber' },
  } as Record<StatutPatient, Toned>,
  roleLabel: {
    nephrologue: { fr: 'Néphrologue', en: 'Nephrologist', tone: 'purple' },
    infirmier: { fr: 'Infirmier(ère)', en: 'Nurse', tone: 'blue' },
    technicien: { fr: 'Technicien biomédical', en: 'Biomedical technician', tone: 'teal' },
    aide_soignant: { fr: 'Aide-soignant(e)', en: 'Care assistant', tone: 'slate' },
    admin: { fr: 'Administration', en: 'Administration', tone: 'amber' },
  } as Record<RoleStaff, Toned>,
  statutMachine: {
    operationnel: { fr: 'Opérationnel', en: 'Operational', tone: 'green' },
    maintenance: { fr: 'En maintenance', en: 'Under maintenance', tone: 'amber' },
    desinfection: { fr: 'Désinfection', en: 'Disinfection', tone: 'blue' },
    hors_service: { fr: 'Hors service', en: 'Out of service', tone: 'red' },
  } as Record<StatutMachine, Toned>,
  statutSeance: {
    planifiee: { fr: 'Planifiée', en: 'Scheduled', tone: 'slate' },
    en_cours: { fr: 'En cours', en: 'In progress', tone: 'blue' },
    terminee: { fr: 'Terminée', en: 'Completed', tone: 'green' },
    absente: { fr: 'Absent', en: 'Absent', tone: 'amber' },
    annulee: { fr: 'Annulée', en: 'Cancelled', tone: 'red' },
  } as Record<StatutSeance, Toned>,
  statutMaintenance: {
    planifiee: { fr: 'Planifiée', en: 'Scheduled', tone: 'slate' },
    en_cours: { fr: 'En cours', en: 'In progress', tone: 'amber' },
    terminee: { fr: 'Terminée', en: 'Completed', tone: 'green' },
  } as Record<StatutMaintenance, Toned>,
  typeMaintenance: {
    preventive: { fr: 'Préventive', en: 'Preventive', tone: 'blue' },
    corrective: { fr: 'Corrective', en: 'Corrective', tone: 'red' },
    desinfection: { fr: 'Désinfection', en: 'Disinfection', tone: 'teal' },
  } as Record<TypeMaintenance, Toned>,
  statutFacture: {
    brouillon: { fr: 'Brouillon', en: 'Draft', tone: 'slate' },
    emise: { fr: 'Émise', en: 'Issued', tone: 'blue' },
    payee: { fr: 'Payée', en: 'Paid', tone: 'green' },
    partielle: { fr: 'Partielle', en: 'Partial', tone: 'amber' },
    impayee: { fr: 'Impayée', en: 'Unpaid', tone: 'red' },
  } as Record<StatutFacture, Toned>,
  typeContratLabel: {
    CDI: { fr: 'CDI', en: 'Permanent', tone: 'green' },
    CDD: { fr: 'CDD', en: 'Fixed-term', tone: 'blue' },
    stage: { fr: 'Stage', en: 'Internship', tone: 'purple' },
    vacation: { fr: 'Vacation', en: 'Temp', tone: 'amber' },
    prestation: { fr: 'Prestation', en: 'Contractor', tone: 'teal' },
  } as Record<TypeContrat, Toned>,
  roleUserLabel: {
    admin: { fr: 'Administrateur', en: 'Administrator', tone: 'purple' },
    utilisateur: { fr: 'Utilisateur', en: 'User', tone: 'slate' },
  } as Record<RoleUser, Toned>,
  auditActionLabel: {
    create: { fr: 'Création', en: 'Create', tone: 'green' },
    update: { fr: 'Modification', en: 'Update', tone: 'blue' },
    delete: { fr: 'Suppression', en: 'Delete', tone: 'red' },
    login: { fr: 'Connexion', en: 'Login', tone: 'teal' },
    logout: { fr: 'Déconnexion', en: 'Logout', tone: 'slate' },
    access: { fr: 'Consultation', en: 'View', tone: 'slate' },
  } as Record<AuditAction, Toned>,
  statutConformite: {
    conforme: { fr: 'Conforme', en: 'Compliant', tone: 'green' },
    a_controler: { fr: 'À contrôler', en: 'To check', tone: 'amber' },
    non_conforme: { fr: 'Non conforme', en: 'Non-compliant', tone: 'red' },
  } as Record<StatutConformite, Toned>,
  domaineQHSELabel: {
    eau: { fr: "Traitement d'eau", en: 'Water treatment', tone: 'blue' },
    durete_eau: { fr: "Test de dureté de l'eau", en: 'Water hardness test', tone: 'blue' },
    electricite: { fr: 'Électricité', en: 'Electricity', tone: 'amber' },
    dechets: { fr: 'Déchets (DASRI)', en: 'Waste (medical)', tone: 'purple' },
    hygiene: { fr: 'Hygiène & désinfection', en: 'Hygiene & disinfection', tone: 'teal' },
    equipement: { fr: 'Équipements', en: 'Equipment', tone: 'slate' },
    incendie: { fr: 'Sécurité incendie', en: 'Fire safety', tone: 'red' },
    autre: { fr: 'Autre', en: 'Other', tone: 'slate' },
  } as Record<DomaineQHSE, Toned>,
  statutDepense: {
    payee: { fr: 'Payée', en: 'Paid', tone: 'green' },
    en_attente: { fr: 'En attente', en: 'Pending', tone: 'amber' },
    rejetee: { fr: 'Rejetée', en: 'Rejected', tone: 'red' },
  } as Record<StatutDepense, Toned>,
  statutCertification: {
    valide: { fr: 'Valide', en: 'Valid', tone: 'green' },
    en_cours: { fr: 'En cours', en: 'In progress', tone: 'amber' },
    expiree: { fr: 'Expirée', en: 'Expired', tone: 'red' },
  } as Record<StatutCertification, Toned>,
  statutPresence: {
    present: { fr: 'En poste', en: 'On duty', tone: 'green' },
    conge: { fr: 'En congé', en: 'On leave', tone: 'blue' },
    maladie: { fr: 'En maladie', en: 'Sick leave', tone: 'amber' },
    autre: { fr: 'Absent (autre)', en: 'Absent (other)', tone: 'slate' },
  } as Record<StatutPresence, Toned>,
};

const P = {
  abordLabel: {
    FAV: { fr: 'Fistule artério-veineuse', en: 'Arteriovenous fistula' },
    catheter_tunnelise: { fr: 'Cathéter tunnelisé', en: 'Tunneled catheter' },
    catheter_temporaire: { fr: 'Cathéter temporaire', en: 'Temporary catheter' },
    pontage: { fr: 'Pontage', en: 'Graft' },
  } as Record<AbordVasculaire, Bi>,
  priseEnChargeLabel: {
    IPRES: { fr: 'IPRES', en: 'IPRES' },
    assurance_privee: { fr: 'Assurance privée', en: 'Private insurance' },
    mutuelle: { fr: 'Mutuelle de santé', en: 'Health mutual' },
    cmu: { fr: 'CMU', en: 'Universal coverage' },
    payant: { fr: 'Payant', en: 'Self-pay' },
  } as Record<PriseEnCharge, Bi>,
  creneauLabel: {
    matin: { fr: 'Matin (07h–11h)', en: 'Morning (7–11am)' },
    apresmidi: { fr: 'Après-midi (12h–16h)', en: 'Afternoon (12–4pm)' },
    soir: { fr: 'Soir (17h–21h)', en: 'Evening (5–9pm)' },
  } as Record<Creneau, Bi>,
  categorieStock: {
    dialyseur: { fr: 'Dialyseur', en: 'Dialyzer' },
    ligne: { fr: 'Lignes', en: 'Tubing lines' },
    aiguille: { fr: 'Aiguilles', en: 'Needles' },
    concentre: { fr: 'Concentré', en: 'Concentrate' },
    medicament: { fr: 'Médicament', en: 'Medication' },
    consommable: { fr: 'Consommable', en: 'Consumable' },
  } as Record<CategorieStock, Bi>,
  categorieDepenseLabel: {
    consommables: { fr: 'Consommables', en: 'Consumables' },
    maintenance: { fr: 'Maintenance', en: 'Maintenance' },
    salaires: { fr: 'Salaires', en: 'Salaries' },
    loyer: { fr: 'Loyer', en: 'Rent' },
    energie: { fr: 'Électricité', en: 'Electricity' },
    eau: { fr: 'Eau', en: 'Water' },
    fournitures: { fr: 'Fournitures', en: 'Supplies' },
    autre: { fr: 'Autre', en: 'Other' },
  } as Record<CategorieDepense, Bi>,
  situationFamilialeLabel: {
    marie: { fr: 'Marié(e)', en: 'Married' },
    celibataire: { fr: 'Célibataire', en: 'Single' },
    veuf: { fr: 'Veuf(ve)', en: 'Widowed' },
    divorce: { fr: 'Divorcé(e)', en: 'Divorced' },
  } as Record<SituationFamiliale, Bi>,
};

// ─── Résolveurs ─────────────────────────────────────────────────────────────
function resolveToned<K extends string>(map: Record<K, Toned>, lang: Lang) {
  const out = {} as Record<K, { label: string; tone: Tone }>;
  (Object.keys(map) as K[]).forEach((k) => {
    out[k] = { label: map[k][lang], tone: map[k].tone };
  });
  return out;
}
function resolvePlain<K extends string>(map: Record<K, Bi>, lang: Lang) {
  const out = {} as Record<K, string>;
  (Object.keys(map) as K[]).forEach((k) => {
    out[k] = map[k][lang];
  });
  return out;
}

function build(lang: Lang) {
  return {
    statutPatient: resolveToned(T.statutPatient, lang),
    roleLabel: resolveToned(T.roleLabel, lang),
    statutMachine: resolveToned(T.statutMachine, lang),
    statutSeance: resolveToned(T.statutSeance, lang),
    statutMaintenance: resolveToned(T.statutMaintenance, lang),
    typeMaintenance: resolveToned(T.typeMaintenance, lang),
    statutFacture: resolveToned(T.statutFacture, lang),
    typeContratLabel: resolveToned(T.typeContratLabel, lang),
    roleUserLabel: resolveToned(T.roleUserLabel, lang),
    auditActionLabel: resolveToned(T.auditActionLabel, lang),
    statutConformite: resolveToned(T.statutConformite, lang),
    domaineQHSELabel: resolveToned(T.domaineQHSELabel, lang),
    statutDepense: resolveToned(T.statutDepense, lang),
    statutCertification: resolveToned(T.statutCertification, lang),
    statutPresence: resolveToned(T.statutPresence, lang),
    abordLabel: resolvePlain(P.abordLabel, lang),
    priseEnChargeLabel: resolvePlain(P.priseEnChargeLabel, lang),
    creneauLabel: resolvePlain(P.creneauLabel, lang),
    categorieStock: resolvePlain(P.categorieStock, lang),
    categorieDepenseLabel: resolvePlain(P.categorieDepenseLabel, lang),
    situationFamilialeLabel: resolvePlain(P.situationFamilialeLabel, lang),
  };
}

const FR = build('fr');
const EN = build('en');

/** Libellés résolus dans une langue donnée (hors composant React). */
export const labelsFor = (lang: Lang) => (lang === 'en' ? EN : FR);
export const roleLabelFor = (lang: Lang) => labelsFor(lang).roleLabel;

/** Hook réactif : libellés résolus dans la langue courante. */
export function useLabels() {
  const lang = (useStore((s) => s.settings.langue) ?? 'fr') as Lang;
  return lang === 'en' ? EN : FR;
}

// ─── Exports statiques (français) — rétro-compatibilité ─────────────────────
export const statutPatient = FR.statutPatient;
export const roleLabel = FR.roleLabel;
export const statutMachine = FR.statutMachine;
export const statutSeance = FR.statutSeance;
export const statutMaintenance = FR.statutMaintenance;
export const typeMaintenance = FR.typeMaintenance;
export const statutFacture = FR.statutFacture;
export const typeContratLabel = FR.typeContratLabel;
export const roleUserLabel = FR.roleUserLabel;
export const auditActionLabel = FR.auditActionLabel;
export const statutConformite = FR.statutConformite;
export const domaineQHSELabel = FR.domaineQHSELabel;
export const statutDepense = FR.statutDepense;
export const statutPresence = FR.statutPresence;
export const abordLabel = FR.abordLabel;
export const priseEnChargeLabel = FR.priseEnChargeLabel;
export const creneauLabel = FR.creneauLabel;
export const categorieStock = FR.categorieStock;
export const categorieDepenseLabel = FR.categorieDepenseLabel;
export const situationFamilialeLabel = FR.situationFamilialeLabel;

export const serologieTone: Record<Serologie, Tone> = {
  negatif: 'green',
  positif: 'red',
  inconnu: 'slate',
};
