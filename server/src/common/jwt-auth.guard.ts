import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthUser {
  sub: string;
  email: string;
  role: 'admin' | 'utilisateur';
  permissions?: Record<string, { access?: boolean; write?: boolean; delete?: boolean }>;
}

/**
 * Authentification serveur : lit le JWT depuis le cookie httpOnly.
 * Aucune confiance dans le client (ISO 27002 8.5).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = req.cookies?.['session'];
    if (!token) throw new UnauthorizedException('Non authentifié.');
    try {
      req.user = this.jwt.verify<AuthUser>(token, { secret: process.env.JWT_SECRET });
      return true;
    } catch {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
  }
}
