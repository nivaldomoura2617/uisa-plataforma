import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'
import { db } from '@/lib/db'
import { WizardClient } from '@/components/viabilidade/wizard/WizardClient'

export default async function NovoProjetoPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, 'viabilidade-economica')
  if (!perm || !canDoAction(perm.appRole, 'CREATE_PROJECT')) redirect('/viabilidade')

  const isModerador  = ['MODERADOR','ADMIN_APP'].includes(perm.appRole)
  const canCalculate  = canDoAction(perm.appRole, 'CALCULATE_PROJECT')

  // Premissas centralizadas do banco
  const [premissas, produtos] = await Promise.all([
    db.premissaConfig.findMany(),
    db.productConfig.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])

  const premissaMap = Object.fromEntries(premissas.map(p => [p.key, p.value]))

  return (
    <WizardClient
      isModerador={isModerador}
      canCalculate={canCalculate}
      premissas={{
        tma:    premissaMap['TMA_PADRAO'] ?? 14.7,
        ir:     premissaMap['IRPJ_CSLL']  ?? 15.3,
        anoIRPJ: premissaMap['ANO_IRPJ']  ?? 2034,
      }}
      produtos={produtos}
    />
  )
}
