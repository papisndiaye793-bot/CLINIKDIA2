import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Les permissions sont stockées en JSON sérialisé (SQLite). */
function parsePermissions(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  /** Hachage Argon2id — ISO 27002 8.24 / 5.17. */
  static hash(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async login(email: string, password: string, totp?: string) {
    const generic = new UnauthorizedException('Identifiants incorrects.');
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Message générique : ne pas divulguer l'existence du compte (8.5)
    if (!user || !(await argon2.verify(user.passwordHash, password))) throw generic;
    if (!user.active) throw new UnauthorizedException('Compte désactivé. Contactez un administrateur.');

    // Second facteur (TOTP) si activé — 8.5
    if (user.mfaEnabled) {
      if (!totp || !user.mfaSecret || !authenticator.verify({ token: totp, secret: user.mfaSecret })) {
        throw new UnauthorizedException('Code de vérification (MFA) requis ou invalide.');
      }
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await this.audit.record({ userId: user.id, userName: `${user.prenom} ${user.nom}`, action: 'login', module: 'auth', detail: 'Connexion' });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: parsePermissions(user.permissions),
      nom: user.nom,
      prenom: user.prenom,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '30m',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        permissions: parsePermissions(user.permissions),
        mfaEnabled: user.mfaEnabled,
        actif: user.active,
      },
    };
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await argon2.verify(user.passwordHash, current))) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }
    if (await argon2.verify(user.passwordHash, next)) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l’ancien.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await AuthService.hash(next) } });
    await this.audit.record({ userId, userName: `${user.prenom} ${user.nom}`, action: 'update', module: 'comptes', detail: 'Mot de passe modifié' });
    return { ok: true };
  }

  /** Demande de réinitialisation : crée un token à usage unique expirant (5.17). */
  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Réponse identique que le compte existe ou non (anti-énumération, 8.5)
    if (user && user.active) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
      });
      // En production : envoyer le lien par email. En dev : journaliser.
      // eslint-disable-next-line no-console
      console.log(`[reset] lien pour ${user.email}: /reset?token=${token}`);
    }
    return { ok: true, message: 'Si un compte existe, un lien de réinitialisation a été envoyé.' };
  }

  async resetPassword(token: string, next: string) {
    const rec = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!rec) throw new BadRequestException('Lien invalide ou expiré.');
    await this.prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await AuthService.hash(next) } });
    await this.prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
    await this.audit.record({ userId: rec.userId, userName: '—', action: 'update', module: 'auth', detail: 'Réinitialisation du mot de passe' });
    return { ok: true };
  }

  /** Active le MFA : renvoie un secret + URL otpauth à scanner. */
  async setupMfa(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const otpauth = authenticator.keyuri(email, 'ClinikDia', secret);
    return { secret, otpauth };
  }

  async confirmMfa(userId: string, totp: string, enable = true) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret || !authenticator.verify({ token: totp, secret: user.mfaSecret })) {
      throw new BadRequestException('Code MFA invalide.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: enable } });
    await this.audit.record({ userId, userName: `${user.prenom} ${user.nom}`, action: 'update', module: 'comptes', detail: `MFA ${enable ? 'activé' : 'désactivé'}` });
    return { ok: true };
  }
}
