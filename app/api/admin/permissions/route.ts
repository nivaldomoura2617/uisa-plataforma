import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger, initRequest } from '@/lib/logger'
import { z } from 'zod'

const PermissionSchema = z.object({
  userId:  z.string(),
  appSlug: z.string(),
  appRole: z.enum(['VISUALIZADOR','ANALISTA','MODERADOR','ADMIN_APP']),
})

function isAdmin(session: any) {
  return session?.user?.globalRole === 'ADMIN'
}

// POST /api/admin/permissions — conceder acesso
export async function POST(req: NextRequest) {
  const { logReq } = initRequest({ method: 'POST', url: req.url })
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) {
    logReq('WARN', 'POST /api/admin/permissions — acesso negado (não é admin)')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body    = await req.json()
  const parsed  = PermissionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { userId, appSlug, appRole } = parsed.data
  const app = await db.app.findUnique({ where: { slug: appSlug } })
  if (!app) return NextResponse.json({ error: 'App não encontrado' }, { status: 404 })

  const perm = await db.appPermission.upsert({
    where:  { userId_appId: { userId, appId: app.id } },
    update: { appRole, isActive: true, grantedBy: (session!.user as any).id },
    create: { userId, appId: app.id, appRole, grantedBy: (session!.user as any).id },
  })

  await db.auditLog.create({
    data: {
      userId:       (session!.user as any).id,
      action:       'PERMISSION_GRANTED',
      appSlug,
      resourceType: 'permission',
      resourceId:   perm.id,
      payloadJson:  JSON.stringify({ userId, appRole }),
    },
  })

  logReq('INFO', 'Permissão concedida', {
    grantedBy: (session!.user as any).id,
    userId,
    appSlug,
    appRole,
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/permissions — revogar acesso
export async function DELETE(req: NextRequest) {
  const { logReq } = initRequest({ method: 'DELETE', url: req.url })
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) {
    logReq('WARN', 'DELETE /api/admin/permissions — acesso negado')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, appSlug } = await req.json()
  const app = await db.app.findUnique({ where: { slug: appSlug } })
  if (!app) return NextResponse.json({ error: 'App não encontrado' }, { status: 404 })

  // Soft delete — preserva histórico
  await db.appPermission.updateMany({
    where: { userId, appId: app.id },
    data:  { isActive: false },
  })

  await db.auditLog.create({
    data: {
      userId:       (session!.user as any).id,
      action:       'PERMISSION_REVOKED',
      appSlug,
      resourceType: 'permission',
      payloadJson:  JSON.stringify({ userId, appSlug }),
    },
  })

  logReq('INFO', 'Permissão revogada', {
    revokedBy: (session!.user as any).id,
    userId,
    appSlug,
  })

  return NextResponse.json({ ok: true })
}
