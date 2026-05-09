'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutGrid, Shield, LogOut, Users } from 'lucide-react'
import { UisaLogo } from '@/components/UisaLogo'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Props {
  user: { name?: string; email?: string; globalRole?: string }
}

export function PortalSidebar({ user }: Props) {
  const path = usePathname()
  const isAdmin = user.globalRole === 'ADMIN'


  return (
    <aside className="sidebar w-56 flex flex-col min-h-screen sticky top-0 shadow-[var(--shadow-sm)]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <UisaLogo size="sm" variant="full" />
          <ThemeToggle />
        </div>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-3" style={{ color: 'var(--text-muted)' }}>
          Plataforma Interna
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {/* Portal nav */}
        <p className="text-[9px] uppercase tracking-widest px-3 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>
          Menu
        </p>
        <Link
          href="/"
          className={`sidebar-link ${path === '/' ? 'active' : ''}`}
        >
          <LayoutGrid className="w-4 h-4 flex-shrink-0" />
          Portal
        </Link>

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-[9px] uppercase tracking-widest px-3 font-bold" style={{ color: 'var(--text-muted)' }}>
                Administração
              </p>
            </div>
            <Link
              href="/admin/usuarios"
              className={`sidebar-link ${path.startsWith('/admin/usuarios') ? 'active' : ''}`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              Gerenciar Usuários
            </Link>
          </>
        )}
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-[var(--border)]">
        {isAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg" style={{ background: 'rgba(245,196,0,0.10)' }}>
            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--uisa-yellow)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--uisa-yellow)' }}>Admin Global</span>
          </div>
        )}
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
