import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const InviteSchema = z.object({
  email:       z.string().email(),
  name:        z.string().optional(),
  globalRole:  z.enum(['USER','ADMIN']).default('USER'),
  permissions: z.array(z.object({
    appSlug: z.string(),
    appRole: z.enum(['VISUALIZADOR','ANALISTA','MODERADOR','ADMIN_APP']),
  })).default([]),
})

// GET /api/admin/users
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.globalRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      appPermissions: {
        where:   { isActive: true },
        include: { app: { select: { nome: true, slug: true } } },
      },
    },
  })
  return NextResponse.json(users)
}

// POST /api/admin/users — convidar novo usuário
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const adminUser = session?.user as any
  if (adminUser?.globalRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, globalRole, permissions } = parsed.data
  const DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'uisa.com.br'
  if (!email.endsWith(`@${DOMAIN}`)) {
    return NextResponse.json({ error: `Apenas e-mails @${DOMAIN}` }, { status: 400 })
  }

  // Criar ou reativar usuário
  const user = await db.user.upsert({
    where:  { email },
    update: { isActive: true, name: name ?? undefined, globalRole },
    create: { email, name, globalRole, isActive: true },
  })

  // Criar permissões iniciais
  for (const perm of permissions) {
    const app = await db.app.findUnique({ where: { slug: perm.appSlug } })
    if (!app) continue
    await db.appPermission.upsert({
      where:  { userId_appId: { userId: user.id, appId: app.id } },
      update: { appRole: perm.appRole, isActive: true, grantedBy: adminUser.id },
      create: { userId: user.id, appId: app.id, appRole: perm.appRole, grantedBy: adminUser.id },
    })
  }

  // Audit log
  await db.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'USER_INVITED',
      resourceType: 'user',
      resourceId: user.id,
      payloadJson: JSON.stringify({ email, globalRole, permissions }),
    },
  })

  return NextResponse.json({ ok: true, userId: user.id })
}
