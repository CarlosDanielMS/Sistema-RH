import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { Login } from '../pages/Login'
import { Dashboard } from '../pages/Dashboard'
import { Vagas } from '../pages/Vagas'
import { NovaVaga } from '../pages/NovaVaga'
import { DetalheVaga } from '../pages/DetalheVaga'
import { Candidatos } from '../pages/Candidatos'
import { NovoCandidato } from '../pages/NovoCandidato'
import { DetalheCandidato } from '../pages/DetalheCandidato'
import { EditarCandidato } from '../pages/EditarCandidato'
import { Pipeline } from '../pages/Pipeline'
import { Decisoes } from '../pages/Decisoes'
import { AnaliseVieses } from '../pages/AnaliseVieses'
import { Skills } from '../pages/Skills'
import { Configuracoes } from '../pages/Configuracoes'
import { AdminLogs } from '../pages/AdminLogs'
import { Marketing } from '../pages/Marketing'
import { Agenda } from '../pages/Agenda'
import { Notificacoes } from '../pages/Notificacoes'
import { CandidaturaPublica } from '../pages/CandidaturaPublica'
import { VagasPublicas } from '../pages/VagasPublicas'
import { Usuarios } from '../pages/Usuarios'
import { useAuth } from '../hooks/useAuth'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/vagas-abertas', element: <VagasPublicas /> },
  { path: '/candidatura', element: <CandidaturaPublica /> },
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/vagas', element: <Vagas /> },
      { path: '/vagas/nova', element: <NovaVaga /> },
      { path: '/vagas/:id', element: <DetalheVaga /> },
      { path: '/vagas/:id/editar', element: <NovaVaga /> },
      { path: '/candidatos', element: <Candidatos /> },
      { path: '/candidatos/novo', element: <NovoCandidato /> },
      { path: '/candidatos/:id', element: <DetalheCandidato /> },
      { path: '/candidatos/:id/editar', element: <EditarCandidato /> },
      { path: '/pipeline', element: <Pipeline /> },
      { path: '/decisoes', element: <Decisoes /> },
      { path: '/analises-vieses', element: <AnaliseVieses /> },
      { path: '/skills', element: <Skills /> },
      { path: '/marketing', element: <Marketing /> },
      { path: '/agenda', element: <Agenda /> },
      { path: '/notificacoes', element: <Notificacoes /> },
      { path: '/configuracoes',   element: <Configuracoes /> },
      { path: '/admin/usuarios',  element: <AdminGuard><Usuarios /></AdminGuard> },
      { path: '/admin/logs',      element: <AdminGuard><AdminLogs /></AdminGuard> },
    ],
  },
])
