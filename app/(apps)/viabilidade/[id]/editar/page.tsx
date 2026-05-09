import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'
import { db } from '@/lib/db'
import { WizardClient } from '@/components/viabilidade/wizard/WizardClient'

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, 'viabilidade-economica')
  if (!perm) redirect('/')

  const project = await db.project.findFirst({
    where:   { id: params.id, deletedAt: null },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })
  if (!project) notFound()

  const isOwner    = project.ownerId === userId
  const canEditAny = canDoAction(perm.appRole, 'EDIT_ANY_PROJECT')
  if (!isOwner && !canEditAny) redirect('/viabilidade')

  const version = project.versions[0]
  if (!version) notFound()

  const isModerador  = ['MODERADOR','ADMIN_APP'].includes(perm.appRole)
  const canCalculate  = canDoAction(perm.appRole, 'CALCULATE_PROJECT')

  // Helper para lidar com json quebrado
  const safeParse = (str: any, fallback: any = []) => {
    if (!str) return fallback;
    try { return typeof str === 'string' ? JSON.parse(str) : str; }
    catch { return fallback; }
  };

  // Reconstruir inputs do banco
  const initialInputs = {
    nome: project.name, resp: project.responsible ?? '', depto: project.department ?? '',
    tma: version.tma, ir: version.ir, pisCofins: version.pisCofins,
    vidaUtil: version.vidaUtil, anoIRPJ: version.anoIRPJ, aplicarIRPJ: version.aplicarIRPJ,
    capex: version.capex, dataInvest: version.dataInvest,
    creditoPis: version.creditoPis, manutencao: version.manutencao, vidaFiscal: version.vidaFiscal,
    rampupTipo: version.rampupTipo as any, rampupAnos: version.rampupAnos, rampupCustom: safeParse(version.rampupCustom, []),
    produtos: safeParse(version.produtos, []), opex: safeParse(version.opex, []), rh: safeParse(version.rh, []),
  }

  // Carregar premissas e produtos
  const [premissas, produtos] = await Promise.all([
    db.premissaConfig.findMany(),
    db.productConfig.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])
  const pMap = Object.fromEntries(premissas.map(p => [p.key, p.value]))

  return (
    <WizardClient
      isModerador={isModerador}
      canCalculate={canCalculate}
      premissas={{
        tma:     pMap['TMA_PADRAO'] ?? 14.7,
        ir:      pMap['IRPJ_CSLL']  ?? 15.3,
        anoIRPJ: pMap['ANO_IRPJ']   ?? 2034,
      }}
      produtos={produtos}
      initialInputs={initialInputs}
      projectId={params.id}
    />
  )
}
