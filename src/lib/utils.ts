import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const fmtMoney = (n: number, devise = 'FCFA') =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} ${devise}`;

export const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const fmtDateLong = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const age = (dateNaissance: string) => {
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return '—';
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

export const initials = (nom: string, prenom: string) =>
  `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();

export const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── Sécurité — politique de mot de passe (ISO/IEC 27002 — 5.17) ─────────────
/**
 * Valide un mot de passe selon la politique : ≥ 8 caractères,
 * au moins une lettre et un chiffre. Renvoie un message d'erreur ou null si OK.
 */
export function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd))
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  return null;
}

// ─── Fichiers ───────────────────────────────────────────────────────────────
export const fmtFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── Montant en lettres (français) ──────────────────────────────────────────
const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', '', 'quatre-vingt', ''];

function sous100(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7) return u === 0 ? 'soixante-dix' : u === 1 ? 'soixante et onze' : 'soixante-' + UNITES[10 + u];
  if (d === 9) return 'quatre-vingt-' + UNITES[10 + u];
  const base = d === 8 ? 'quatre-vingt' : DIZAINES[d];
  if (u === 0) return d === 8 ? 'quatre-vingts' : base;
  if (u === 1 && d !== 8) return base + ' et un';
  return base + '-' + UNITES[u];
}

function sous1000(n: number): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  let s = '';
  if (c > 0) {
    s += (c > 1 ? UNITES[c] + ' ' : '') + 'cent';
    if (c > 1 && r === 0) s += 's';
    if (r > 0) s += ' ';
  }
  if (r > 0) s += sous100(r);
  return s;
}

export function montantEnLettres(montant: number, devise = 'francs CFA'): string {
  const n = Math.round(montant);
  if (n === 0) return `zéro ${devise}`;
  const groupes: number[] = [];
  let x = n;
  while (x > 0) {
    groupes.push(x % 1000);
    x = Math.floor(x / 1000);
  }
  const echelles = ['', 'mille', 'million', 'milliard'];
  const parts: string[] = [];
  for (let i = groupes.length - 1; i >= 0; i--) {
    const g = groupes[i];
    if (g === 0) continue;
    let w: string;
    if (i === 1 && g === 1) w = 'mille';
    else {
      w = sous1000(g);
      if (i > 0) w += ' ' + echelles[i];
      if (i >= 2 && g > 1) w += 's';
    }
    parts.push(w);
  }
  const phrase = parts.join(' ');
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} ${devise}`;
}
