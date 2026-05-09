import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'
import { db } from '@/lib/db'
import { PremissasForm } from '@/components/viabilidade/PremissasForm'

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, 'viabilidade-economica')
  if (!perm || !canDoAction(perm.appRole, 'EDIT_PREMISES')) redirect('/viabilidade')

  const [premissas, produtos] = await Promise.all([
    db.premissaConfig.findMany(),
    db.productConfig.findMany({ orderBy: { nome: 'asc' } }),
  ])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Premissas Padrão</h1>
        <p className="text-slate-400 text-sm mt-1">
          Edite as premissas financeiras e os preços dos produtos UISA. Aplica-se a novos projetos.
        </p>
      </div>
      <PremissasForm premissas={premissas} produtos={produtos} />
    </div>
  )
}
