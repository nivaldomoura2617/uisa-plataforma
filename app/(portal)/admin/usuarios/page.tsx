import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { UsersTable } from '@/components/portal/admin/UsersTable'
import { Users, ShieldCheck, AppWindow, Key } from 'lucide-react'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).globalRole !== 'ADMIN') redirect('/')

  const [users, apps] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        appPermissions: {
          include: { app: { select: { nome: true, slug: true } } },
          where:   { isActive: true },
        },
      },
    }),
    db.app.findMany({
      where:   { ativo: true },
      orderBy: { ordem: 'asc' },
      select:  { id: true, nome: true, slug: true, rolesDisponiveis: true },
    }),
  ])

  const parsedApps = apps.map(app => ({
    ...app,
    rolesDisponiveis: JSON.parse(app.rolesDisponiveis) as any[],
  }))

  // Stats
  const totalUsers   = users.length
  const admins       = users.filter(u => u.globalRole === 'ADMIN').length
  const comAcesso    = users.filter(u => u.appPermissions.length > 0).length
  const semAcesso    = users.filter(u => u.appPermissions.length === 0 && u.globalRole !== 'ADMIN').length

  const stats = [
    { label: 'Usuários Total',     value: totalUsers, icon: Users,       color: 'var(--text-primary)' },
    { label: 'Admins Globais',     value: admins,     icon: ShieldCheck,  color: 'var(--uisa-yellow)' },
    { label: 'Com acesso a apps',  value: comAcesso,  icon: AppWindow,    color: 'var(--uisa-green)' },
    { label: 'Sem nenhum acesso',  value: semAcesso,  icon: Key,          color: 'var(--uisa-red)' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-1 h-6 rounded-full"
            style={{ background: 'var(--uisa-orange)' }}
          />
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
            Gerenciamento de Usuários
          </h1>
        </div>
        <p className="text-sm pl-3" style={{ color: 'var(--text-secondary)' }}>
          Controle quais usuários têm acesso a cada aplicativo e com qual papel.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                {s.label}
              </p>
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabela ── */}
      <UsersTable users={users as any} apps={parsedApps as any} />
    </div>
  )
}
