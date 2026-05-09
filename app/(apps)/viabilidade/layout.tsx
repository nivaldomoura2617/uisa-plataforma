import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserAppPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { ViabilidadeSidebar } from '@/components/viabilidade/ViabilidadeSidebar'

const APP_SLUG = 'viabilidade-economica'

export default async function ViabilidadeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, APP_SLUG)

  // Sem acesso: volta ao portal
  if (!perm) redirect('/?denied=viabilidade')

  // Log de acesso
  await db.auditLog.create({
    data: {
      userId,
      action:   'PORTAL_APP_ACCESS',
      appSlug:  APP_SLUG,
    },
  }).catch(() => {}) // silencioso se duplicar

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <ViabilidadeSidebar
        user={session.user as any}
        appRole={perm.appRole}
      />
      <main className="flex-1 overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
