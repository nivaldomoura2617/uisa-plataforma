import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getUserAppPermission, canDoAction } from '@/lib/permissions'
import { calcularFluxo } from '@/lib/calculations'
import { logger, initRequest } from '@/lib/logger'
import { z } from 'zod'

const APP_SLUG = 'viabilidade-economica'

async function getPermission(userId: string) {
  return getUserAppPermission(userId, APP_SLUG)
}

// GET /api/projects — lista projetos
export async function GET(req: NextRequest) {
  const { logReq } = initRequest({ method: 'GET', url: req.url })

  const session = await getServerSession(authOptions)
  if (!session) {
    logReq('WARN', 'GET /api/projects — sem sessão')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const perm   = await getPermission(userId)
  if (!perm) {
    logReq('WARN', 'GET /api/projects — sem permissão no app', { userId })
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }

  const canSeeAll = canDoAction(perm.appRole, 'VIEW_ALL_PROJECTS')

  const projects = await db.project.findMany({
    where: {
      deletedAt: null,
      ...(canSeeAll ? {} : { ownerId: userId }),
    },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          id: true, version: true, capex: true,
          aplicarIRPJ: true, tma: true, results: true, createdAt: true,
        },
      },
      owner: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  logReq('INFO', 'GET /api/projects — ok', { userId, appRole: perm.appRole, count: projects.length })
  return NextResponse.json(projects)
}

// POST /api/projects — criar projeto + calcular
export async function POST(req: NextRequest) {
  const { logReq } = initRequest({ method: 'POST', url: req.url })

  const session = await getServerSession(authOptions)
  if (!session) {
    logReq('WARN', 'POST /api/projects — sem sessão')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const perm   = await getPermission(userId)
  if (!perm || !canDoAction(perm.appRole, 'CREATE_PROJECT')) {
    logReq('WARN', 'POST /api/projects — sem permissão CREATE_PROJECT', { userId, appRole: perm?.appRole })
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { inputs } = body

  // Só calcula se o usuário tem permissão para isso
  const canCalc = canDoAction(perm.appRole, 'CALCULATE_PROJECT')

  let results = null
  if (canCalc) {
    try {
      const dp = inputs.dataInvest.split('-')
      const calcInputs = {
        ...inputs,
        dataInvest: new Date(+dp[0], +dp[1] - 1, +dp[2]),
      }
      results = calcularFluxo(calcInputs)
      results.engineVersion = 6
      logReq('DEBUG', 'Calcáculo de viabilidade executado', { userId, appRole: perm.appRole })
    } catch (e: any) {
      logReq('ERROR', 'Falha no cálculo de viabilidade', {
        userId, error: e?.message, stack: e?.stack,
      })
    }
  }

  const project = await db.$transaction(async (tx) => {
    // Cria project_version_projects manualmente (workaround Prisma)
    const proj = await tx.project.create({
      data: {
        name:        inputs.nome,
        department:  inputs.depto,
        responsible: inputs.resp,
        ownerId:     userId,
        status:      results ? 'CALCULATED' : 'DRAFT',
        isDemo:      false,
      },
    })

    // Table project_version_projects removed

    // Cria versão 1
    await tx.projectVersion.create({
      data: {
        projectId:    proj.id,
        version:      1,
        createdBy:    userId,
        tma:          inputs.tma ?? 14.7,
        ir:           inputs.ir ?? 15.3,
        pisCofins:    inputs.pisCofins ?? 9.15,
        vidaUtil:     inputs.vidaUtil ?? 10,
        anoIRPJ:      inputs.anoIRPJ ?? 2034,
        aplicarIRPJ:  inputs.aplicarIRPJ ?? false,
        engineVersion:6,
        capex:        inputs.capex,
        dataInvest:   inputs.dataInvest,
        creditoPis:   inputs.creditoPis ?? false,
        manutencao:   inputs.manutencao ?? 0,
        vidaFiscal:   inputs.vidaFiscal ?? 5,
        rampupTipo:   inputs.rampupTipo ?? 'integral',
        rampupAnos:   inputs.rampupAnos ?? 5,
        rampupCustom: JSON.stringify(inputs.rampupCustom ?? []),
        produtos:     JSON.stringify(inputs.produtos ?? []),
        opex:         JSON.stringify(inputs.opex ?? []),
        rh:           JSON.stringify(inputs.rh ?? []),
        results:      results ? JSON.stringify(results) : null,
      },
    })

    return proj
  })

  await db.auditLog.create({
    data: {
      userId,
      action:       results ? 'PROJECT_CALCULATED' : 'PROJECT_CREATED',
      appSlug:      APP_SLUG,
      resourceType: 'project',
      resourceId:   project.id,
    },
  })

  logReq('INFO', results ? 'Projeto criado e calculado' : 'Projeto criado como rascunho', {
    userId,
    appRole:   perm.appRole,
    projectId: project.id,
    status:    results ? 'CALCULATED' : 'DRAFT',
  })

  return NextResponse.json({ ok: true, projectId: project.id })
}
