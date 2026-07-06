import type { ModuleKey, Permissions, RoleUser } from '@/types';

// Liste ordonnée des modules gérables par les permissions
export const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'patients', label: 'Patients' },
  { key: 'planning', label: 'Planning des séances' },
  { key: 'calendrier', label: 'Calendrier' },
  { key: 'machines', label: 'Générateurs & maintenance' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'grh', label: 'GRH (RH & paie)' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'stock', label: 'Stock & consommables' },
  { key: 'facturation', label: 'Facturation' },
  { key: 'paie', label: 'Paie (bulletins de salaire)' },
  { key: 'depenses', label: 'Dépenses' },
  { key: 'qhse', label: 'QHSE' },
  { key: 'chat', label: 'Messagerie' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'archives', label: 'Archives' },
  { key: 'comptes', label: 'Comptes utilisateurs' },
  { key: 'parametres', label: 'Paramètres' },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

const make = (access: boolean, write: boolean, del: boolean): Permissions =>
  MODULE_KEYS.reduce((acc, k) => {
    acc[k] = { access, write, delete: del };
    return acc;
  }, {} as Permissions);

/** Permissions par défaut selon le rôle. */
export function defaultPermissions(role: RoleUser): Permissions {
  if (role === 'admin') return make(true, true, true);
  // utilisateur simple : accès en lecture aux modules courants, sans modification
  // ni suppression, et aucun accès aux modules sensibles (RH, comptes, paramètres).
  const p = make(false, false, false);
  (['dashboard', 'patients', 'planning', 'calendrier', 'chat'] as ModuleKey[]).forEach((k) => {
    p[k] = { access: true, write: false, delete: false };
  });
  return p;
}

/** Garantit qu'un objet de permissions contient toutes les clés de module. */
export function normalizePermissions(p?: Partial<Permissions>): Permissions {
  const base = make(false, false, false);
  if (!p) return base;
  MODULE_KEYS.forEach((k) => {
    if (p[k]) base[k] = { access: !!p[k]!.access, write: !!p[k]!.write, delete: !!p[k]!.delete };
  });
  return base;
}
