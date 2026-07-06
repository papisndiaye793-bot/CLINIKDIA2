import { useEffect, useState } from 'react';
import { ShieldAlert, UserPlus, History, Power, KeyRound, Lock, SlidersHorizontal, Save, Eye, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  Modal,
  Field,
  Input,
  Select,
  Table,
  Th,
  Td,
  StatCard,
  RowActions,
  ConfirmDialog,
  EmptyState,
} from '@/components/ui';
import { initials } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import { MODULES, defaultPermissions, normalizePermissions } from '@/lib/permissions';
import { DEFAULT_PASSWORD } from '@/data/seed';
import type { User, RoleUser, Permissions, ModuleKey } from '@/types';

const tabs = [
  { id: 'comptes', key: 'co.tab.accounts', icon: KeyRound },
  { id: 'permissions', key: 'co.tab.access', icon: SlidersHorizontal },
  { id: 'journal', key: 'co.tab.journal', icon: History },
] as const;

export default function Comptes() {
  const { users, staff, auditLogs, addUser, updateUser, deleteUser, currentUserId, logAction } = useStore();
  const { isAdmin } = useAuth();
  const { t } = useT();
  const L = useLabels();
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('comptes');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permUserId, setPermUserId] = useState<string>('');
  const [del, setDel] = useState<User | null>(null);

  const openPermissions = (u: User) => {
    setPermUserId(u.id);
    setTab('permissions');
  };

  const [form, setForm] = useState({ prenom: '', nom: '', email: '', role: 'utilisateur' as RoleUser, staffId: '', password: DEFAULT_PASSWORD });
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title={t('nav.comptes')} />
        <Card className="p-10">
          <EmptyState icon={<Lock size={22} />} title={t('co.adminOnly')} hint={t('co.adminOnlyHint')} />
        </Card>
      </div>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm({ prenom: '', nom: '', email: '', role: 'utilisateur', staffId: '', password: DEFAULT_PASSWORD });
    setOpen(true);
  };
  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ prenom: u.prenom, nom: u.nom, email: u.email, role: u.role, staffId: u.staffId ?? '', password: u.password });
    setOpen(true);
  };
  const submit = () => {
    if (!form.prenom || !form.nom) return;
    if (editingId) {
      updateUser(editingId, { prenom: form.prenom, nom: form.nom, email: form.email, role: form.role, staffId: form.staffId || undefined });
      logAction('update', 'comptes', `Compte modifié : ${form.prenom} ${form.nom}`);
    } else {
      addUser({ prenom: form.prenom, nom: form.nom, email: form.email, role: form.role, staffId: form.staffId || undefined, password: form.password || DEFAULT_PASSWORD, actif: true, permissions: defaultPermissions(form.role) });
      logAction('create', 'comptes', `Compte créé : ${form.prenom} ${form.nom} (${form.role})`);
    }
    setOpen(false);
    setEditingId(null);
  };

  const toggleActif = (u: User) => {
    updateUser(u.id, { actif: !u.actif });
    logAction('update', 'comptes', `Compte ${u.actif ? 'désactivé' : 'réactivé'} : ${u.prenom} ${u.nom}`);
  };

  const admins = users.filter((u) => u.role === 'admin').length;
  const actifs = users.filter((u) => u.actif).length;

  return (
    <div>
      <PageHeader
        title={t('nav.comptes')}
        subtitle={t('co.subtitle')}
        action={tab === 'comptes' ? <Button onClick={openCreate}><UserPlus size={16} /> {t('co.newAccount')}</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('co.tab.accounts')} value={users.length} icon={<KeyRound size={18} />} tone="blue" hint={`${actifs} ${t('cf.active').toLowerCase()}`} />
        <StatCard label={t('co.admins')} value={admins} icon={<ShieldAlert size={18} />} tone="purple" />
        <StatCard label={t('co.trackedActions')} value={auditLogs.length} icon={<History size={18} />} tone="teal" />
      </div>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' + (tab === tb.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}
          >
            <tb.icon size={16} /> {t(tb.key)}
          </button>
        ))}
      </div>

      {tab === 'comptes' && (
        <Card>
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>{t('co.user')}</Th><Th>{t('cf.email')}</Th><Th>{t('cf.role')}</Th><Th>{t('co.access')}</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('common.actions')}</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const r = L.roleUserLabel[u.role];
                const nbModules = u.role === 'admin' ? MODULES.length : Object.values(u.permissions ?? {}).filter((p) => p.access).length;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(u.nom, u.prenom)}</span>
                        <div>
                          <div className="font-medium text-slate-800">{u.prenom} {u.nom}{u.id === currentUserId && <span className="ml-2 text-xs font-normal text-brand-600">({t('co.you')})</span>}</div>
                          <div className="text-xs text-slate-400">{t('co.createdOn')} {new Date(u.createdAt).toLocaleDateString('fr-FR')}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-500">{u.email}</Td>
                    <Td><Badge tone={r.tone}>{r.label}</Badge></Td>
                    <Td>
                      {u.role === 'admin'
                        ? <span className="text-xs text-slate-500">{t('co.allModules')}</span>
                        : <button onClick={() => openPermissions(u)} className="text-xs font-medium text-brand-600 hover:underline">{nbModules} · {t('co.manage')}</button>}
                    </Td>
                    <Td>
                      <button onClick={() => toggleActif(u)} title={u.actif ? t('co.deactivateTemp') : t('co.reactivate')}>
                        {u.actif ? <Badge tone="green">{t('cf.active')}</Badge> : <Badge tone="slate">{t('co.deactivated')}</Badge>}
                      </button>
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => openEdit(u)}
                        onDelete={u.id === currentUserId ? undefined : () => setDel(u)}
                        extra={
                          <>
                            {u.role !== 'admin' && (
                              <button
                                title={t('co.manageAccess')}
                                onClick={() => openPermissions(u)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-600 shadow-sm transition hover:bg-brand-50"
                              >
                                <SlidersHorizontal size={15} />
                              </button>
                            )}
                            <button
                              title={u.actif ? t('co.deactivateAccount') : t('co.reactivateAccount')}
                              onClick={() => toggleActif(u)}
                              className={'inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white shadow-sm transition ' + (u.actif ? 'border-slate-200 text-amber-600 hover:bg-amber-50' : 'border-slate-200 text-emerald-600 hover:bg-emerald-50')}
                            >
                              <Power size={15} />
                            </button>
                          </>
                        }
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'permissions' && (
        <AccessibilitesTab
          users={users}
          permUserId={permUserId}
          setPermUserId={setPermUserId}
          onSave={(u, perms) => {
            updateUser(u.id, { permissions: perms });
            logAction('update', 'comptes', `Accessibilités mises à jour : ${u.prenom} ${u.nom}`);
          }}
        />
      )}

      {tab === 'journal' && (
        <Card>
          <CardHeader title={t('co.tab.journal')} subtitle={t('co.journalSub')} />
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>{t('co.dateTime')}</Th><Th>{t('co.user')}</Th><Th>{t('co.action')}</Th><Th>{t('co.module')}</Th><Th>{t('co.detail')}</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((l) => {
                const a = L.auditActionLabel[l.action];
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap text-slate-500">{new Date(l.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</Td>
                    <Td className="font-medium">{l.userName}</Td>
                    <Td><Badge tone={a.tone}>{a.label}</Badge></Td>
                    <Td className="text-slate-500">{l.module}</Td>
                    <Td className="max-w-md whitespace-normal text-slate-600">{l.detail}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Création / édition compte */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? t('co.editAccount') : t('co.newAccountTitle')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={submit}><UserPlus size={16} /> {editingId ? t('common.save') : t('co.create')}</Button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('cf.firstname')}><Input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Field>
          <Field label={t('cf.name')}><Input value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          <Field label={t('cf.email')} className="col-span-2"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label={t('cf.role')}>
            <Select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {Object.entries(L.roleUserLabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label={t('co.linkedStaff')}>
            <Select value={form.staffId} onChange={(e) => set('staffId', e.target.value)}>
              <option value="">—</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
            </Select>
          </Field>
          {!editingId && (
            <Field label={t('co.initialPassword')} className="col-span-2">
              <Input value={form.password} onChange={(e) => set('password', e.target.value)} />
            </Field>
          )}
        </div>
        {!editingId && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            {form.role === 'admin' ? t('co.adminHint') : t('co.userHint')}
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title={t('co.deleteAccount')}
        message={<span className="font-semibold text-slate-700">{del?.prenom} {del?.nom}</span>}
        onConfirm={() => { if (del) { deleteUser(del.id); logAction('delete', 'comptes', `Compte supprimé : ${del.prenom} ${del.nom}`); } }}
        onClose={() => setDel(null)}
      />
    </div>
  );
}

// ─── Onglet Accessibilités ──────────────────────────────────────────────────
function AccessibilitesTab({
  users,
  permUserId,
  setPermUserId,
  onSave,
}: {
  users: User[];
  permUserId: string;
  setPermUserId: (id: string) => void;
  onSave: (u: User, perms: Permissions) => void;
}) {
  const { t } = useT();
  const selectableUsers = users.filter((u) => u.role !== 'admin');
  const selectedId = permUserId || selectableUsers[0]?.id || '';
  const selected = users.find((u) => u.id === selectedId);

  const [perms, setPerms] = useState<Permissions>(normalizePermissions(selected?.permissions));
  const [saved, setSaved] = useState(false);

  // Recharger les permissions quand l'utilisateur sélectionné change
  useEffect(() => {
    setPerms(normalizePermissions(selected?.permissions));
    setSaved(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: ModuleKey, field: 'access' | 'write' | 'delete') => {
    setSaved(false);
    setPerms((p) => {
      const next = { ...p, [key]: { ...p[key], [field]: !p[key][field] } };
      // Modifier / Supprimer impliquent l'accès
      if ((field === 'write' || field === 'delete') && next[key][field]) next[key].access = true;
      // Retirer l'accès retire les actions
      if (field === 'access' && !next[key].access) {
        next[key].write = false;
        next[key].delete = false;
      }
      return next;
    });
  };

  const setAll = (field: 'access' | 'write' | 'delete', value: boolean) => {
    setSaved(false);
    setPerms((p) => {
      const next = { ...p };
      MODULES.forEach((m) => {
        next[m.key] = { ...next[m.key], [field]: value };
        if ((field === 'write' || field === 'delete') && value) next[m.key].access = true;
        if (field === 'access' && !value) { next[m.key].write = false; next[m.key].delete = false; }
      });
      return next;
    });
  };

  if (selectableUsers.length === 0) {
    return (
      <Card className="p-10">
        <EmptyState icon={<SlidersHorizontal size={22} />} title={t('co.noUserToConfig')} hint={t('co.adminsHaveAll')} />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
      {/* Sélection de l'utilisateur */}
      <Card className="lg:col-span-1">
        <CardHeader title={t('co.user')} subtitle={t('co.chooseAccount')} />
        <div className="space-y-1 p-2">
          {selectableUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => setPermUserId(u.id)}
              className={'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ' + (u.id === selectedId ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50')}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(u.nom, u.prenom)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-700">{u.prenom} {u.nom}</span>
                <span className="block truncate text-xs text-slate-400">{u.email}</span>
              </span>
              {!u.actif && <Badge tone="slate">Off</Badge>}
            </button>
          ))}
        </div>
      </Card>

      {/* Matrice de permissions */}
      <Card className="lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-800">{t('co.tab.access')} — {selected?.prenom} {selected?.nom}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{t('co.accessHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-sm font-medium text-emerald-600">✓ {t('co.saved')}</span>}
            <Button onClick={() => { if (selected) { onSave(selected, perms); setSaved(true); } }}><Save size={16} /> {t('common.save')}</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t('co.menuModule')}</th>
                <PermHeader icon={<Eye size={13} />} label={t('co.access')} onAll={(v) => setAll('access', v)} allLabel={t('co.all')} noneLabel={t('co.none')} />
                <PermHeader icon={<Pencil size={13} />} label={t('common.edit')} onAll={(v) => setAll('write', v)} allLabel={t('co.all')} noneLabel={t('co.none')} />
                <PermHeader icon={<Trash2 size={13} />} label={t('common.delete')} onAll={(v) => setAll('delete', v)} allLabel={t('co.all')} noneLabel={t('co.none')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULES.map((m) => (
                <tr key={m.key} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{t(`nav.${m.key}`)}</td>
                  <PermCell checked={perms[m.key].access} onChange={() => toggle(m.key, 'access')} />
                  <PermCell checked={perms[m.key].write} onChange={() => toggle(m.key, 'write')} />
                  <PermCell checked={perms[m.key].delete} onChange={() => toggle(m.key, 'delete')} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{t('co.permLegend')}</p>
      </Card>
    </div>
  );
}

function PermHeader({ icon, label, onAll, allLabel, noneLabel }: { icon: React.ReactNode; label: string; onAll: (v: boolean) => void; allLabel: string; noneLabel: string }) {
  return (
    <th className="w-28 px-3 py-2.5 text-center">
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">{icon} {label}</span>
        <span className="flex gap-1 text-[10px]">
          <button onClick={() => onAll(true)} className="rounded px-1 text-brand-600 hover:underline">{allLabel}</button>
          <span className="text-slate-300">·</span>
          <button onClick={() => onAll(false)} className="rounded px-1 text-slate-400 hover:underline">{noneLabel}</button>
        </span>
      </div>
    </th>
  );
}

function PermCell({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <td className="px-3 py-2.5 text-center">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
    </td>
  );
}
