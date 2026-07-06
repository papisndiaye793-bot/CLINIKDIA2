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
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DEFAULT_PASSWORD } from '@/data/seed';
import { Button, Field, Input, Badge } from '@/components/ui';
import { roleUserLabel } from '@/lib/labels';
import { initials } from '@/lib/utils';
import { apiPost, ApiError } from '@/lib/api';

const features = [
  { icon: Users, label: 'Patients & séances de dialyse' },
  { icon: Activity, label: 'Générateurs, stocks & maintenance' },
  { icon: Receipt, label: 'Facturation, dépenses & RH' },
  { icon: ShieldCheck, label: 'Accès sécurisé & conformités QHSE' },
];

export default function Login() {
  const { login, resetPasswordByEmail, authenticated, users, settings, setCurrentUser } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  if (authenticated) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-slate-50 to-teal-50 p-4">
      {/* Décor d'arrière-plan */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 md:grid-cols-2">
        {/* Présentation */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-9 text-white md:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Droplets size={26} />
              </div>
              <div>
                <div className="text-lg font-extrabold tracking-tight">ClinikDia</div>
                <div className="text-xs text-white/70">ERP Hémodialyse</div>
              </div>
            </div>
            <h2 className="mt-10 text-2xl font-bold leading-snug">Gérez votre centre de dialyse en toute sérénité.</h2>
            <ul className="mt-6 space-y-3">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <f.icon size={16} />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-8 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
            <div>
              <div className="text-xl font-bold">{settings.nbPostes}</div>
              <div className="text-[11px] text-white/60">Postes</div>
            </div>
            <div>
              <div className="text-xl font-bold">11</div>
              <div className="text-[11px] text-white/60">Modules</div>
            </div>
            <div>
              <div className="text-xl font-bold">24/7</div>
              <div className="text-[11px] text-white/60">Disponible</div>
            </div>
          </div>
          <div className="relative mt-4 text-xs text-white/60">{settings.nom} · {settings.adresse}</div>
        </div>

        {/* Panneau droit */}
        <div className="p-8 sm:p-10">
          {/* Logo mobile */}
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Droplets size={22} />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-800">ClinikDia</div>
              <div className="text-[11px] text-slate-400">ERP Hémodialyse</div>
            </div>
          </div>

          {mode === 'login' ? (
            <LoginForm
              users={users}
              onLogin={login}
              onForgot={() => setMode('forgot')}
              onSuccess={() => navigate('/', { replace: true })}
              setCurrentUser={setCurrentUser}
            />
          ) : (
            <ForgotForm onReset={resetPasswordByEmail} onBack={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  users,
  onLogin,
  onForgot,
  onSuccess,
  setCurrentUser,
}: {
  users: { id: string; prenom: string; nom: string; email: string; role: 'admin' | 'utilisateur'; actif: boolean }[];
  onLogin: (email: string, password: string) => { ok: boolean; error?: string };
  onForgot: () => void;
  onSuccess: () => void;
  setCurrentUser: (id: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiPost<{ user: { email: string } }>('/auth/login', { email, password });
      const localUser = users.find((u) => u.email.toLowerCase() === response.user.email.toLowerCase());
      if (localUser) {
        setCurrentUser(localUser.id);
      }
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      const res = onLogin(email, password);
      if (res.ok) onSuccess();
      else setError(res.error ?? 'Échec de la connexion.');
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800">Bon retour 👋</h1>
      <p className="mt-1 text-sm text-slate-500">Connectez-vous pour accéder à votre espace.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Adresse email">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="vous@clinikdia.sn" className="pl-9" autoFocus />
          </div>
        </Field>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Mot de passe</span>
            <button type="button" onClick={onForgot} className="text-xs font-medium text-brand-600 hover:underline">
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" className="pl-9 pr-9" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

        <Button type="submit" className="w-full"><LogIn size={16} /> Se connecter</Button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Comptes de démonstration</span>
          <span className="text-[11px] text-slate-400">Mot de passe : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{DEFAULT_PASSWORD}</code></span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => { setEmail(u.email); setPassword(DEFAULT_PASSWORD); setError(''); }}
              className="group flex items-center gap-2.5 rounded-xl border border-slate-200 px-2.5 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700">
                {initials(u.nom, u.prenom)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-700">{u.prenom} {u.nom}</span>
                <span className="block truncate text-[11px] text-slate-400">{u.email}</span>
              </span>
              <Badge tone={u.role === 'admin' ? 'purple' : 'slate'}>{roleUserLabel[u.role].label}</Badge>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Cliquez sur un compte pour pré-remplir les identifiants.</p>
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
      <div className="flex flex-col items-center py-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Mot de passe réinitialisé</h1>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Vous pouvez désormais vous connecter avec votre nouveau mot de passe.
        </p>
        <Button className="mt-6 w-full" onClick={onBack}><ArrowLeft size={16} /> Retour à la connexion</Button>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft size={15} /> Retour à la connexion
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <KeyRound size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mot de passe oublié</h1>
          <p className="text-sm text-slate-500">Réinitialisez l'accès à votre compte.</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Adresse email du compte">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="vous@clinikdia.sn" className="pl-9" autoFocus />
          </div>
        </Field>
        <Field label="Vérification — 4 derniers chiffres du téléphone enregistré">
          <div className="relative">
            <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input inputMode="numeric" maxLength={4} value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }} placeholder="••••" className="pl-9" />
          </div>
        </Field>
        <Field label="Nouveau mot de passe">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type={show ? 'text' : 'password'} value={next} onChange={(e) => { setNext(e.target.value); setError(''); }} placeholder="8+ caractères, lettres et chiffres" className="pl-9 pr-9" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Confirmer le nouveau mot de passe">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); }} placeholder="••••••••" className="pl-9" />
          </div>
        </Field>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

        <Button type="submit" className="w-full"><KeyRound size={16} /> Réinitialiser le mot de passe</Button>
      </form>

      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        Pour votre sécurité, la réinitialisation exige les 4 derniers chiffres du téléphone enregistré sur le compte. Après plusieurs essais, l'accès est temporairement bloqué.
      </p>
    </>
  );
}
