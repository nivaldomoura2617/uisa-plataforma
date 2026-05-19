import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PortalSidebar } from '@/components/portal/PortalSidebar'
import { DemoBanner } from '@/components/DemoBanner'
import { IS_DEMO, DEMO_SESSION } from '@/lib/demo-data'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = IS_DEMO
    ? DEMO_SESSION
    : await getServerSession(authOptions)

  if (!session) redirect('/login')

  return (
    <div style={{ paddingTop: IS_DEMO ? '34px' : undefined }}>
      {IS_DEMO && <DemoBanner />}
      <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <PortalSidebar user={session.user as any} />
        <main className="flex-1 overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
