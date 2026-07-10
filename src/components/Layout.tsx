import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarRange,
  Activity,
  ClipboardList,
  Briefcase,
  UserCog,
  Boxes,
  Receipt,
  Wallet,
  Banknote,
  ShieldCheck,
  MessagesSquare,
  BarChart3,
  Archive,
  KeyRound,
  Settings,
  Droplets,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  RefreshCw,
  Menu,
  X,
  Clock as ClockIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, initials, todayISO } from '@/lib/utils';
import { apiPost, ApiError } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { Button, Field, Input, Modal } from '@/components/ui';
import type { ModuleKey } from '@/types';

type NavItem = {
  to: string;
  key: ModuleKey;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  badge?: { count: number; tone: 'brand' | 'amber' | 'red' };
};

const allNav: NavItem[] = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/patients', key: 'patients', icon: Users, label: 'Patients' },
  { to: '/planning', key: 'planning', icon: CalendarDays, label: 'Planning' },
  { to: '/calendrier', key: 'calendrier', icon: CalendarRange, label: 'Calendrier' },
  { to: '/machines', key: 'machines', icon: Activity, label: 'Générateurs' },
  { to: '/prescriptions', key: 'prescriptions', icon: ClipboardList, label: 'Prescriptions' },
  { to: '/grh', key: 'grh', icon: Briefcase, label: 'GRH' },
  { to: '/personnel', key: 'personnel', icon: UserCog, label: 'Personnel' },
  { to: '/stock', key: 'stock', icon: Boxes, label: 'Stock' },
  { to: '/facturation', key: 'facturation', icon: Receipt, label: 'Facturation' },
  { to: '/paie', key: 'paie', icon: Banknote, label: 'Paie' },
  { to: '/depenses', key: 'depenses', icon: Wallet, label: 'Dépenses' },
  { to: '/qhse', key: 'qhse', icon: ShieldCheck, label: 'QHSE' },
  { to: '/chat', key: 'chat', icon: MessagesSquare, label: 'Messagerie' },
  { to: '/reporting', key: 'reporting', icon: BarChart3, label: 'Reporting' },
  { to: '/archives', key: 'archives', icon: Archive, label: 'Archives' },
  { to: '/comptes', key: 'comptes', icon: KeyRound, label: 'Comptes utilisateurs' },
  { to: '/parametres', key: 'parametres', icon: Settings, label: 'Paramètres' },
];

const badgeTones = {
  brand: 'bg-brand-400/20 text-brand-200 group-[.active]:bg-white/20 group-[.active]:text-white',
  amber: 'bg-amber-400/20 text-amber-200 group-[.active]:bg-white/20 group-[.active]:text-white',
  red: 'bg-red-400/25 text-red-200 group-[.active]:bg-white/20 group-[.active]:text-white',
};

function CountBadge({ tone, count }: { tone: 'brand' | 'amber' | 'red'; count: number }) {
  if (!count) return null;
  return (
    <span className={cn('ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold', badgeTones[tone])}>
      {count}
    </span>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  const { t } = useT();
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200',
          isActive
            ? 'bg-gradient-to-r from-brand-500/95 to-brand-600 text-white shadow-soft ring-1 ring-white/15'
            : 'text-slate-300/90 hover:bg-white/10 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-300 shadow-[0_0_8px] shadow-brand-400/60" />}
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
              isActive ? 'bg-white/15 text-white' : 'bg-white/[0.04] text-slate-400 group-hover:bg-white/10 group-hover:text-slate-100'
            )}
          >
            <item.icon size={18} />
          </span>
          <span className="truncate">{t(`nav.${item.key}`)}</span>
          {item.badge && <CountBadge tone={item.badge.tone} count={item.badge.count} />}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400/80 first:pt-1">{children}</div>;
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { settings, patients, seances, articlesStock, maintenances, extincteurs } = useStore();
  const { canAccess } = useAuth();
  const { t } = useT();

  const patientsActifs = patients.filter((p) => p.statut === 'actif').length;
  const seancesToday = seances.filter((s) => s.date === todayISO()).length;
  const alertesStock = articlesStock.filter((a) => a.quantite <= a.seuilAlerte).length;
  const maintEnCours = maintenances.filter((m) => m.statut !== 'terminee').length;
  const nonConformes = extincteurs.filter((e) => e.statut !== 'conforme').length;

  const byPath = (p: string) => allNav.find((n) => n.to === p)!;
  const withBadge = (p: string, badge: NavItem['badge']): NavItem => ({ ...byPath(p), badge });

  const groups: { title: string; items: NavItem[] }[] = [
    { title: t('sec.pilotage'), items: [byPath('/'), byPath('/chat')] },
    {
      title: t('sec.medical'),
      items: [
        withBadge('/patients', { count: patientsActifs, tone: 'brand' }),
        withBadge('/planning', { count: seancesToday, tone: 'brand' }),
        byPath('/calendrier'),
        byPath('/prescriptions'),
        byPath('/reporting'),
      ],
    },
    {
      title: t('sec.technique'),
      items: [
        withBadge('/machines', { count: maintEnCours, tone: 'amber' }),
        withBadge('/stock', { count: alertesStock, tone: 'red' }),
        withBadge('/qhse', { count: nonConformes, tone: 'amber' }),
      ],
    },
    {
      title: t('sec.rh'),
      items: [byPath('/grh'), byPath('/personnel')],
    },
    {
      title: t('sec.finances'),
      items: [byPath('/facturation'), byPath('/paie'), byPath('/depenses')],
    },
    {
      title: t('sec.administration'),
      items: [byPath('/archives'), byPath('/comptes'), byPath('/parametres')],
    },
  ];

  // Filtrage selon les permissions de l'utilisateur courant
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => canAccess(i.key)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col overflow-hidden border-r border-slate-800/70 bg-slate-950/95 shadow-2xl transition-transform duration-300 md:static md:z-auto md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Halos de marque décoratifs */}
      <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-24 h-44 w-44 rounded-full bg-teal-500/10 blur-3xl" />
      {/* Liseré supérieur lumineux */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />

      {/* Fermer (mobile uniquement) */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
        aria-label="Fermer le menu"
      >
        <X size={18} />
      </button>

      {/* En-tête / logo — grand bouton pleine largeur vers le tableau de bord */}
      <div className="relative p-3">
        <Link
          to="/"
          title={t('nav.dashboard')}
          className="group block w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/95 shadow-soft transition-all duration-200 hover:shadow-lg hover:border-white/20"
        >
          {settings.logoUrl ? (
            <div className="aspect-[16/9] w-full overflow-hidden bg-white">
              <img
                src={settings.logoUrl}
                alt={settings.nom}
                className="h-full w-full scale-100 object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-brand-400 to-brand-600 text-white">
              <Droplets size={40} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xl font-extrabold tracking-tight">{settings.nom || 'ClinikDia'}</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-3 pb-4 pt-1">
        {visibleGroups.map((g) => (
          <div key={g.title} className="mb-4 rounded-[1.25rem] bg-slate-950/80 p-2">
            <SectionLabel>{g.title}</SectionLabel>
            <div className="space-y-1">
              {g.items.map((item) => (
                <NavItemLink key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Pied de page */}
      <div className="relative border-t border-white/10 p-3">
        <div className="rounded-3xl bg-slate-900/95 p-4 ring-1 ring-white/10 shadow-soft">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="truncate text-xs font-semibold text-slate-100">{settings.nom}</span>
            <span className="ml-auto rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">{t('ch.online')}</span>
          </div>
          <div className="mt-1.5 pl-4 text-[11px] leading-tight text-slate-400">{settings.adresse}</div>
        </div>
      </div>
    </aside>
  );
}

function UserMenu() {
  const users = useStore((s) => s.users);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const logout = useStore((s) => s.logout);
  const { user, isAdmin } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);

  const doLogout = async () => {
    setOpen(false);
    try {
      await apiPost('/auth/logout', {});
    } catch {
      // Ignorer les erreurs de déconnexion serveur, on force quand même la déconnexion locale.
    }
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg border border-transparent py-1 pl-1 pr-2 transition hover:bg-slate-100"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {user ? initials(user.nom, user.prenom) : '?'}
        </div>
        <div className="hidden text-left text-sm leading-tight sm:block">
          <div className="font-medium text-slate-700">{user ? `${user.prenom} ${user.nom}` : '—'}</div>
          <div className="text-xs text-slate-400">{user ? t(`role.${user.role}`) : ''}</div>
        </div>
        <ChevronDown size={15} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {/* Identité */}
            <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-2.5 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {user ? initials(user.nom, user.prenom) : '?'}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-700">{user ? `${user.prenom} ${user.nom}` : '—'}</div>
                <div className="truncate text-xs text-slate-400">{user?.email}</div>
              </div>
            </div>

            {/* Actions compte */}
            <div className="mt-1.5 space-y-0.5">
              <button onClick={() => { setOpen(false); setPwdOpen(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50">
                <KeyRound size={16} className="text-slate-400" /> {t('user.changePassword')}
              </button>
              <button onClick={() => setShowSwitch((s) => !s)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50">
                <RefreshCw size={16} className="text-slate-400" /> {t('user.switchUser')}
              </button>
            </div>

            {showSwitch && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg bg-slate-50 p-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setCurrentUser(u.id); setShowSwitch(false); setOpen(false); }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white',
                      u.id === user?.id && 'bg-white ring-1 ring-brand-200'
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
                      {initials(u.nom, u.prenom)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-700">{u.prenom} {u.nom}</span>
                      <span className="block truncate text-[11px] text-slate-400">{t(`role.${u.role}`)}{!u.actif && ' · off'}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="my-1.5 border-t border-slate-100" />
            <button onClick={doLogout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50">
              <LogOut size={16} /> {t('user.logout')}
            </button>

            <div className="mt-1 px-2.5 pt-1.5 text-[11px] text-slate-400">
              {isAdmin ? t('user.adminAccess') : t('user.limitedAccess')}
            </div>
          </div>
        </>
      )}

      {pwdOpen && user && <ChangePasswordModal userId={user.id} onClose={() => setPwdOpen(false)} />}
    </div>
  );
}

function ChangePasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setError('');
    if (next !== confirm) return setError('La confirmation ne correspond pas au nouveau mot de passe.');
    try {
      await apiPost('/auth/change-password', { current, next });
      setOk(true);
      setTimeout(onClose, 900);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur lors du changement de mot de passe.');
      }
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Modifier mon mot de passe"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={ok}><KeyRound size={16} /> Mettre à jour</Button>
        </>
      }
    >
      {ok ? (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">✓ Mot de passe mis à jour.</div>
      ) : (
        <div className="space-y-4">
          <Field label="Mot de passe actuel"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
          <Field label="Nouveau mot de passe"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="8+ caractères, lettres et chiffres" /></Field>
          <Field label="Confirmer le nouveau mot de passe"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
        </div>
      )}
    </Modal>
  );
}

function LiveClock() {
  const { lang } = useT();
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
      <ClockIcon size={15} className="text-brand-500" />
      <div className="flex flex-col leading-none">
        <span className="text-[13px] font-semibold tabular-nums text-slate-700">{time}</span>
        <span className="hidden text-[10px] capitalize text-slate-400 sm:block">{date}</span>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const loc = useLocation();
  const { t } = useT();
  const current = allNav.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));
  return (
    <header className="flex h-16 shrink-0 items-center justify-between rounded-b-[1.5rem] border border-slate-200/80 bg-white px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={onMenu}
          className="-ml-1 mr-1 flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold text-slate-800">{current ? t(`nav.${current.key}`) : 'ClinikDia'}</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <LiveClock />
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder={t('common.search')}
            className="w-48 sm:w-56 lg:w-64 rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white"
          />
        </div>
        <button className="relative rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="border-l border-slate-200/70 pl-2 md:pl-3">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function AccessDenied() {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <ShieldCheck size={26} />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">{t('access.denied.title')}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{t('access.denied.desc')}</p>
    </div>
  );
}

function Guard() {
  const loc = useLocation();
  const { canAccess } = useAuth();
  const current = allNav.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));
  if (current && !canAccess(current.key)) return <AccessDenied />;
  return <Outlet />;
}

export default function Layout() {
  const { lang } = useT();
  const loc = useLocation();
  const logout = useStore((s) => s.logout);
  const authenticated = useStore((s) => s.authenticated);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Ferme le tiroir mobile à chaque changement de page
  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  // Déconnexion automatique après inactivité — ISO/IEC 27002 8.5
  useEffect(() => {
    if (!authenticated) return;
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(), TIMEOUT);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [authenticated, logout]);

  // h-screen (hauteur fixe) : la barre latérale reste en place, seule la zone <main> défile
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Voile (mobile) lorsque le tiroir est ouvert */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-6 md:px-6 md:py-6">
          <div className="app-shell w-full min-h-[calc(100vh-4rem)] rounded-[2rem] bg-slate-50/90 px-0 py-0">
            <Guard />
          </div>
        </main>
      </div>
    </div>
  );
}
