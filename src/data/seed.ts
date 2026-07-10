import type {
  Patient,
  Staff,
  Machine,
  Maintenance,
  Seance,
  Prescription,
  ArticleStock,
  MouvementStock,
  Facture,
  ClinicSettings,
  Creneau,
  User,
  AuditLog,
  Channel,
  ChatMessage,
  Extincteur,
  Controle,
  Certification,
  Depense,
} from '@/types';
import { defaultPermissions } from '@/lib/permissions';

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const settings: ClinicSettings = {
  nom: 'Clinique ClinikDia',
  adresse: 'Sicap Liberté 6, Dakar, Sénégal',
  telephone: '+221 33 824 00 00',
  email: 'contact@clinikdia.sn',
  nbPostes: 12,
  tarifSeance: 35000,
  devise: 'FCFA',
  langue: 'fr',
  logoUrl: '',
  ninea: '0071234567 2V3',
  registreCommerce: 'SN-DKR-2022-B-1234',
  mentionsLegales: 'Clinique agréée — Établissement de santé privé. Paiement à réception de la facture.',
};

// Fichier d'exemple (SVG) pour démontrer la prévisualisation des documents RH.
const sampleDoc = (label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842"><rect width="595" height="842" fill="#ffffff"/><rect width="595" height="96" fill="#1a5fe0"/><text x="40" y="60" font-family="Arial, sans-serif" font-size="30" fill="#ffffff">ClinikDia</text><text x="40" y="170" font-family="Arial, sans-serif" font-size="26" fill="#0f172a">${label}</text><text x="40" y="215" font-family="Arial, sans-serif" font-size="16" fill="#64748b">Document de démonstration</text><line x1="40" y1="250" x2="555" y2="250" stroke="#e2e8f0"/></svg>`,
  );

const hr = (i: number, type: Staff['typeContrat'], salaire: number): Partial<Staff> => ({
  adresse: ['Dakar Plateau', 'Sicap Liberté', 'Mermoz', 'Point E', 'Almadies', 'Ouakam', 'Fann', 'Yoff'][i % 8],
  dateNaissance: `${1985 - (i % 15)}-0${(i % 9) + 1}-1${i % 9}`,
  dateEmbauche: `${2019 + (i % 5)}-0${(i % 9) + 1}-01`,
  typeContrat: type,
  dateFinContrat: type === 'CDD' || type === 'stage' ? `${2026}-12-31` : undefined,
  salaireBase: salaire,
  contactsUrgence: [
    { nom: ['Awa Diop', 'Cheikh Fall', 'Ndeye Sow', 'Modou Ba'][i % 4], lien: 'Conjoint(e)', telephone: `+221 77 ${200 + i} ${300 + i}` },
    { nom: ['Fatou Ndiaye', 'Ousmane Kane', 'Aïda Sy', 'Pape Diouf'][i % 4], lien: 'Parent', telephone: `+221 76 ${400 + i} ${500 + i}` },
  ],
  documents: [
    { id: `d${i}1`, type: 'Contrat de travail', nom: `contrat-${type}.svg`, mime: 'image/svg+xml', taille: 900, dataUrl: sampleDoc('Contrat de travail'), dateAjout: `${2019 + (i % 5)}-0${(i % 9) + 1}-01` },
    { id: `d${i}2`, type: 'CNI', nom: 'cni.svg', mime: 'image/svg+xml', taille: 900, dataUrl: sampleDoc("Carte nationale d'identité"), dateAjout: `${2019 + (i % 5)}-0${(i % 9) + 1}-02` },
    { id: `d${i}3`, type: 'Visite médicale', nom: 'aptitude.svg', mime: 'image/svg+xml', taille: 900, dataUrl: sampleDoc("Visite médicale d'aptitude"), dateAjout: addDays(-(i * 20)) },
  ],
});

export const staff: Staff[] = [
  { id: 's1', code: 'NEPH-01', nom: 'Diop', prenom: 'Aminata', role: 'nephrologue', telephone: '+221 77 123 45 67', email: 'a.diop@clinikdia.sn', specialite: 'Néphrologie', actif: true, ...hr(1, 'CDI', 1200000) },
  { id: 's2', code: 'NEPH-02', nom: 'Sow', prenom: 'Cheikh', role: 'nephrologue', telephone: '+221 77 234 56 78', email: 'c.sow@clinikdia.sn', specialite: 'Néphrologie', actif: true, ...hr(2, 'CDI', 1150000) },
  { id: 's3', code: 'INF-01', nom: 'Ndiaye', prenom: 'Fatou', role: 'infirmier', telephone: '+221 77 345 67 89', email: 'f.ndiaye@clinikdia.sn', actif: true, ...hr(3, 'CDI', 450000) },
  { id: 's4', code: 'INF-02', nom: 'Ba', prenom: 'Moussa', role: 'infirmier', telephone: '+221 77 456 78 90', email: 'm.ba@clinikdia.sn', actif: true, ...hr(4, 'CDD', 420000) },
  { id: 's5', code: 'INF-03', nom: 'Faye', prenom: 'Awa', role: 'infirmier', telephone: '+221 77 567 89 01', email: 'a.faye@clinikdia.sn', actif: true, ...hr(5, 'CDI', 440000) },
  { id: 's6', code: 'TECH-01', nom: 'Sarr', prenom: 'Ibrahima', role: 'technicien', telephone: '+221 77 678 90 12', email: 'i.sarr@clinikdia.sn', specialite: 'Biomédical', actif: true, ...hr(6, 'CDI', 550000) },
  { id: 's7', code: 'ADM-01', nom: 'Camara', prenom: 'Bineta', role: 'admin', telephone: '+221 77 789 01 23', email: 'b.camara@clinikdia.sn', actif: true, ...hr(7, 'CDI', 700000) },
  { id: 's8', code: 'AS-01', nom: 'Gueye', prenom: 'Mariama', role: 'aide_soignant', telephone: '+221 77 890 12 34', email: 'm.gueye@clinikdia.sn', actif: true, ...hr(8, 'vacation', 250000) },
];

const noms = ['Diallo', 'Sy', 'Cissé', 'Mbaye', 'Kane', 'Diouf', 'Seck', 'Thiam', 'Fall', 'Touré', 'Niang', 'Wade', 'Lô', 'Samb', 'Dieng', 'Gaye', 'Sène', 'Dramé'];
const prenomsM = ['Mamadou', 'Ousmane', 'Abdoulaye', 'Pape', 'Modou', 'Babacar', 'Alioune', 'Serigne'];
const prenomsF = ['Aïssatou', 'Khadija', 'Ndèye', 'Sokhna', 'Coumba', 'Rokhaya', 'Adja', 'Maïmouna'];
const nephropathies = ['Néphropathie diabétique', 'Néphroangiosclérose', 'Glomérulonéphrite chronique', 'Polykystose rénale', 'Néphropathie hypertensive', 'Uropathie obstructive'];
const groupes = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-'];

export const patients: Patient[] = Array.from({ length: 28 }).map((_, i) => {
  const sexe = i % 2 === 0 ? 'M' : 'F';
  const nom = noms[i % noms.length];
  const prenom = sexe === 'M' ? prenomsM[i % prenomsM.length] : prenomsF[i % prenomsF.length];
  const age = 30 + ((i * 7) % 45);
  const pec = (['IPRES', 'assurance_privee', 'mutuelle', 'cmu', 'payant'] as const)[i % 5];
  return {
    id: `p${i + 1}`,
    code: `PAT-${String(i + 1).padStart(4, '0')}`,
    nom,
    prenom,
    sexe,
    dateNaissance: `${today.getFullYear() - age}-0${(i % 9) + 1}-1${i % 9}`,
    telephone: `+221 7${6 + (i % 3)} ${100 + i} ${200 + i}`,
    adresse: ['Dakar Plateau', 'Pikine', 'Guédiawaye', 'Parcelles Assainies', 'Rufisque', 'Yoff', 'Grand Yoff'][i % 7],
    groupeSanguin: groupes[i % groupes.length],
    statut: i === 3 ? 'transplante' : i === 7 ? 'transfere' : 'actif',
    abord: (['FAV', 'catheter_tunnelise', 'catheter_temporaire', 'pontage'] as const)[i % 4],
    nephrologueId: i % 2 === 0 ? 's1' : 's2',
    priseEnCharge: pec,
    numAssurance: pec === 'payant' ? undefined : `${pec.slice(0, 3).toUpperCase()}-${10000 + i}`,
    serologies: {
      vhb: i % 11 === 0 ? 'positif' : 'negatif',
      vhc: i % 9 === 0 ? 'positif' : 'negatif',
      vih: 'negatif',
    },
    antecedents: [i % 2 === 0 ? 'HTA' : 'Diabète type 2', ...(i % 3 === 0 ? ['Cardiopathie'] : [])],
    nephropathie: nephropathies[i % nephropathies.length],
    dateDebutDialyse: `${today.getFullYear() - ((i % 4) + 1)}-0${(i % 9) + 1}-15`,
    frequenceHebdo: 3,
    poidsSec: 55 + ((i * 3) % 35),
    createdAt: addDays(-((i % 4) + 1) * 365),
  };
});

export const machines: Machine[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `m${i + 1}`,
  code: `GEN-${String(i + 1).padStart(2, '0')}`,
  modele: i % 2 === 0 ? 'Fresenius 5008S' : 'B.Braun Dialog iQ',
  marque: i % 2 === 0 ? 'Fresenius' : 'B.Braun',
  numeroSerie: `SN${20230 + i}`,
  poste: i + 1,
  statut: i === 9 ? 'maintenance' : i === 10 ? 'desinfection' : i === 11 ? 'hors_service' : 'operationnel',
  dateMiseEnService: `${today.getFullYear() - 2}-03-01`,
  heuresFonctionnement: 8000 + i * 320,
  derniereDesinfection: addDays(-(i % 3)),
  prochaineMaintenance: addDays(15 - i),
}));

export const maintenances: Maintenance[] = [
  { id: 'mt1', machineId: 'm10', type: 'corrective', date: addDays(-1), description: 'Remplacement capteur de pression artérielle', technicienId: 's6', statut: 'en_cours', cout: 180000 },
  { id: 'mt2', machineId: 'm5', type: 'preventive', date: addDays(8), description: 'Maintenance préventive trimestrielle', technicienId: 's6', statut: 'planifiee', cout: 75000 },
  { id: 'mt3', machineId: 'm2', type: 'desinfection', date: addDays(-2), description: 'Désinfection chimique citrique', technicienId: 's6', statut: 'terminee', cout: 15000 },
  { id: 'mt4', machineId: 'm12', type: 'corrective', date: addDays(-5), description: 'Panne carte électronique — en attente pièce', technicienId: 's6', statut: 'en_cours', cout: 450000 },
];

// Génère les séances du jour sur les postes opérationnels
const creneaux: Creneau[] = ['matin', 'apresmidi', 'soir'];
export const seances: Seance[] = [];
let seanceCounter = 1;
const activePatients = patients.filter((p) => p.statut === 'actif');
const operationalMachines = machines.filter((m) => m.statut === 'operationnel');

// Séances du jour
operationalMachines.forEach((machine, mi) => {
  creneaux.slice(0, 2).forEach((creneau, ci) => {
    const patient = activePatients[(mi * 2 + ci) % activePatients.length];
    const poidsAvant = patient.poidsSec + 1.5 + (mi % 3) * 0.5;
    seances.push({
      id: `se${seanceCounter++}`,
      patientId: patient.id,
      machineId: machine.id,
      date: iso(today),
      creneau,
      infirmierId: ['s3', 's4', 's5'][ci % 3],
      statut: ci === 0 ? 'en_cours' : 'planifiee',
      poidsAvant: ci === 0 ? Number(poidsAvant.toFixed(1)) : undefined,
      taSystoliqueAvant: ci === 0 ? 140 + (mi % 4) * 5 : undefined,
      taDiastoliqueAvant: ci === 0 ? 80 + (mi % 3) * 5 : undefined,
      dureeMinutes: 240,
      debitSang: ci === 0 ? 300 : undefined,
      anticoagulation: 'Héparine 5000 UI',
    });
  });
});

// Historique de séances terminées (30 derniers jours)
for (let d = 1; d <= 14; d++) {
  activePatients.slice(0, 8).forEach((patient, pi) => {
    if ((d + pi) % 2 !== 0) return;
    const poidsAvant = patient.poidsSec + 1 + ((d + pi) % 3) * 0.6;
    const poidsApres = patient.poidsSec + 0.2;
    seances.push({
      id: `se${seanceCounter++}`,
      patientId: patient.id,
      machineId: operationalMachines[pi % operationalMachines.length].id,
      date: addDays(-d),
      creneau: creneaux[pi % 3],
      infirmierId: ['s3', 's4', 's5'][pi % 3],
      statut: 'terminee',
      poidsAvant: Number(poidsAvant.toFixed(1)),
      poidsApres: Number(poidsApres.toFixed(1)),
      taSystoliqueAvant: 138 + (pi % 4) * 4,
      taDiastoliqueAvant: 82 + (pi % 3) * 3,
      taSystoliqueApres: 125 + (pi % 3) * 4,
      taDiastoliqueApres: 75 + (pi % 3) * 3,
      dureeMinutes: 240,
      debitSang: 300,
      ufTotal: Number((poidsAvant - poidsApres).toFixed(1)),
      ktv: Number((1.2 + ((d + pi) % 5) * 0.08).toFixed(2)),
      anticoagulation: 'Héparine 5000 UI',
    });
  });
}

export const prescriptions: Prescription[] = activePatients.slice(0, 18).map((p, i) => ({
  id: `pr${i + 1}`,
  patientId: p.id,
  nephrologueId: p.nephrologueId,
  date: addDays(-(i % 30) - 10),
  dureeSeance: 240,
  frequenceHebdo: 3,
  dialyseur: i % 2 === 0 ? 'FX80 (High-flux)' : 'Polyflux 170H',
  debitSang: 300,
  debitDialysat: 500,
  anticoagulation: 'Héparine 5000 UI bolus + 1000 UI/h',
  bainDialyse: 'Bicarbonate, K+ 2 mmol/L',
  medicaments: [
    { nom: 'EPO (Érythropoïétine)', posologie: '4000 UI x3/sem' },
    { nom: 'Fer injectable', posologie: '100 mg/sem' },
    ...(i % 2 === 0 ? [{ nom: 'Calcium carbonate', posologie: '1g x3/j' }] : []),
  ],
  active: true,
}));

export const articlesStock: ArticleStock[] = [
  { id: 'a1', code: 'DIA-FX80', designation: 'Dialyseur FX80 High-flux', categorie: 'dialyseur', unite: 'unité', quantite: 320, seuilAlerte: 150, prixUnitaire: 8500, fournisseur: 'Fresenius Medical' },
  { id: 'a2', code: 'DIA-PF170', designation: 'Dialyseur Polyflux 170H', categorie: 'dialyseur', unite: 'unité', quantite: 95, seuilAlerte: 120, prixUnitaire: 9200, fournisseur: 'Baxter' },
  { id: 'a3', code: 'LIG-AV', designation: 'Lignes artério-veineuses', categorie: 'ligne', unite: 'kit', quantite: 410, seuilAlerte: 200, prixUnitaire: 3500, fournisseur: 'Fresenius Medical' },
  { id: 'a4', code: 'AIG-15G', designation: 'Aiguilles à fistule 15G', categorie: 'aiguille', unite: 'boîte', quantite: 48, seuilAlerte: 60, prixUnitaire: 12000, fournisseur: 'Nipro' },
  { id: 'a5', code: 'CONC-BIC', designation: 'Concentré bicarbonate', categorie: 'concentre', unite: 'bidon', quantite: 140, seuilAlerte: 80, prixUnitaire: 6500, fournisseur: 'B.Braun' },
  { id: 'a6', code: 'CONC-ACID', designation: 'Concentré acide', categorie: 'concentre', unite: 'bidon', quantite: 38, seuilAlerte: 50, prixUnitaire: 5800, fournisseur: 'B.Braun' },
  { id: 'a7', code: 'MED-EPO', designation: 'Érythropoïétine 4000 UI', categorie: 'medicament', unite: 'ampoule', quantite: 210, seuilAlerte: 100, prixUnitaire: 9500, fournisseur: 'Roche' },
  { id: 'a8', code: 'MED-FER', designation: 'Fer injectable 100mg', categorie: 'medicament', unite: 'ampoule', quantite: 165, seuilAlerte: 80, prixUnitaire: 4200, fournisseur: 'Vifor' },
  { id: 'a9', code: 'CONS-HEP', designation: 'Héparine 5000 UI', categorie: 'medicament', unite: 'flacon', quantite: 88, seuilAlerte: 60, prixUnitaire: 2500, fournisseur: 'Sanofi' },
  { id: 'a10', code: 'CONS-COMP', designation: 'Compresses stériles', categorie: 'consommable', unite: 'paquet', quantite: 520, seuilAlerte: 200, prixUnitaire: 800, fournisseur: 'Distrimed' },
  { id: 'a11', code: 'CONS-GANT', designation: 'Gants stériles', categorie: 'consommable', unite: 'boîte', quantite: 72, seuilAlerte: 100, prixUnitaire: 4500, fournisseur: 'Distrimed' },
];

export const mouvementsStock: MouvementStock[] = [
  { id: 'mv1', articleId: 'a1', type: 'entree', quantite: 200, date: addDays(-10), motif: 'Réception commande #2451' },
  { id: 'mv2', articleId: 'a1', type: 'sortie', quantite: 80, date: addDays(-3), motif: 'Consommation séances' },
  { id: 'mv3', articleId: 'a4', type: 'sortie', quantite: 12, date: addDays(-1), motif: 'Consommation séances' },
  { id: 'mv4', articleId: 'a7', type: 'entree', quantite: 100, date: addDays(-7), motif: 'Réception commande #2460' },
];

let factNum = 1;
export const factures: Facture[] = patients.slice(0, 16).map((p, i) => {
  const nbSeances = 4 + (i % 9);
  const total = nbSeances * settings.tarifSeance;
  const partAssurance = p.priseEnCharge === 'payant' ? 0 : p.priseEnCharge === 'IPRES' ? 80 : 60;
  const aCharge = total * (1 - partAssurance / 100);
  const statut = i % 4 === 0 ? 'payee' : i % 4 === 1 ? 'partielle' : i % 4 === 2 ? 'emise' : 'impayee';
  return {
    id: `f${i + 1}`,
    numero: `FAC-2026-${String(factNum++).padStart(4, '0')}`,
    patientId: p.id,
    date: addDays(-(i % 25)),
    lignes: [{ designation: `Séances d'hémodialyse (${nbSeances})`, quantite: nbSeances, prixUnitaire: settings.tarifSeance }],
    montantTotal: total,
    montantPaye: statut === 'payee' ? aCharge : statut === 'partielle' ? Math.round(aCharge / 2) : 0,
    priseEnCharge: p.priseEnCharge,
    partAssurance,
    statut,
  };
});

// ─── Comptes utilisateurs ───────────────────────────────────────────────────
const utilisateurPerms = (() => {
  const p = defaultPermissions('utilisateur');
  p.facturation = { access: true, write: false, delete: false };
  return p;
})();

export const DEFAULT_PASSWORD = 'Clinik2026';

export const users: User[] = [
  { id: 'u1', nom: 'Camara', prenom: 'Bineta', email: 'b.camara@clinikdia.sn', password: DEFAULT_PASSWORD, role: 'admin', staffId: 's7', actif: true, permissions: defaultPermissions('admin'), derniereConnexion: addDays(0), createdAt: addDays(-400) },
  { id: 'u2', nom: 'Ndiaye', prenom: 'Fatou', email: 'f.ndiaye@clinikdia.sn', password: DEFAULT_PASSWORD, role: 'utilisateur', staffId: 's3', actif: true, permissions: defaultPermissions('utilisateur'), derniereConnexion: addDays(-1), createdAt: addDays(-300) },
  { id: 'u3', nom: 'Sarr', prenom: 'Ibrahima', email: 'i.sarr@clinikdia.sn', password: DEFAULT_PASSWORD, role: 'utilisateur', staffId: 's6', actif: true, permissions: (() => { const p = defaultPermissions('utilisateur'); p.machines = { access: true, write: true, delete: false }; p.qhse = { access: true, write: true, delete: true }; p.stock = { access: true, write: false, delete: false }; return p; })(), derniereConnexion: addDays(-2), createdAt: addDays(-250) },
  { id: 'u4', nom: 'Ba', prenom: 'Moussa', email: 'm.ba@clinikdia.sn', password: DEFAULT_PASSWORD, role: 'utilisateur', staffId: 's4', actif: false, permissions: utilisateurPerms, derniereConnexion: addDays(-30), createdAt: addDays(-200) },
];

export const auditLogs: AuditLog[] = [
  { id: 'al1', userId: 'u1', userName: 'Bineta Camara', action: 'login', module: 'auth', detail: 'Connexion au système', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'al2', userId: 'u1', userName: 'Bineta Camara', action: 'create', module: 'patients', detail: 'Création du patient PAT-0028', timestamp: new Date(Date.now() - 5400000).toISOString() },
  { id: 'al3', userId: 'u2', userName: 'Fatou Ndiaye', action: 'update', module: 'planning', detail: 'Séance mise à jour (poids, TA)', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'al4', userId: 'u3', userName: 'Ibrahima Sarr', action: 'update', module: 'machines', detail: 'Statut GEN-10 → maintenance', timestamp: new Date(Date.now() - 9000000).toISOString() },
  { id: 'al5', userId: 'u1', userName: 'Bineta Camara', action: 'delete', module: 'facturation', detail: 'Suppression facture brouillon', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'al6', userId: 'u2', userName: 'Fatou Ndiaye', action: 'access', module: 'patients', detail: 'Consultation dossier patient', timestamp: new Date(Date.now() - 90000000).toISOString() },
];

export const channels: Channel[] = [
  { id: 'general', label: 'général', description: "Toute l'équipe" },
  { id: 'nephrologie', label: 'néphrologie', description: 'Médecins néphrologues' },
  { id: 'soins', label: 'soins-infirmiers', description: 'Équipe infirmière' },
  { id: 'technique', label: 'technique-qhse', description: 'Maintenance & sécurité' },
  { id: 'admin', label: 'administration', description: 'Direction & gestion' },
];

export const chatMessages: ChatMessage[] = [
  { id: 'c1', channel: 'general', authorId: 'u2', authorName: 'Fatou Ndiaye', text: 'Bonjour à tous, le poste 3 est libre pour le créneau de cet après-midi.', timestamp: new Date(Date.now() - 90000000).toISOString() },
  { id: 'c2', channel: 'general', authorId: 'u3', authorName: 'Ibrahima Sarr', text: 'Je passe désinfecter le GEN-02 dans 30 min.', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'c3', channel: 'general', authorId: 'u1', authorName: 'Bineta Camara', text: 'Merci. Réunion qualité QHSE demain à 9h en salle de staff.', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'c4', channel: 'general', authorId: 'u2', authorName: 'Fatou Ndiaye', text: 'Bien noté 👍', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'c5', channel: 'nephrologie', authorId: 'u1', authorName: 'Bineta Camara', text: 'Staff néphro : revoir les prescriptions des patients à Kt/V < 1,2.', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'c6', channel: 'soins', authorId: 'u2', authorName: 'Fatou Ndiaye', text: 'Penser à peser les patients avant et après chaque séance, SVP.', timestamp: new Date(Date.now() - 5400000).toISOString() },
  { id: 'c7', channel: 'technique', authorId: 'u3', authorName: 'Ibrahima Sarr', text: 'Analyse bactériologique de l\'eau prévue ce vendredi.', timestamp: new Date(Date.now() - 4000000).toISOString() },
  { id: 'c8', channel: 'technique', authorId: 'u1', authorName: 'Bineta Camara', text: 'Parfait, transmets-moi le rapport dès réception.', timestamp: new Date(Date.now() - 3500000).toISOString(), reactions: { '👍': ['u3'] } },
  // Messages directs (Bineta ↔ Fatou)
  { id: 'c9', channel: 'dm:u1_u2', authorId: 'u2', authorName: 'Fatou Ndiaye', text: 'Bonjour Bineta, peux-tu valider mes congés de la semaine prochaine ?', timestamp: new Date(Date.now() - 6000000).toISOString() },
  { id: 'c10', channel: 'dm:u1_u2', authorId: 'u1', authorName: 'Bineta Camara', text: 'Bonjour Fatou, c\'est noté, je regarde ça aujourd\'hui 🙂', timestamp: new Date(Date.now() - 3000000).toISOString() },
];

export const controles: Controle[] = [
  { id: 'ct1', code: 'CTL-01', domaine: 'eau', libelle: "Analyse bactériologique de l'eau d'osmose", responsableId: 's6', periodicite: 'Mensuel', dateDernierControle: addDays(-20), dateProchainControle: addDays(10), statut: 'conforme', observations: 'Conforme aux normes AAMI.' },
  { id: 'ct2', code: 'CTL-02', domaine: 'eau', libelle: "Dosage des endotoxines (eau ultrapure)", responsableId: 's6', periodicite: 'Trimestriel', dateDernierControle: addDays(-100), dateProchainControle: addDays(-10), statut: 'a_controler' },
  { id: 'ct3', code: 'CTL-03', domaine: 'electricite', libelle: 'Vérification installation électrique & groupe électrogène', responsableId: 's6', periodicite: 'Annuel', dateDernierControle: addDays(-300), dateProchainControle: addDays(65), statut: 'conforme' },
  { id: 'ct4', code: 'CTL-04', domaine: 'dechets', libelle: 'Traçabilité élimination des DASRI', responsableId: 's7', periodicite: 'Mensuel', dateDernierControle: addDays(-5), dateProchainControle: addDays(25), statut: 'conforme', observations: 'Bordereaux à jour (prestataire agréé).' },
  { id: 'ct5', code: 'CTL-05', domaine: 'hygiene', libelle: 'Contrôle désinfection des générateurs', responsableId: 's3', periodicite: 'Hebdomadaire', dateDernierControle: addDays(-2), dateProchainControle: addDays(5), statut: 'conforme' },
  { id: 'ct6', code: 'CTL-06', domaine: 'equipement', libelle: 'Maintenance préventive osmoseur', responsableId: 's6', periodicite: 'Semestriel', dateDernierControle: addDays(-200), dateProchainControle: addDays(-20), statut: 'non_conforme', observations: 'Maintenance en retard — intervention à planifier.' },
  { id: 'ct7', code: 'CTL-07', domaine: 'hygiene', libelle: 'Prélèvements de surface (bloc dialyse)', responsableId: 's5', periodicite: 'Trimestriel', dateDernierControle: addDays(-40), dateProchainControle: addDays(50), statut: 'conforme' },
];

export const extincteurs: Extincteur[] = [
  { id: 'e1', code: 'EXT-01', type: 'Poudre ABC', capacite: '6 kg', emplacement: 'Salle de dialyse — entrée', dateInstallation: '2023-01-15', dateDernierControle: addDays(-120), dateProchainControle: addDays(60), statut: 'conforme' },
  { id: 'e2', code: 'EXT-02', type: 'CO2', capacite: '5 kg', emplacement: 'Local technique / traitement d\'eau', dateInstallation: '2023-01-15', dateDernierControle: addDays(-200), dateProchainControle: addDays(-20), statut: 'a_controler' },
  { id: 'e3', code: 'EXT-03', type: 'Poudre ABC', capacite: '9 kg', emplacement: 'Couloir consultations', dateInstallation: '2022-06-10', dateDernierControle: addDays(-400), dateProchainControle: addDays(-40), statut: 'non_conforme' },
  { id: 'e4', code: 'EXT-04', type: 'Eau pulvérisée', capacite: '6 L', emplacement: 'Accueil', dateInstallation: '2023-03-01', dateDernierControle: addDays(-90), dateProchainControle: addDays(90), statut: 'conforme' },
  { id: 'e5', code: 'EXT-05', type: 'CO2', capacite: '2 kg', emplacement: 'Pharmacie / stock', dateInstallation: '2023-03-01', dateDernierControle: addDays(-150), dateProchainControle: addDays(30), statut: 'conforme' },
];

export const certifications: Certification[] = [
  { id: 'cf1', nom: 'ISO 9001:2015 — Management de la qualité', organisme: 'Bureau Veritas', numero: 'FR-2023-09001', dateObtention: '2023-04-15', dateExpiration: addDays(300), statut: 'valide', observations: 'Audit de surveillance annuel à prévoir.' },
  { id: 'cf2', nom: 'Agrément sanitaire — Centre de dialyse', organisme: 'Ministère de la Santé du Sénégal', numero: 'MSAS/DES/2022/148', dateObtention: '2022-09-01', dateExpiration: addDays(120), statut: 'valide' },
  { id: 'cf3', nom: 'Certification eau ultrapure (norme AAMI/ISO 13959)', organisme: 'Laboratoire national de référence', numero: 'LNR-EAU-2024-07', dateObtention: addDays(-380), dateExpiration: addDays(-15), statut: 'expiree', observations: 'Renouvellement en cours auprès du laboratoire.' },
];

let depNum = 1;
export const depenses: Depense[] = [
  { id: 'dp1', code: `DEP-${String(depNum++).padStart(4, '0')}`, date: addDays(-2), categorie: 'consommables', libelle: 'Commande dialyseurs FX80 (200 u.)', montant: 1700000, fournisseur: 'Fresenius Medical', moyenPaiement: 'Virement', statut: 'payee' },
  { id: 'dp2', code: `DEP-${String(depNum++).padStart(4, '0')}`, date: addDays(-5), categorie: 'maintenance', libelle: 'Réparation carte électronique GEN-12', montant: 450000, fournisseur: 'B.Braun SAV', moyenPaiement: 'Chèque', statut: 'en_attente' },
  { id: 'dp3', code: `DEP-${String(depNum++).padStart(4, '0')}`, date: addDays(-8), categorie: 'energie', libelle: 'Facture électricité SENELEC', montant: 1250000, fournisseur: 'SENELEC', moyenPaiement: 'Prélèvement', statut: 'payee' },
  { id: 'dp4', code: `DEP-${String(depNum++).padStart(4, '0')}`, date: addDays(-10), categorie: 'eau', libelle: 'Facture eau SDE (traitement d\'eau)', montant: 680000, fournisseur: 'SDE', moyenPaiement: 'Prélèvement', statut: 'payee' },
  { id: 'dp5', code: `DEP-${String(depNum++).padStart(4, '0')}`, date: addDays(-15), categorie: 'loyer', libelle: 'Loyer du local — Juin', montant: 2000000, fournisseur: 'SCI Liberté', moyenPaiement: 'Virement', statut: 'payee' },
  { id: 'dp6', code: `DEP-${String(depNum++).padStart(4, '0')}`, date: addDays(-1), categorie: 'fournitures', libelle: 'Fournitures de bureau', montant: 95000, fournisseur: 'Librairie 4 Vents', moyenPaiement: 'Espèces', statut: 'en_attente' },
];
