// ─── Domain model — ClinikDia (ERP clinique d'hémodialyse) ──────────────────

export type Sexe = 'M' | 'F';

export type StatutPatient = 'actif' | 'transplante' | 'transfere' | 'decede' | 'suspendu';

export type AbordVasculaire = 'FAV' | 'catheter_tunnelise' | 'catheter_temporaire' | 'pontage';

export type Serologie = 'negatif' | 'positif' | 'inconnu';

export type PriseEnCharge = 'IPRES' | 'assurance_privee' | 'mutuelle' | 'cmu' | 'payant';

export type SituationFamiliale = 'marie' | 'celibataire' | 'veuf' | 'divorce';

export interface Patient {
  id: string;
  code: string; // ex: PAT-0001
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string; // ISO
  lieuNaissance?: string;
  taille?: number; // cm
  situationFamiliale?: SituationFamiliale;
  telephone: string;
  adresse: string;
  nationalite?: string;
  numCNI?: string; // n° carte nationale d'identité
  contactUrgence?: { nom: string; telephone: string };
  groupeSanguin: string;
  statut: StatutPatient;
  // Abord vasculaire
  abord: AbordVasculaire;
  abordDatePose?: string; // KT : date de la pose
  abordDateConfection?: string; // FAV : date de confection
  abordDatePremierePonction?: string; // FAV : 1ère ponction
  // Prise en charge & parcours
  nephrologueId: string;
  priseEnCharge: PriseEnCharge;
  // Répartition des prises en charge (ex : IPRES 80 % + patient 20 %)
  prisesEnCharge?: { type: PriseEnCharge; pourcentage: number }[];
  numAssurance?: string;
  centreOrigine?: string;
  // Sérologies & vaccination
  serologies: {
    vhb: Serologie;
    vhc: Serologie;
    vih: Serologie;
  };
  vaccinationVHB?: boolean;
  allergies?: string;
  antecedents: string[];
  nephropathie: string; // maladie causale
  dateDebutDialyse: string; // 1ère séance de dialyse (n'importe où)
  datePremiereDialyseCentre?: string; // 1ère séance dans le centre
  // Dialyse
  dialyseurType?: string;
  dialyseurSurface?: string; // ex: 1.8 m²
  anticoagulant?: string;
  frequenceHebdo: number; // séances / semaine (souvent 3)
  poidsSec: number; // kg
  notes?: string;
  createdAt: string;
}

export type RoleStaff = 'nephrologue' | 'infirmier' | 'technicien' | 'aide_soignant' | 'admin';

export type TypeContrat = 'CDI' | 'CDD' | 'stage' | 'vacation' | 'prestation';

/** Statut de présence d'un employé. */
export type StatutPresence = 'present' | 'conge' | 'maladie' | 'autre';

export interface ContactUrgence {
  nom: string;
  lien: string; // conjoint, parent, ami…
  telephone: string;
}

export interface StaffDocument {
  id: string;
  type: string; // Contrat, CNI, Diplôme, Visite médicale…
  nom: string;
  dateAjout: string;
  mime?: string; // type MIME du fichier
  taille?: number; // octets
  dataUrl?: string; // contenu encodé (base64)
}

export interface Staff {
  id: string;
  code: string;
  nom: string;
  prenom: string;
  role: RoleStaff;
  telephone: string;
  email: string;
  specialite?: string;
  actif: boolean;
  // RH / GRH
  adresse?: string;
  dateNaissance?: string;
  dateEmbauche?: string;
  typeContrat?: TypeContrat;
  dateFinContrat?: string;
  salaireBase?: number; // FCFA / mois
  cadre?: boolean; // statut cadre (régime complémentaire IPRES, paie)
  alerteContratJours?: number; // alerte N jours avant la fin du contrat (défaut 30)
  contactsUrgence?: ContactUrgence[];
  documents?: StaffDocument[];
  // Présence / absence
  statutPresence?: StatutPresence; // présent par défaut
  absenceDebut?: string; // date de début (congé / maladie / autre)
  absenceRetour?: string; // date de retour prévue
  absenceMotif?: string; // précision (congé annuel, maladie, formation…)
}

export type StatutMachine = 'operationnel' | 'maintenance' | 'desinfection' | 'hors_service';

export interface Machine {
  id: string;
  code: string; // GEN-01
  modele: string;
  marque: string;
  numeroSerie: string;
  poste: number; // numéro de poste dans la salle
  statut: StatutMachine;
  dateMiseEnService: string;
  heuresFonctionnement: number;
  derniereDesinfection: string;
  prochaineMaintenance: string; // ISO
}

export type StatutMaintenance = 'planifiee' | 'en_cours' | 'terminee';
export type TypeMaintenance = 'preventive' | 'corrective' | 'desinfection';

export interface Maintenance {
  id: string;
  machineId: string;
  type: TypeMaintenance;
  date: string;
  description: string;
  technicienId: string;
  statut: StatutMaintenance;
  cout: number;
}

export type Creneau = 'matin' | 'apresmidi' | 'soir';

export type StatutSeance = 'planifiee' | 'en_cours' | 'terminee' | 'absente' | 'annulee';

export interface Seance {
  id: string;
  patientId: string;
  machineId: string;
  date: string; // ISO date (yyyy-mm-dd)
  creneau: Creneau;
  infirmierId: string;
  statut: StatutSeance;
  poidsAvant?: number;
  poidsApres?: number;
  taSystoliqueAvant?: number;
  taDiastoliqueAvant?: number;
  taSystoliqueApres?: number;
  taDiastoliqueApres?: number;
  dureeMinutes: number;
  debitSang?: number; // ml/min
  ufTotal?: number; // ultrafiltration en litres
  ktv?: number; // adéquation de dialyse
  anticoagulation?: string;
  incidents?: string;
  factureId?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  nephrologueId: string;
  date: string;
  dureeSeance: number; // minutes
  frequenceHebdo: number;
  dialyseur: string;
  debitSang: number; // ml/min
  debitDialysat: number; // ml/min
  anticoagulation: string;
  bainDialyse: string;
  medicaments: { nom: string; posologie: string }[];
  active: boolean;
}

export type CategorieStock = 'dialyseur' | 'ligne' | 'aiguille' | 'concentre' | 'medicament' | 'consommable';

export interface ArticleStock {
  id: string;
  code: string;
  designation: string;
  categorie: CategorieStock;
  unite: string;
  quantite: number;
  seuilAlerte: number;
  prixUnitaire: number;
  fournisseur: string;
}

export type TypeMouvement = 'entree' | 'sortie';

export interface MouvementStock {
  id: string;
  articleId: string;
  type: TypeMouvement;
  quantite: number;
  date: string;
  motif: string;
}

export type StatutFacture = 'brouillon' | 'emise' | 'payee' | 'partielle' | 'impayee';

export interface LigneFacture {
  designation: string;
  quantite: number;
  prixUnitaire: number;
}

export interface Facture {
  id: string;
  numero: string;
  patientId: string;
  date: string;
  lignes: LigneFacture[];
  montantTotal: number;
  montantPaye: number;
  priseEnCharge: PriseEnCharge;
  partAssurance: number; // %
  statut: StatutFacture;
  proforma?: boolean; // facture pro forma (devis — sans valeur comptable)
}

export type Lang = 'fr' | 'en';

export interface ClinicSettings {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  nbPostes: number;
  tarifSeance: number;
  devise: string;
  langue?: Lang;
  // Identité légale & branding (affichés sur la facture)
  logoUrl?: string;
  ninea?: string;
  registreCommerce?: string;
  mentionsLegales?: string;
}

// ─── Comptes utilisateurs & contrôle d'accès (RBAC) ─────────────────────────
export type ModuleKey =
  | 'dashboard'
  | 'patients'
  | 'planning'
  | 'calendrier'
  | 'machines'
  | 'prescriptions'
  | 'grh'
  | 'personnel'
  | 'stock'
  | 'facturation'
  | 'paie'
  | 'depenses'
  | 'qhse'
  | 'chat'
  | 'reporting'
  | 'archives'
  | 'comptes'
  | 'parametres';

export type RoleUser = 'admin' | 'utilisateur';

export interface ModulePermission {
  access: boolean; // peut consulter le module (visible dans le menu)
  write: boolean; // peut créer / modifier
  delete: boolean; // peut supprimer
}

export type Permissions = Record<ModuleKey, ModulePermission>;

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: RoleUser;
  staffId?: string;
  actif: boolean;
  permissions: Permissions;
  derniereConnexion?: string;
  createdAt: string;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'access';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  module: string;
  detail: string;
  timestamp: string;
}

// ─── Chat interne ───────────────────────────────────────────────────────────
export interface Channel {
  id: string;
  label: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  channel: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: string;
  reactions?: Record<string, string[]>; // emoji -> userIds
}

// ─── QHSE — conformités ─────────────────────────────────────────────────────
export type StatutConformite = 'conforme' | 'a_controler' | 'non_conforme';

export interface Extincteur {
  id: string;
  code: string;
  type: string; // CO2, Poudre ABC, Eau pulvérisée…
  capacite: string; // 6 kg, 9 L…
  emplacement: string;
  dateInstallation: string;
  dateDernierControle: string;
  dateProchainControle: string;
  statut: StatutConformite;
}

export type DomaineQHSE =
  | 'eau'
  | 'durete_eau'
  | 'electricite'
  | 'dechets'
  | 'hygiene'
  | 'equipement'
  | 'incendie'
  | 'autre';

export type StatutCertification = 'valide' | 'en_cours' | 'expiree';

export interface Certification {
  id: string;
  nom: string; // ISO 9001, agrément sanitaire…
  organisme: string; // organisme certificateur
  numero?: string; // n° / référence
  dateObtention: string;
  dateExpiration: string;
  statut: StatutCertification;
  observations?: string;
}

export interface Controle {
  id: string;
  code: string;
  domaine: DomaineQHSE;
  libelle: string;
  responsableId?: string;
  periodicite: string; // Mensuel, Trimestriel, Annuel…
  dateDernierControle: string;
  dateProchainControle: string;
  statut: StatutConformite;
  observations?: string;
}

// ─── Finances — dépenses ────────────────────────────────────────────────────
export type CategorieDepense =
  | 'consommables'
  | 'maintenance'
  | 'salaires'
  | 'loyer'
  | 'energie'
  | 'eau'
  | 'fournitures'
  | 'autre';

export type StatutDepense = 'payee' | 'en_attente' | 'rejetee';

export type MoyenPaiement = 'Virement' | 'Chèque' | 'Espèces' | 'Prélèvement' | 'Mobile money';

export interface Depense {
  id: string;
  code: string;
  date: string;
  categorie: CategorieDepense;
  libelle: string;
  montant: number;
  fournisseur: string;
  moyenPaiement: string;
  statut: StatutDepense;
  // Détails selon le moyen de paiement
  banque?: string; // virement / chèque
  referenceVirement?: string; // virement : référence / IBAN
  numeroCheque?: string; // chèque
  recuPar?: string; // espèces : bénéficiaire / n° de reçu
  // Justificatif joint (facture fournisseur, reçu…)
  justificatif?: { nom: string; mime?: string; taille?: number; dataUrl: string };
}

// ─── Exercice / clôture annuelle ─────────────────────────────────────────────
export interface Archive {
  year: number;
  closedAt: string;
  seances: Seance[];
  factures: Facture[];
  depenses: Depense[];
  mouvementsStock: MouvementStock[];
}
