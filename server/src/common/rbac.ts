import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from './jwt-auth.guard';

type Perm = 'access' | 'write' | 'delete';

/**
 * Déclare l'autorisation requise sur une route :
 *   @RequirePerm('patients', 'write')
 * L'autorisation est vérifiée CÔTÉ SERVEUR (ISO 27002 8.3 / 5.15),
 * jamais déléguée à l'UI.
 */
export const PERM_KEY = 'required_perm';
export const RequirePerm = (module: string, perm: Perm) =>
  SetMetadata(PERM_KEY, { module, perm });

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const meta = this.reflector.get<{ module: string; perm: Perm }>(PERM_KEY, ctx.getHandler());
    if (!meta) return true; // route sans exigence d'autorisation
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) throw new ForbiddenException('Non autorisé.');
    if (user.role === 'admin') return true; // l'admin a tous les droits
    const ok = !!user.permissions?.[meta.module]?.[meta.perm];
    if (!ok) throw new ForbiddenException(`Droit « ${meta.perm} » manquant sur « ${meta.module} ».`);
    return true;
  }
}
