import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { apiGet, ApiError } from '@/lib/api';
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
]);

function AuthHydrator() {
  const users = useStore((s) => s.users);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const logout = useStore((s) => s.logout);
  const setAuthHydrated = useStore((s) => s.setAuthHydrated);

  useEffect(() => {
    apiGet<{ id: string; email: string; role: string }>('/auth/me')
      .then((user) => {
        const local = users.find((u) => u.email.toLowerCase() === user.email.toLowerCase());
        if (local) setCurrentUser(local.id);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          void logout();
        }
      })
      .finally(() => {
        setAuthHydrated(true);
      });
  }, [users, setCurrentUser, logout, setAuthHydrated]);

  return null;
}

export default function App() {
  return (
    <>
      <AuthHydrator />
      <RouterProvider router={router} />
    </>
  );
}
