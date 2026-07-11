import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { apiGet, ApiError } from '@/lib/api';
import { normalizePermissions } from '@/lib/permissions';
import type { Permissions } from '@/types';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Planning from './pages/Planning';
import Machines from './pages/Machines';
import Prescriptions from './pages/Prescriptions';
import Personnel from './pages/Personnel';
import Stock from './pages/Stock';
import Facturation from './pages/Facturation';
import Paie from './pages/Paie';
import Reporting from './pages/Reporting';
import Parametres from './pages/Parametres';
import GRH from './pages/GRH';
import PointagePage from './pages/Pointage';
import Calendrier from './pages/Calendrier';
import Chat from './pages/Chat';
import QHSE from './pages/QHSE';
import Depenses from './pages/Depenses';
import Comptes from './pages/Comptes';
import Archives from './pages/Archives';

import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const authenticated = useStore((s) => s.authenticated);
  const authHydrated = useStore((s) => s.authHydrated);
  if (!authHydrated) return null;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'patients', element: <Patients /> },
      { path: 'patients/:id', element: <PatientDetail /> },
      { path: 'planning', element: <Planning /> },
      { path: 'calendrier', element: <Calendrier /> },
      { path: 'machines', element: <Machines /> },
      { path: 'prescriptions', element: <Prescriptions /> },
      { path: 'grh', element: <GRH /> },
      { path: 'pointage', element: <PointagePage /> },
      { path: 'personnel', element: <Personnel /> },
      { path: 'stock', element: <Stock /> },
      { path: 'facturation', element: <Facturation /> },
      { path: 'paie', element: <Paie /> },
      { path: 'depenses', element: <Depenses /> },
      { path: 'qhse', element: <QHSE /> },
      { path: 'chat', element: <Chat /> },
      { path: 'reporting', element: <Reporting /> },
      { path: 'archives', element: <Archives /> },
      { path: 'comptes', element: <Comptes /> },
      { path: 'parametres', element: <Parametres /> },
    ],
  },
], {
  // Opt-in anticipé aux comportements de React Router v7 (supprime les
  // avertissements « Future Flag Warning » en console).
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

function AuthHydrator() {
  const syncUser = useStore((s) => s.syncUser);
  const logout = useStore((s) => s.logout);
  const setAuthHydrated = useStore((s) => s.setAuthHydrated);

  useEffect(() => {
    apiGet<{
      id: string;
      email: string;
      nom: string;
      prenom: string;
      role: 'admin' | 'utilisateur';
      permissions?: Partial<Permissions>;
    }>('/auth/me')
      .then((user) => {
        syncUser({
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          permissions: normalizePermissions(user.permissions ?? {}),
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          void logout();
        }
      })
      .finally(() => {
        setAuthHydrated(true);
      });
  }, [syncUser, logout, setAuthHydrated]);

  return null;
}

export default function App() {
  return (
    <>
      <AuthHydrator />
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </>
  );
}
