import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../hooks/useAuth'

export function MainLayout() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar onLogout={logout} userName={user?.name || 'Usuário'} isAdmin={isAdmin} />
      <main className="flex-1 ml-60 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
