import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Patient,
  Staff,
  Machine,
  Maintenance,
  Seance,
  Prescription,
  ArticleStock,
  MouvementStock,
  Facture,
  ClinicSettings,
  User,
  Permissions,
  AuditLog,
  AuditAction,
  Channel,
  ChatMessage,
  Extincteur,
  Controle,
  Certification,
  Depense,
  Archive,
  DocumentRH,
} from '@/types';
import * as seed from '@/data/seed';
import { validatePassword } from '@/lib/utils';
import { DEFAULT_BAREME, type PaieBareme } from '@/lib/paie';
import { defaultPermissions, normalizePermissions } from '@/lib/permissions';

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Anti-force brute (ISO/IEC 27002 — 8.5) ─────────────────────────────────
// Suivi en mémoire (non persisté) des tentatives échouées par email.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const loginAttempts = new Map<string, { count: number; until: number }>();

function checkLockout(email: string): string | null {
  const rec = loginAttempts.get(email);
  if (rec && rec.until > Date.now()) {
    const min = Math.ceil((rec.until - Date.now()) / 60000);
    return `Trop de tentatives. Compte temporairement bloqué (${min} min).`;
  }
  return null;
}
function registerFailure(email: string) {
  const rec = loginAttempts.get(email) ?? { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.until = Date.now() + LOCKOUT_MS;
  loginAttempts.set(email, rec);
}
function clearFailures(email: string) {
  loginAttempts.delete(email);
}
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

interface State {
  patients: Patient[];
  staff: Staff[];
  machines: Machine[];
  maintenances: Maintenance[];
  seances: Seance[];
  prescriptions: Prescription[];
  articlesStock: ArticleStock[];
  mouvementsStock: MouvementStock[];
  factures: Facture[];
  settings: ClinicSettings;
  users: User[];
  currentUserId: string;
  authenticated: boolean;
  authHydrated: boolean;
  auditLogs: AuditLog[];
  channels: Channel[];
  chatMessages: ChatMessage[];
  setAuthHydrated: (value: boolean) => void;
  extincteurs: Extincteur[];
  controles: Controle[];
  certifications: Certification[];
  paieBareme: PaieBareme;
  depenses: Depense[];
  exercice: number;
  archives: Archive[];
  documentsRH: DocumentRH[];

  // Patients
  addPatient: (p: Omit<Patient, 'id' | 'code' | 'createdAt'>) => void;
  updatePatient: (id: string, p: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  setPatients: (patients: Patient[]) => void;

  // Staff
  addStaff: (s: Omit<Staff, 'id'>) => void;
  updateStaff: (id: string, s: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;

  // Machines
  updateMachine: (id: string, m: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;

  // Maintenances
  addMaintenance: (m: Omit<Maintenance, 'id'>) => void;
  updateMaintenance: (id: string, m: Partial<Maintenance>) => void;
  deleteMaintenance: (id: string) => void;

  // Séances
  addSeance: (s: Omit<Seance, 'id'>) => void;
  updateSeance: (id: string, s: Partial<Seance>) => void;
  deleteSeance: (id: string) => void;

  // Prescriptions
  addPrescription: (p: Omit<Prescription, 'id'>) => void;
  updatePrescription: (id: string, p: Partial<Prescription>) => void;
  deletePrescription: (id: string) => void;

  // Stock
  addArticle: (a: Omit<ArticleStock, 'id'>) => void;
  updateArticle: (id: string, a: Partial<ArticleStock>) => void;
  deleteArticle: (id: string) => void;
  addMouvement: (m: Omit<MouvementStock, 'id'>) => void;

  // Factures
  addFacture: (f: Omit<Facture, 'id' | 'numero'>) => void;
  updateFacture: (id: string, f: Partial<Facture>) => void;
  deleteFacture: (id: string) => void;

  // Authentification
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  changePassword: (userId: string, currentPwd: string, newPwd: string) => { ok: boolean; error?: string };
  resetPasswordByEmail: (email: string, newPwd: string, phoneVerify: string) => { ok: boolean; error?: string };
  syncUser: (user: { id: string; email: string; nom: string; prenom: string; role: 'admin' | 'utilisateur'; permissions?: Partial<Permissions> }) => void;

  // Utilisateurs & RBAC
  setCurrentUser: (id: string) => void;
  addUser: (u: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;
  logAction: (action: AuditAction, module: string, detail: string) => void;

  // Chat
  sendMessage: (text: string, channel: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  addChannel: (label: string, description: string) => string;
  updateChannel: (id: string, c: Partial<Channel>) => void;
  deleteChannel: (id: string) => void;

  // QHSE — extincteurs
  addExtincteur: (e: Omit<Extincteur, 'id'>) => void;
  updateExtincteur: (id: string, e: Partial<Extincteur>) => void;
  deleteExtincteur: (id: string) => void;

  // QHSE — contrôles réglementaires
  addControle: (c: Omit<Controle, 'id'>) => void;
  updateControle: (id: string, c: Partial<Controle>) => void;
  deleteControle: (id: string) => void;

  // QHSE — certifications
  addCertification: (c: Omit<Certification, 'id'>) => void;
  updateCertification: (id: string, c: Partial<Certification>) => void;
  deleteCertification: (id: string) => void;

  // GRH — documents administratifs établis
  addDocumentRH: (d: Omit<DocumentRH, 'id'>) => DocumentRH;
  deleteDocumentRH: (id: string) => void;

  // Paie — barème des taux (IPRES, CSS, IPM, IR, TRIMF)
  updatePaieBareme: (b: PaieBareme) => void;

  // Dépenses
  addDepense: (d: Omit<Depense, 'id' | 'code'>) => void;
  updateDepense: (id: string, d: Partial<Depense>) => void;
  deleteDepense: (id: string) => void;

  // Exercice / clôture annuelle
  demarrerNouvelleAnnee: () => void;

  updateSettings: (s: Partial<ClinicSettings>) => void;
  resetData: () => void;
}

const seedState = () => ({
  patients: seed.patients,
  staff: seed.staff,
  machines: seed.machines,
  maintenances: seed.maintenances,
  seances: seed.seances,
  prescriptions: seed.prescriptions,
  articlesStock: seed.articlesStock,
  mouvementsStock: seed.mouvementsStock,
  factures: seed.factures,
  settings: seed.settings,
  users: seed.users,
  currentUserId: seed.users[0].id,
  authenticated: false,
  authHydrated: false,
  auditLogs: seed.auditLogs,
  channels: seed.channels,
  chatMessages: seed.chatMessages,
  extincteurs: seed.extincteurs,
  controles: seed.controles,
  certifications: seed.certifications,
  paieBareme: DEFAULT_BAREME,
  depenses: seed.depenses,
  exercice: new Date().getFullYear(),
  archives: [],
  documentsRH: [],
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seedState(),

      addPatient: (p) =>
        set((st) => {
          const n = st.patients.length + 1;
          return {
            patients: [
              { ...p, id: uid(), code: `PAT-${String(n).padStart(4, '0')}`, createdAt: new Date().toISOString() },
              ...st.patients,
            ],
          };
        }),
      updatePatient: (id, p) =>
        set((st) => ({ patients: st.patients.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      deletePatient: (id) => set((st) => ({ patients: st.patients.filter((x) => x.id !== id) })),
      setPatients: (patients) => set({ patients }),

      addStaff: (s) => set((st) => ({ staff: [{ ...s, id: uid() }, ...st.staff] })),
      updateStaff: (id, s) =>
        set((st) => ({ staff: st.staff.map((x) => (x.id === id ? { ...x, ...s } : x)) })),
      deleteStaff: (id) => set((st) => ({ staff: st.staff.filter((x) => x.id !== id) })),

      updateMachine: (id, m) =>
        set((st) => ({ machines: st.machines.map((x) => (x.id === id ? { ...x, ...m } : x)) })),
      deleteMachine: (id) =>
        set((st) => ({
          machines: st.machines.filter((x) => x.id !== id),
          maintenances: st.maintenances.filter((x) => x.machineId !== id),
        })),

      addMaintenance: (m) => set((st) => ({ maintenances: [{ ...m, id: uid() }, ...st.maintenances] })),
      updateMaintenance: (id, m) =>
        set((st) => ({ maintenances: st.maintenances.map((x) => (x.id === id ? { ...x, ...m } : x)) })),
      deleteMaintenance: (id) =>
        set((st) => ({ maintenances: st.maintenances.filter((x) => x.id !== id) })),

      addSeance: (s) => set((st) => ({ seances: [{ ...s, id: uid() }, ...st.seances] })),
      updateSeance: (id, s) =>
        set((st) => ({ seances: st.seances.map((x) => (x.id === id ? { ...x, ...s } : x)) })),
      deleteSeance: (id) => set((st) => ({ seances: st.seances.filter((x) => x.id !== id) })),

      addPrescription: (p) =>
        set((st) => ({
          prescriptions: [
            { ...p, id: uid() },
            ...st.prescriptions.map((x) => (x.patientId === p.patientId ? { ...x, active: false } : x)),
          ],
        })),
      updatePrescription: (id, p) =>
        set((st) => ({ prescriptions: st.prescriptions.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      deletePrescription: (id) =>
        set((st) => ({ prescriptions: st.prescriptions.filter((x) => x.id !== id) })),

      addArticle: (a) => set((st) => ({ articlesStock: [{ ...a, id: uid() }, ...st.articlesStock] })),
      updateArticle: (id, a) =>
        set((st) => ({ articlesStock: st.articlesStock.map((x) => (x.id === id ? { ...x, ...a } : x)) })),
      deleteArticle: (id) =>
        set((st) => ({
          articlesStock: st.articlesStock.filter((x) => x.id !== id),
          mouvementsStock: st.mouvementsStock.filter((x) => x.articleId !== id),
        })),
      addMouvement: (m) =>
        set((st) => ({
          mouvementsStock: [{ ...m, id: uid() }, ...st.mouvementsStock],
          articlesStock: st.articlesStock.map((x) =>
            x.id === m.articleId
              ? { ...x, quantite: x.quantite + (m.type === 'entree' ? m.quantite : -m.quantite) }
              : x
          ),
        })),

      addFacture: (f) =>
        set((st) => {
          // Numérotation séparée : PRO- pour les pro forma, FAC- pour les factures
          const sameKind = st.factures.filter((x) => !!x.proforma === !!f.proforma).length + 1;
          const prefix = f.proforma ? 'PRO' : 'FAC';
          const year = new Date().getFullYear();
          return {
            factures: [{ ...f, id: uid(), numero: `${prefix}-${year}-${String(sameKind).padStart(4, '0')}` }, ...st.factures],
          };
        }),
      updateFacture: (id, f) =>
        set((st) => ({ factures: st.factures.map((x) => (x.id === id ? { ...x, ...f } : x)) })),
      deleteFacture: (id) => set((st) => ({ factures: st.factures.filter((x) => x.id !== id) })),

      // ─── Authentification ───────────────────────────────────────────────
      login: (email, password) => {
        const key = email.trim().toLowerCase();
        const locked = checkLockout(key);
        if (locked) return { ok: false, error: locked };
        const u = get().users.find((x) => x.email.toLowerCase() === key);
        // Message générique (pas de divulgation de l'existence du compte) — 8.5
        if (!u || u.password !== password) {
          registerFailure(key);
          if (u && !u.actif) return { ok: false, error: 'Ce compte est désactivé. Contactez un administrateur.' };
          return { ok: false, error: 'Identifiants incorrects.' };
        }
        if (!u.actif) return { ok: false, error: 'Ce compte est désactivé. Contactez un administrateur.' };
        clearFailures(key);
        set({ currentUserId: u.id, authenticated: true });
        get().updateUser(u.id, { derniereConnexion: new Date().toISOString() });
        get().logAction('login', 'auth', 'Connexion au système');
        return { ok: true };
      },
      logout: () => {
        get().logAction('logout', 'auth', 'Déconnexion');
        // Déconnexion complète : on efface aussi l'utilisateur courant — 8.5
        set({ authenticated: false, currentUserId: '' });
      },
      setAuthHydrated: (value: boolean) => set({ authHydrated: value }),
      changePassword: (userId, currentPwd, newPwd) => {
        const u = get().users.find((x) => x.id === userId);
        if (!u) return { ok: false, error: 'Utilisateur introuvable.' };
        if (u.password !== currentPwd) return { ok: false, error: 'Mot de passe actuel incorrect.' };
        const policyError = validatePassword(newPwd);
        if (policyError) return { ok: false, error: policyError };
        if (newPwd === currentPwd) return { ok: false, error: 'Le nouveau mot de passe doit être différent de l’ancien.' };
        get().updateUser(userId, { password: newPwd });
        get().logAction('update', 'comptes', 'Mot de passe modifié');
        return { ok: true };
      },
      resetPasswordByEmail: (email, newPwd, phoneVerify) => {
        const key = email.trim().toLowerCase();
        const locked = checkLockout('reset:' + key);
        if (locked) return { ok: false, error: locked };
        const u = get().users.find((x) => x.email.toLowerCase() === key);
        if (!u || !u.actif) {
          registerFailure('reset:' + key);
          return { ok: false, error: 'Vérification impossible. Contactez un administrateur.' };
        }
        // Facteur de connaissance : 4 derniers chiffres du téléphone enregistré (du membre lié) — 5.17/8.5
        const staff = get().staff.find((s) => s.id === u.staffId);
        const phone = onlyDigits(staff?.telephone ?? '');
        if (!phone) {
          return { ok: false, error: 'Aucun numéro vérifiable n’est associé à ce compte. Contactez un administrateur.' };
        }
        if (onlyDigits(phoneVerify).slice(-4) !== phone.slice(-4)) {
          registerFailure('reset:' + key);
          return { ok: false, error: 'Vérification impossible. Contactez un administrateur.' };
        }
        const policyError = validatePassword(newPwd);
        if (policyError) return { ok: false, error: policyError };
        clearFailures('reset:' + key);
        get().updateUser(u.id, { password: newPwd });
        set((st) => ({
          auditLogs: [
            { id: uid(), userId: u.id, userName: `${u.prenom} ${u.nom}`, action: 'update' as AuditAction, module: 'auth', detail: 'Réinitialisation du mot de passe (libre-service)', timestamp: new Date().toISOString() },
            ...st.auditLogs,
          ].slice(0, 500),
        }));
        return { ok: true };
      },

      // ─── Utilisateurs & RBAC ────────────────────────────────────────────
      syncUser: (user) =>
        set((st) => {
          const email = user.email.toLowerCase();
          const permissions = normalizePermissions(user.permissions ?? defaultPermissions(user.role));
          const existingById = st.users.find((x) => x.id === user.id);
          const existingByEmail = st.users.find((x) => x.email.toLowerCase() === email);
          if (existingById) {
            const updated: User = {
              ...existingById,
              email,
              nom: user.nom,
              prenom: user.prenom,
              role: user.role,
              permissions,
              actif: true,
              password: existingById.password || '',
              createdAt: existingById.createdAt,
            };
            return {
              users: st.users.map((x) => (x.id === existingById.id ? updated : x)),
              currentUserId: updated.id,
              authenticated: true,
            };
          }
          if (existingByEmail) {
            const updated: User = {
              ...existingByEmail,
              email,
              nom: user.nom,
              prenom: user.prenom,
              role: user.role,
              permissions,
              actif: true,
              password: existingByEmail.password || '',
              createdAt: existingByEmail.createdAt,
            };
            return {
              users: st.users.map((x) => (x.id === existingByEmail.id ? updated : x)),
              currentUserId: updated.id,
              authenticated: true,
            };
          }
          const createdAt = new Date().toISOString();
          return {
            users: [
              {
                id: user.id,
                email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role,
                permissions,
                actif: true,
                password: '',
                createdAt,
              },
              ...st.users,
            ],
            currentUserId: user.id,
            authenticated: true,
          };
        }),
      setCurrentUser: (id) => set({ currentUserId: id, authenticated: true }),
      addUser: (u) => set((st) => ({ users: [{ ...u, id: uid(), createdAt: new Date().toISOString() }, ...st.users] })),
      updateUser: (id, u) =>
        set((st) => ({ users: st.users.map((x) => (x.id === id ? { ...x, ...u } : x)) })),
      deleteUser: (id) => set((st) => ({ users: st.users.filter((x) => x.id !== id) })),
      logAction: (action, module, detail) =>
        set((st) => {
          const u = st.users.find((x) => x.id === st.currentUserId);
          if (!u) return {};
          const entry: AuditLog = {
            id: uid(),
            userId: u.id,
            userName: `${u.prenom} ${u.nom}`,
            action,
            module,
            detail,
            timestamp: new Date().toISOString(),
          };
          return { auditLogs: [entry, ...st.auditLogs].slice(0, 500) };
        }),

      // ─── Chat ───────────────────────────────────────────────────────────
      sendMessage: (text, channel) =>
        set((st) => {
          const u = st.users.find((x) => x.id === st.currentUserId);
          if (!u || !text.trim()) return {};
          return {
            chatMessages: [
              ...st.chatMessages,
              { id: uid(), channel, authorId: u.id, authorName: `${u.prenom} ${u.nom}`, text: text.trim(), timestamp: new Date().toISOString() },
            ],
          };
        }),
      addChannel: (label, description) => {
        const base = slugify(label) || 'canal';
        let id = base;
        const existing = new Set(get().channels.map((c) => c.id));
        let i = 2;
        while (existing.has(id)) id = `${base}-${i++}`;
        set((st) => ({ channels: [...st.channels, { id, label: label.trim() || id, description: description.trim() }] }));
        get().logAction('create', 'chat', `Canal créé : #${label}`);
        return id;
      },
      updateChannel: (id, c) =>
        set((st) => ({ channels: st.channels.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteChannel: (id) =>
        set((st) => ({
          channels: st.channels.filter((x) => x.id !== id),
          chatMessages: st.chatMessages.filter((m) => m.channel !== id),
        })),

      toggleReaction: (messageId, emoji) =>
        set((st) => {
          const uidc = st.currentUserId;
          return {
            chatMessages: st.chatMessages.map((m) => {
              if (m.id !== messageId) return m;
              const reactions = { ...(m.reactions ?? {}) };
              const users = reactions[emoji] ?? [];
              if (users.includes(uidc)) {
                const next = users.filter((x) => x !== uidc);
                if (next.length) reactions[emoji] = next;
                else delete reactions[emoji];
              } else {
                reactions[emoji] = [...users, uidc];
              }
              return { ...m, reactions };
            }),
          };
        }),

      // ─── QHSE — extincteurs ─────────────────────────────────────────────
      addExtincteur: (e) => set((st) => ({ extincteurs: [{ ...e, id: uid() }, ...st.extincteurs] })),
      updateExtincteur: (id, e) =>
        set((st) => ({ extincteurs: st.extincteurs.map((x) => (x.id === id ? { ...x, ...e } : x)) })),
      deleteExtincteur: (id) => set((st) => ({ extincteurs: st.extincteurs.filter((x) => x.id !== id) })),

      // ─── QHSE — contrôles ───────────────────────────────────────────────
      addControle: (c) => set((st) => ({ controles: [{ ...c, id: uid() }, ...st.controles] })),
      updateControle: (id, c) =>
        set((st) => ({ controles: st.controles.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteControle: (id) => set((st) => ({ controles: st.controles.filter((x) => x.id !== id) })),

      addCertification: (c) => set((st) => ({ certifications: [{ ...c, id: uid() }, ...st.certifications] })),
      updateCertification: (id, c) =>
        set((st) => ({ certifications: st.certifications.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteCertification: (id) => set((st) => ({ certifications: st.certifications.filter((x) => x.id !== id) })),

      addDocumentRH: (d) => {
        const doc: DocumentRH = { ...d, id: uid() };
        set((st) => ({ documentsRH: [doc, ...st.documentsRH] }));
        get().logAction('create', 'grh', `Document établi : ${d.titre} — ${d.staffNom}`);
        return doc;
      },
      deleteDocumentRH: (id) =>
        set((st) => ({ documentsRH: st.documentsRH.filter((x) => x.id !== id) })),

      updatePaieBareme: (b) => set({ paieBareme: b }),

      // ─── Dépenses ───────────────────────────────────────────────────────
      addDepense: (d) =>
        set((st) => {
          const n = st.depenses.length + 1;
          return { depenses: [{ ...d, id: uid(), code: `DEP-${String(n).padStart(4, '0')}` }, ...st.depenses] };
        }),
      updateDepense: (id, d) =>
        set((st) => ({ depenses: st.depenses.map((x) => (x.id === id ? { ...x, ...d } : x)) })),
      deleteDepense: (id) => set((st) => ({ depenses: st.depenses.filter((x) => x.id !== id) })),

      // ─── Exercice / clôture annuelle ────────────────────────────────────
      demarrerNouvelleAnnee: () =>
        set((st) => {
          const closing = st.exercice;
          const archive: Archive = {
            year: closing,
            closedAt: new Date().toISOString(),
            seances: st.seances,
            factures: st.factures,
            depenses: st.depenses,
            mouvementsStock: st.mouvementsStock,
          };
          const u = st.users.find((x) => x.id === st.currentUserId);
          const log: AuditLog = {
            id: uid(),
            userId: u?.id ?? '',
            userName: u ? `${u.prenom} ${u.nom}` : '—',
            action: 'update',
            module: 'parametres',
            detail: `Clôture de l'exercice ${closing} et ouverture de ${closing + 1}`,
            timestamp: new Date().toISOString(),
          };
          return {
            archives: [archive, ...st.archives.filter((a) => a.year !== closing)],
            exercice: closing + 1,
            // Remise à zéro des données transactionnelles (les patients, le
            // personnel, le parc et le stock sont conservés)
            seances: [],
            factures: [],
            depenses: [],
            mouvementsStock: [],
            auditLogs: [log, ...st.auditLogs].slice(0, 500),
          };
        }),

      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      resetData: () => set(seedState()),
    }),
    {
      name: 'clinikdia-store',
      version: 14,
      // Conserve les données existantes et complète les nouveaux champs
      // (identité légale, contrôles QHSE, canaux de messagerie…).
      migrate: (persisted) => {
        const p = persisted as Partial<State> | undefined;
        if (!p || !p.patients) return seedState();
        const persistedMsgs = (p.chatMessages ?? []).map((m) => ({ ...m, channel: m.channel ?? 'general' }));
        const ids = new Set(persistedMsgs.map((m) => m.id));
        const mergedMsgs = [...persistedMsgs, ...seed.chatMessages.filter((m) => !ids.has(m.id))];
        return {
          ...p,
          settings: { ...seed.settings, ...(p.settings ?? {}) },
          controles: p.controles ?? seed.controles,
          certifications: p.certifications ?? seed.certifications,
          paieBareme: Array.isArray((p.paieBareme as PaieBareme | undefined)?.cotisations) ? (p.paieBareme as PaieBareme) : DEFAULT_BAREME,
          channels: p.channels ?? seed.channels,
          chatMessages: mergedMsgs,
          exercice: p.exercice ?? new Date().getFullYear(),
          archives: p.archives ?? [],
          documentsRH: p.documentsRH ?? [],
        } as State;
      },
    }
  )
);
