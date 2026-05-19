import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { UsersTable } from '@/components/portal/admin/UsersTable'
import { Users, ShieldCheck, AppWindow, Key } from 'lucide-react'
import { IS_DEMO, DEMO_USER, DEMO_APPS } from '@/lib/demo-data'

// Dados mockados para a tela de admin no DEMO_MODE
const DEMO_USERS_TABLE = [
  {
    id:             DEMO_USER.id,
    name:           'Demo User',
    email:          'demo@uisa.com.br',
    globalRole:     'ADMIN',
    isActive:       true,
    createdAt:      new Date('2025-01-01'),
    lastLoginAt:    new Date(),
    emailVerified:  new Date('2025-01-01'),
    image:          null,
    appPermissions: [
      {
        id:      'perm-1',
        appRole: 'ADMIN_APP',
        isActive: true,
        app: { nome: 'Motor de Viabilidade Econômica', slug: 'viabilidade-economica' },
      },
    ],
  },
  {
    id:             'demo-user-2',
    name:           'Analista Industrial',
    email:          'analista@uisa.com.br',
    globalRole:     'USER',
    isActive:       true,
    createdAt:      new Date('2025-02-15'),
    lastLoginAt:    new Date('2026-05-10'),
    emailVerified:  new Date('2025-02-15'),
    image:          null,
    appPermissions: [
      {
        id:      'perm-2',
        appRole: 'ANALISTA',
        isActive: true,
        app: { nome: 'Motor de Viabilidade Econômica', slug: 'viabilidade-economica' },
      },
    ],
  },
  {
    id:             'demo-user-3',
    name:           'Controladoria UISA',
    email:          'controladoria@uisa.com.br',
    globalRole:     'USER',
    isActive:       true,
    createdAt:      new Date('2025-03-01'),
    lastLoginAt:    new Date('2026-05-18'),
    emailVerified:  new Date('2025-03-01'),
    image:          null,
    appPermissions: [
      {
        id:      'perm-3',
        appRole: 'MODERADOR',
        isActive: true,
        app: { nome: 'Motor de Viabilidade Econômica', slug: 'viabilidade-economica' },
      },
    ],
  },
]

const DEMO_APPS_TABLE = DEMO_APPS.map(a => ({
  id:               a.id,
  nome:             a.nome,
  slug:             a.slug,
  rolesDisponiveis: a.rolesDisponiveis,
}))

export default async function AdminUsersPage() {
  let users: any[]
  let parsedApps: any[]

  if (IS_DEMO) {
    users      = DEMO_USERS_TABLE
    parsedApps = DEMO_APPS_TABLE
  } else {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')
    if ((session.user as any).globalRole !== 'ADMIN') redirect('/')

    const [dbUsers, apps] = await Promise.all([
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
    users      = dbUsers
    parsedApps = apps.map(app => ({
      ...app,
      rolesDisponiveis: JSON.parse(app.rolesDisponiveis) as any[],
    }))
  }

  // Stats
  const totalUsers = users.length
  const admins     = users.filter(u => u.globalRole === 'ADMIN').length
  const comAcesso  = users.filter(u => u.appPermissions.length > 0).length
  const semAcesso  = users.filter(u => u.appPermissions.length === 0 && u.globalRole !== 'ADMIN').length

  const stats = [
    { label: 'Usuários Total',    value: totalUsers, icon: Users,      color: 'var(--text-primary)' },
    { label: 'Admins Globais',    value: admins,     icon: ShieldCheck, color: 'var(--uisa-yellow)' },
    { label: 'Com acesso a apps', value: comAcesso,  icon: AppWindow,   color: 'var(--uisa-green)' },
    { label: 'Sem nenhum acesso', value: semAcesso,  icon: Key,         color: 'var(--uisa-red)' },
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
          {IS_DEMO
            ? '⚠️ Modo demonstração — dados fictícios, alterações não são salvas.'
            : 'Controle quais usuários têm acesso a cada aplicativo e com qual papel.'}
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
