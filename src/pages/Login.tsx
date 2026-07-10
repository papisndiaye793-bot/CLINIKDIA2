import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Droplets,
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Users,
  ShieldCheck,
  Activity,
  Receipt,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Permissions } from '@/types';
import { DEFAULT_PASSWORD } from '@/data/seed';
import { Button, Field, Input, Badge } from '@/components/ui';
import { roleUserLabel } from '@/lib/labels';
import { initials } from '@/lib/utils';
import { apiPost, ApiError } from '@/lib/api';

const features = [
  { icon: Users, label: 'Patients & séances de dialyse', tone: 'bg-sky-400/15 text-sky-300' },
  { icon: Activity, label: 'Générateurs, stocks & maintenance', tone: 'bg-teal-400/15 text-teal-300' },
  { icon: Receipt, label: 'Facturation, paie & RH', tone: 'bg-amber-400/15 text-amber-300' },
  { icon: ShieldCheck, label: 'Accès sécurisé & conformités QHSE', tone: 'bg-emerald-400/15 text-emerald-300' },
];

export default function Login() {
  const { authenticated, users, settings, syncUser, resetPasswordByEmail } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  if (authenticated) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ─── Panneau de marque (desktop) ─────────────────────────────────── */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex xl:p-14">
        {/* Décor */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent" />
        {/* Grille de points subtile */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{ backgroundImage: 'radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3.5">
          {settings.logoUrl ? (
            <div className="flex h-13 w-13 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-brand-950/40 ring-1 ring-white/20" style={{ height: 52, width: 52 }}>
              <img src={settings.logoUrl} alt={settings.nom} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-950/50 ring-1 ring-white/20" style={{ height: 52, width: 52 }}>
              <Droplets size={26} />
            </div>
          )}
          <div>
            <div className="text-xl font-extrabold tracking-tight">ClinikDia</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300/90">ERP Hémodialyse</div>
          </div>
        </div>

        {/* Accroche + fonctionnalités */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brand-200">
            <Sparkles size={13} /> Plateforme tout-en-un pour votre clinique
          </div>
          <h2 className="mt-5 max-w-md text-[2rem] font-extrabold leading-tight tracking-tight">
            Gérez votre centre de dialyse
            <span className="bg-gradient-to-r from-brand-300 to-teal-300 bg-clip-text text-transparent"> en toute sérénité.</span>
          </h2>
          <ul className="mt-8 space-y-3.5">
            {features.map((f) => (
              <li key={f.label} className="flex items-center gap-3.5 text-[15px] font-medium text-slate-200">
                <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10 ' + f.tone}>
                  <f.icon size={17} />
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Statistiques + pied */}
        <div className="relative">
          <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.06] py-4 text-center backdrop-blur">
            <div>
              <div className="text-2xl font-extrabold">{settings.nbPostes}</div>
              <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">Postes</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold">21</div>
              <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">Modules</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold">24/7</div>
              <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">Disponible</div>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-400" />
            Données chiffrées en transit · {settings.nom} · {settings.adresse}
          </div>
        </div>
      </div>

      {/* ─── Panneau formulaire ──────────────────────────────────────────── */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        {/* Halos discrets côté clair */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-teal-100/50 blur-3xl" />

        <div className="relative w-full max-w-md">
          {/* Logo (mobile / tablette) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30">
              <Droplets size={24} />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900">ClinikDia</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">ERP Hémodialyse</div>
            </div>
          </div>

          {mode === 'login' ? (
            <LoginForm
              users={users}
              onForgot={() => setMode('forgot')}
              onSuccess={() => navigate('/', { replace: true })}
              syncUser={syncUser}
            />
          ) : (
            <ForgotForm onReset={resetPasswordByEmail} onBack={() => setMode('login')} />
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {settings.nom} — Accès réservé au personnel autorisé.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  users,
  onForgot,
  onSuccess,
  syncUser,
}: {
  users: { id: string; prenom: string; nom: string; email: string; role: 'admin' | 'utilisateur'; actif: boolean }[];
  onForgot: () => void;
  onSuccess: () => void;
  syncUser: (user: { id: string; email: string; nom: string; prenom: string; role: 'admin' | 'utilisateur'; permissions?: Partial<Permissions> }) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiPost<{
        user: {
          id: string;
          email: string;
          nom: string;
          prenom: string;
          role: 'admin' | 'utilisateur';
          permissions: Record<string, { access?: boolean; write?: boolean; delete?: boolean }>;
        };
      }>('/auth/login', { email, password });
      syncUser(response.user);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur de connexion. Vérifiez votre serveur ou vos identifiants.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-[1.7rem] font-extrabold tracking-tight text-slate-900">Bon retour 👋</h1>
      <p className="mt-1.5 text-[15px] text-slate-500">Connectez-vous pour accéder à votre espace de travail.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="Adresse email">
          <div className="relative">
            <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="vous@clinikdia.sn" className="pl-11" autoFocus autoComplete="email" />
          </div>
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Mot de passe</span>
            <button type="button" onClick={onForgot} className="text-[13px] font-semibold text-brand-600 transition hover:text-brand-500">
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" className="pl-11 pr-11" autoComplete="current-password" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full justify-center gap-2 py-3.5 text-[15px]">
          {loading ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      {/* Comptes de démonstration */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Comptes de démonstration</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => { setEmail(u.email); setPassword(DEFAULT_PASSWORD); setError(''); }}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ' + (u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700')}>
                {initials(u.nom, u.prenom)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-slate-800">{u.prenom} {u.nom}</span>
                <span className="block truncate text-[11.5px] text-slate-400">{u.email}</span>
              </span>
              <Badge tone={u.role === 'admin' ? 'purple' : 'slate'}>{roleUserLabel[u.role].label}</Badge>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          Un clic pré-remplit les identifiants · mot de passe : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{DEFAULT_PASSWORD}</code>
        </p>
      </div>
    </>
  );
}

function ForgotForm({
  onReset,
  onBack,
}: {
  onReset: (email: string, newPwd: string, phoneVerify: string) => { ok: boolean; error?: string };
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) return setError('La confirmation ne correspond pas au nouveau mot de passe.');
    const res = onReset(email, next, phone);
    if (res.ok) setDone(true);
    else setError(res.error ?? 'Erreur.');
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <CheckCircle2 size={30} />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Mot de passe réinitialisé</h1>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          Vous pouvez désormais vous connecter avec votre nouveau mot de passe.
        </p>
        <Button className="mt-7 w-full justify-center" onClick={onBack}><ArrowLeft size={16} /> Retour à la connexion</Button>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-500">
        <ArrowLeft size={15} /> Retour à la connexion
      </button>
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <KeyRound size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Mot de passe oublié</h1>
          <p className="text-sm text-slate-500">Réinitialisez l'accès à votre compte.</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Adresse email du compte">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="vous@clinikdia.sn" className="pl-11" autoFocus />
          </div>
        </Field>
        <Field label="Vérification — 4 derniers chiffres du téléphone enregistré">
          <div className="relative">
            <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input inputMode="numeric" maxLength={4} value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }} placeholder="••••" className="pl-11" />
          </div>
        </Field>
        <Field label="Nouveau mot de passe">
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type={show ? 'text' : 'password'} value={next} onChange={(e) => { setNext(e.target.value); setError(''); }} placeholder="8+ caractères, lettres et chiffres" className="pl-11 pr-11" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Confirmer le nouveau mot de passe">
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); }} placeholder="••••••••" className="pl-11" />
          </div>
        </Field>

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" className="w-full justify-center"><KeyRound size={16} /> Réinitialiser le mot de passe</Button>
      </form>

      <p className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-500">
        Pour votre sécurité, la réinitialisation exige les 4 derniers chiffres du téléphone enregistré sur le compte. Après plusieurs essais, l'accès est temporairement bloqué.
      </p>
    </>
  );
}
