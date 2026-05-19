import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'
import { db } from '@/lib/db'
import { ResultsView } from '@/components/viabilidade/results/ResultsView'
import { IS_DEMO, DEMO_USER, getDemoProjectById } from '@/lib/demo-data'

// Helper para lidar com json quebrado
const safeParse = (str: any, fallback: any = null) => {
  if (!str) return fallback
  try { return typeof str === 'string' ? JSON.parse(str) : str }
  catch { return fallback }
}

export default async function ViewProjectPage({ params }: { params: { id: string } }) {
  if (IS_DEMO) {
    const project = getDemoProjectById(params.id)
    if (!project) notFound()

    const version = project.versions[0]
    const inputs: any = {
      nome: project.name, resp: project.responsible, depto: project.department,
      tma: version.tma, ir: version.ir, pisCofins: version.pisCofins,
      vidaUtil: version.vidaUtil, anoIRPJ: version.anoIRPJ, aplicarIRPJ: version.aplicarIRPJ,
      capex: version.capex, dataInvest: version.dataInvest,
      creditoPis: version.creditoPis, manutencao: version.manutencao, vidaFiscal: version.vidaFiscal,
      rampupTipo: version.rampupTipo, rampupAnos: version.rampupAnos, rampupCustom: version.rampupCustom,
      produtos: version.produtos, opex: version.opex, rh: version.rh,
    }
    return (
      <ResultsView
        inputs={inputs}
        results={version.results as any}
        isModerador={true}
      />
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, 'viabilidade-economica')
  if (!perm) redirect('/')

  const project = await db.project.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })
  if (!project) notFound()

  const isOwner   = project.ownerId === userId
  const canSeeAll = canDoAction(perm.appRole, 'VIEW_ALL_PROJECTS')
  if (!isOwner && !canSeeAll) redirect('/viabilidade')

  const version = project.versions[0]
  if (!version || !version.results) redirect(`/viabilidade/${params.id}/editar`)

  const inputs: any = {
    nome: project.name, resp: project.responsible, depto: project.department,
    tma: version.tma, ir: version.ir, pisCofins: version.pisCofins,
    vidaUtil: version.vidaUtil, anoIRPJ: version.anoIRPJ, aplicarIRPJ: version.aplicarIRPJ,
    capex: version.capex, dataInvest: version.dataInvest,
    creditoPis: version.creditoPis, manutencao: version.manutencao, vidaFiscal: version.vidaFiscal,
    rampupTipo: version.rampupTipo, rampupAnos: version.rampupAnos, rampupCustom: safeParse(version.rampupCustom, []),
    produtos: safeParse(version.produtos, []), opex: safeParse(version.opex, []), rh: safeParse(version.rh, []),
  }
  const isModerador = ['MODERADOR','ADMIN_APP'].includes(perm.appRole)

  return (
    <ResultsView
      inputs={inputs}
      results={safeParse(version.results)}
      isModerador={isModerador}
    />
  )
}
