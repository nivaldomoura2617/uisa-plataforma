import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'

const APP_SLUG = 'viabilidade-economica'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, APP_SLUG)
  if (!perm || !canDoAction(perm.appRole, 'EDIT_PREMISES')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { premissas, produtos } = await req.json()

  // Atualizar premissas
  for (const [key, value] of Object.entries(premissas)) {
    await db.premissaConfig.update({
      where: { key },
      data:  { value: value as number, updatedBy: userId },
    })
  }

  // Atualizar produtos
  for (const [nome, vals] of Object.entries(produtos as Record<string, { preco: number; margem: number }>)) {
    await db.productConfig.update({
      where: { nome },
      data:  { preco: vals.preco, margem: vals.margem, updatedBy: userId },
    })
  }

  // Audit
  await db.auditLog.create({
    data: {
      userId,
      action:      'PREMISES_UPDATED',
      appSlug:     APP_SLUG,
      payloadJson: JSON.stringify({ premissas, produtos }),
    },
  })

  return NextResponse.json({ ok: true })
}
