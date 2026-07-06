import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Permissions par défaut d'un utilisateur simple (lecture seule patients).
const utilisateurPerms = {
  patients: { access: true, write: false, delete: false },
};

async function main() {
  const adminPwd = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234';
  const passwordHash = await argon2.hash(adminPwd, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email: 'b.camara@clinikdia.sn' },
    update: {},
    create: {
      email: 'b.camara@clinikdia.sn',
      passwordHash,
      nom: 'Camara',
      prenom: 'Bineta',
      role: 'admin',
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'f.ndiaye@clinikdia.sn' },
    update: {},
    create: {
      email: 'f.ndiaye@clinikdia.sn',
      passwordHash: await argon2.hash('User1234', { type: argon2.argon2id }),
      nom: 'Ndiaye',
      prenom: 'Fatou',
      role: 'utilisateur',
      active: true,
      permissions: JSON.stringify(utilisateurPerms),
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed terminé. Admin: b.camara@clinikdia.sn / mot de passe initial à changer.');
}

main().finally(() => prisma.$disconnect());
