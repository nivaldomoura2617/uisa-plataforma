'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, Plus, LogOut, ChevronLeft, Sliders, Shield } from 'lucide-react'
import type { AppRole } from '@/lib/permissions'
import { UisaLogo } from '@/components/UisaLogo'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Props {
  user: { name?: string; email?: string }
  appRole: AppRole
}

const ROLE_CONFIG: Record<AppRole, { label: string; bg: string; color: string }> = {
  VISUALIZADOR: { label: 'Visualizador', bg: 'rgba(158,158,158,0.12)', color: 'var(--text-muted)' },
  ANALISTA:     { label: 'Analista',     bg: 'rgba(59,130,246,0.12)',  color: '#60A5FA' },
  MODERADOR:    { label: 'Moderador',    bg: 'rgba(0,121,96,0.12)',    color: 'var(--uisa-green)' },
  ADMIN_APP:    { label: 'Admin',        bg: 'rgba(245,196,0,0.12)',   color: 'var(--uisa-yellow)' },
}

export function ViabilidadeSidebar({ user, appRole }: Props) {
  const path       = usePathname()
  const roleConfig = ROLE_CONFIG[appRole]
  const isMod      = ['MODERADOR','ADMIN_APP'].includes(appRole)
  const canCreate  = ['ANALISTA','MODERADOR','ADMIN_APP'].includes(appRole)

  const navItems = [
    { href: '/viabilidade',              label: 'Painel de Estudos',  icon: LayoutDashboard },
    ...(canCreate ? [{ href: '/viabilidade/novo',          label: 'Novo Estudo',        icon: Plus }] : []),
    ...(isMod     ? [{ href: '/viabilidade/configuracoes', label: 'Premissas Padrão',   icon: Sliders }] : []),
  ]

  return (
    <aside className="sidebar w-56 flex flex-col min-h-screen sticky top-0 shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Portal
          </Link>
          <ThemeToggle />
        </div>
        <UisaLogo size="sm" variant="full" />
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-2" style={{ color: 'var(--text-muted)' }}>
          Viabilidade Econômica
        </p>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: roleConfig.bg, color: roleConfig.color }}
        >
          <Shield className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-wider">{roleConfig.label}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {user.name ?? user.email?.split('@')[0]}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="sidebar-link w-full mt-1 hover:text-red-500"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
