import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAppsWithStatus } from '@/lib/permissions'
import { db } from '@/lib/db'
import { AppGrid } from '@/components/portal/AppGrid'

export default async function PortalPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id as string

  const [apps, user] = await Promise.all([
    getAppsWithStatus(userId),
    db.user.findUnique({ where: { id: userId }, select: { name: true, globalRole: true } }),
  ])

  const firstName = user?.name?.split(' ')[0] ?? session.user.email?.split('@')[0]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Olá, {firstName}! 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Selecione um aplicativo para começar.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Apps disponíveis', value: apps.filter(a => a.hasAccess).length },
          { label: 'Apps com acesso',  value: apps.filter(a => a.hasAccess).length },
          { label: 'Apps bloqueados',  value: apps.filter(a => !a.hasAccess).length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </p>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* App Grid */}
      <AppGrid apps={apps as any} />
    </div>
  )
}
