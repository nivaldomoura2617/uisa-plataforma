import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'
import { db } from '@/lib/db'
import { ProjectCard } from '@/components/viabilidade/ProjectCard'
import Link from 'next/link'
import { Plus, TrendingUp, AlertTriangle, DollarSign, FileText } from 'lucide-react'

const APP_SLUG = 'viabilidade-economica'

export default async function ViabilidadePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, APP_SLUG)
  if (!perm) redirect('/')

  const canCreate  = canDoAction(perm.appRole, 'CREATE_PROJECT')
  const canSeeAll  = canDoAction(perm.appRole, 'VIEW_ALL_PROJECTS')

  const projects = await db.project.findMany({
    where: {
      deletedAt: null,
      ...(canSeeAll ? {} : { ownerId: userId }),
    },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { id: true, version: true, capex: true, tma: true, results: true, createdAt: true },
      },
      owner: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Stats
  const calculated = projects.filter(p => p.status === 'CALCULATED')
  const viaveis    = calculated.filter(p => {
    const raw = p.versions[0]?.results
    const r   = raw ? (typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return null } })() : raw) : null
    return r?.vpl > 0
  })
  const totalCapex = projects.reduce((s, p) => s + (p.versions[0]?.capex ?? 0), 0)

  const stats = [
    { label: 'Total de Estudos',    value: projects.length,                      icon: FileText,      color: 'var(--text-primary)' },
    { label: 'Projetos Viáveis',    value: viaveis.length,                       icon: TrendingUp,    color: 'var(--uisa-green)' },
    { label: 'Projetos Inviáveis',  value: calculated.length - viaveis.length,   icon: AlertTriangle, color: 'var(--uisa-red)' },
    { label: 'CAPEX Total (R$ mi)', value: (totalCapex/1e6).toFixed(1),          icon: DollarSign,    color: '#60A5FA' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Motor de Viabilidade Econômica
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {canSeeAll ? 'Todos os projetos da equipe' : 'Meus projetos'}
          </p>
        </div>
        {canCreate && (
          <Link href="/viabilidade/novo" className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Estudo
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </p>
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-2">Nenhum projeto criado ainda.</p>
          {canCreate && (
            <Link
              href="/viabilidade/novo"
              className="text-sm font-semibold hover:underline"
              style={{ color: 'var(--uisa-orange)' }}
            >
              Criar primeiro estudo →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} appRole={perm.appRole} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}
