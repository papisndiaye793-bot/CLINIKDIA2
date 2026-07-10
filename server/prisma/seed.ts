import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Mot de passe de démonstration partagé — conforme à la politique (8+, lettre+chiffre).
// Doit correspondre à DEFAULT_PASSWORD côté front (src/data/seed.ts).
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Clinik2026';

// Permissions par défaut d'un utilisateur simple (lecture des modules courants).
const utilisateurPerms = {
  dashboard: { access: true, write: false, delete: false },
  patients: { access: true, write: false, delete: false },
  planning: { access: true, write: false, delete: false },
  calendrier: { access: true, write: false, delete: false },
  chat: { access: true, write: true, delete: false },
};

// Technicien : accès étendu machines / QHSE / stock.
const technicienPerms = {
  ...utilisateurPerms,
  machines: { access: true, write: true, delete: false },
  qhse: { access: true, write: true, delete: true },
  stock: { access: true, write: false, delete: false },
};

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const users = [
    { email: 'b.camara@clinikdia.sn', nom: 'Camara', prenom: 'Bineta', role: 'admin', active: true, permissions: null },
    { email: 'f.ndiaye@clinikdia.sn', nom: 'Ndiaye', prenom: 'Fatou', role: 'utilisateur', active: true, permissions: JSON.stringify(utilisateurPerms) },
    { email: 'i.sarr@clinikdia.sn', nom: 'Sarr', prenom: 'Ibrahima', role: 'utilisateur', active: true, permissions: JSON.stringify(technicienPerms) },
    { email: 'm.ba@clinikdia.sn', nom: 'Ba', prenom: 'Moussa', role: 'utilisateur', active: false, permissions: JSON.stringify(utilisateurPerms) },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role, active: u.active, permissions: u.permissions },
      create: { ...u, passwordHash },
    });
  }

  // ─── Patients de démonstration ────────────────────────────────────────────
  // Mêmes ids (p1..p28) que le seed front (src/data/seed.ts) pour que les
  // modules encore locaux (prescriptions, planning, factures…) restent liés.
  const noms = ['Diallo', 'Sy', 'Cissé', 'Mbaye', 'Kane', 'Diouf', 'Seck', 'Thiam', 'Fall', 'Touré', 'Niang', 'Wade', 'Lô', 'Samb', 'Dieng', 'Gaye', 'Sène', 'Dramé'];
  const prenomsM = ['Mamadou', 'Ousmane', 'Abdoulaye', 'Pape', 'Modou', 'Babacar', 'Alioune', 'Serigne'];
  const prenomsF = ['Aïssatou', 'Khadija', 'Ndèye', 'Sokhna', 'Coumba', 'Rokhaya', 'Adja', 'Maïmouna'];
  const nephropathies = ['Néphropathie diabétique', 'Néphroangiosclérose', 'Glomérulonéphrite chronique', 'Polykystose rénale', 'Néphropathie hypertensive', 'Uropathie obstructive'];
  const groupes = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-'];
  const abords = ['FAV', 'catheter_tunnelise', 'catheter_temporaire', 'pontage'];
  const pecs = ['IPRES', 'assurance_privee', 'mutuelle', 'cmu', 'payant'];
  const year = new Date().getFullYear();

  for (let i = 0; i < 28; i++) {
    const sexe = i % 2 === 0 ? 'M' : 'F';
    const nom = noms[i % noms.length];
    const prenom = sexe === 'M' ? prenomsM[i % prenomsM.length] : prenomsF[i % prenomsF.length];
    const age = 30 + ((i * 7) % 45);
    const pec = pecs[i % 5];
    await prisma.patient.upsert({
      where: { code: `PAT-${String(i + 1).padStart(4, '0')}` },
      update: {},
      create: {
        id: `p${i + 1}`,
        code: `PAT-${String(i + 1).padStart(4, '0')}`,
        nom,
        prenom,
        sexe,
        dateNaissance: `${year - age}-0${(i % 9) + 1}-1${i % 9}`,
        telephone: `+221 7${6 + (i % 3)} ${100 + i} ${200 + i}`,
        adresse: ['Dakar Plateau', 'Pikine', 'Guédiawaye', 'Parcelles Assainies', 'Rufisque', 'Yoff', 'Grand Yoff'][i % 7],
        groupeSanguin: groupes[i % groupes.length],
        statut: i === 3 ? 'transplante' : i === 7 ? 'transfere' : 'actif',
        abord: abords[i % 4],
        nephrologueId: i % 2 === 0 ? 's1' : 's2',
        priseEnCharge: pec,
        numAssurance: pec === 'payant' ? null : `${pec.slice(0, 3).toUpperCase()}-${10000 + i}`,
        serologies: JSON.stringify({ vhb: i % 11 === 0 ? 'positif' : 'negatif', vhc: i % 9 === 0 ? 'positif' : 'negatif', vih: 'negatif' }),
        antecedents: JSON.stringify([i % 2 === 0 ? 'HTA' : 'Diabète type 2', ...(i % 3 === 0 ? ['Cardiopathie'] : [])]),
        nephropathie: nephropathies[i % nephropathies.length],
        dateDebutDialyse: `${year - ((i % 4) + 1)}-0${(i % 9) + 1}-15`,
        frequenceHebdo: 3,
        poidsSec: 55 + ((i * 3) % 35),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed terminé — ${users.length} comptes + 28 patients (mot de passe démo : ${DEMO_PASSWORD}).`);
}

main().finally(() => prisma.$disconnect());
