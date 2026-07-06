import { useStore } from '@/store/useStore';
import type { ModuleKey } from '@/types';

/**
 * Contrôle d'accès basé sur l'utilisateur courant.
 * - admin : accès et écriture sur tout.
 * - utilisateur : selon les permissions définies par un admin.
 */
export function useAuth() {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);

  const user = users.find((u) => u.id === currentUserId) ?? users[0];
  const isAdmin = user?.role === 'admin';

  const canAccess = (m: ModuleKey) => isAdmin || !!user?.permissions?.[m]?.access;
  const canWrite = (m: ModuleKey) => isAdmin || !!user?.permissions?.[m]?.write;
  const canDelete = (m: ModuleKey) => isAdmin || !!user?.permissions?.[m]?.delete;

  return { user, isAdmin, canAccess, canWrite, canDelete };
}
