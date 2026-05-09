import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'
import { calcularFluxo } from '@/lib/calculations'

const APP_SLUG = 'viabilidade-economica'

type Params = { params: { id: string } }

// GET /api/projects/[id]
export async function GET(_: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, APP_SLUG)
  if (!perm) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const project = await db.project.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      versions: { orderBy: { version: 'desc' }, take: 1 },
      owner:    { select: { name: true, email: true } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Analistas só veem os próprios
  const isOwner   = project.ownerId === userId
  const canSeeAll = canDoAction(perm.appRole, 'VIEW_ALL_PROJECTS')
  if (!isOwner && !canSeeAll) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  return NextResponse.json(project)
}

// PUT /api/projects/[id] — editar e recalcular
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, APP_SLUG)
  if (!perm) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const project = await db.project.findFirst({
    where:   { id: params.id, deletedAt: null },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })
  if (!project) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const isOwner    = project.ownerId === userId
  const canEditAny = canDoAction(perm.appRole, 'EDIT_ANY_PROJECT')
  if (!isOwner && !canEditAny) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { inputs } = await req.json()
  const nextVersion = (project.versions[0]?.version ?? 0) + 1

  // Só calcula se o perfil tem permissão
  const canCalc = canDoAction(perm.appRole, 'CALCULATE_PROJECT')

  let results = null
  if (canCalc) {
    try {
      const dp = inputs.dataInvest.split('-')
      results = calcularFluxo({ ...inputs, dataInvest: new Date(+dp[0], +dp[1]-1, +dp[2]) })
      results.engineVersion = 6
    } catch (e) { console.error(e) }
  }

  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: params.id },
      data:  {
        name:        inputs.nome,
        department:  inputs.depto,
        responsible: inputs.resp,
        status:      results ? 'CALCULATED' : 'DRAFT',
        updatedAt:   new Date(),
      },
    })
    await tx.projectVersion.create({
      data: {
        projectId: params.id, version: nextVersion, createdBy: userId,
        tma: inputs.tma, ir: inputs.ir, pisCofins: inputs.pisCofins,
        vidaUtil: inputs.vidaUtil, anoIRPJ: inputs.anoIRPJ,
        aplicarIRPJ: inputs.aplicarIRPJ, engineVersion: 6,
        capex: inputs.capex, dataInvest: inputs.dataInvest,
        creditoPis: inputs.creditoPis, manutencao: inputs.manutencao,
        vidaFiscal: inputs.vidaFiscal, rampupTipo: inputs.rampupTipo,
        rampupAnos: inputs.rampupAnos, rampupCustom: JSON.stringify(inputs.rampupCustom ?? []),
        produtos: JSON.stringify(inputs.produtos ?? []), opex: JSON.stringify(inputs.opex ?? []), rh: JSON.stringify(inputs.rh ?? []),
        results: results ? JSON.stringify(results) : null,
      },
    })
  })

  await db.auditLog.create({
    data: {
      userId, action: 'PROJECT_EDITED', appSlug: APP_SLUG,
      resourceType: 'project', resourceId: params.id,
    },
  })

  return NextResponse.json({ ok: true, version: nextVersion })
}

// DELETE /api/projects/[id] — soft delete
export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const perm   = await getUserAppPermission(userId, APP_SLUG)
  if (!perm) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const project = await db.project.findFirst({ where: { id: params.id, deletedAt: null } })
  if (!project) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const isOwner    = project.ownerId === userId
  const canDelAny  = canDoAction(perm.appRole, 'DELETE_ANY_PROJECT')
  if (!isOwner && !canDelAny) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await db.project.update({ where: { id: params.id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } })
  await db.auditLog.create({
    data: { userId, action: 'PROJECT_DELETED', appSlug: APP_SLUG, resourceType: 'project', resourceId: params.id },
  })

  return NextResponse.json({ ok: true })
}
