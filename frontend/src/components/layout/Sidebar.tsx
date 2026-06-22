import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Users, GitBranch,
  BookOpen, BarChart3, Zap, Settings, Brain, LogOut,
  Mail, CalendarDays, Bell, Activity, ShieldCheck, UserCog,
} from 'lucide-react'
import { cn } from '../../utils/helpers'

interface SidebarProps { onLogout: () => void; userName: string; isAdmin: boolean }

export function Sidebar({ onLogout, userName, isAdmin }: SidebarProps) {
  const sections = [
    {
      label: 'Principal',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      label: 'Recrutamento',
      items: [
        { to: '/vagas',      icon: Briefcase, label: 'Vagas' },
        { to: '/candidatos', icon: Users,     label: 'Candidatos' },
        { to: '/pipeline',   icon: GitBranch, label: 'Pipeline' },
      ],
    },
    {
      label: 'Análise & Decisão',
      items: [
        { to: '/decisoes',         icon: BookOpen,  label: 'Decisões' },
        { to: '/analises-vieses',  icon: BarChart3, label: 'Análise de Vieses' },
        { to: '/skills',           icon: Brain,     label: 'OpenClaw' },
      ],
    },
    {
      label: 'Comunicação',
      items: [
        { to: '/agenda',       icon: CalendarDays, label: 'Agenda' },
        { to: '/notificacoes', icon: Bell,          label: 'Notificações' },
        { to: '/marketing',    icon: Mail,          label: 'Marketing' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { to: '/configuracoes', icon: Settings, label: 'Configurações' },
        // Itens exclusivos do admin
        ...(isAdmin ? [
          { to: '/admin/usuarios', icon: UserCog,  label: 'Usuários' },
          { to: '/admin/logs',     icon: Activity, label: 'Monitor / Logs' },
        ] : []),
      ],
    },
  ]

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-slate-900 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">RH-IA</p>
            <p className="text-slate-400 text-xs leading-tight">Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {sections.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label: itemLabel }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + role badge + Logout */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? 'bg-amber-500' : 'bg-primary-500'}`}>
            <span className="text-white text-xs font-bold">
              {userName.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{userName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isAdmin
                ? <span className="flex items-center gap-0.5 text-amber-400 text-xs"><ShieldCheck className="w-3 h-3" /> Admin</span>
                : <span className="text-slate-400 text-xs">Usuário</span>
              }
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </aside>
  )
}
