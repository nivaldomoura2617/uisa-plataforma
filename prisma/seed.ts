// ============================================================
// UISA — Plataforma de Aplicativos Internos
// prisma/seed.ts — Dados iniciais completos
// ============================================================

import { PrismaClient } from '@prisma/client'
import { calcularFluxo } from '../lib/calculations'
import type { ProjectInputs } from '../types'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed da plataforma UISA...\n')

  // ── 1. Apps do Portal ────────────────────────────────────────
  console.log('📱 Registrando aplicativos no portal...')
  const viabilidadeApp = await prisma.app.upsert({
    where:  { slug: 'viabilidade-economica' },
    update: { ativo: true },
    create: {
      slug:              'viabilidade-economica',
      nome:              'Motor de Viabilidade Econômica',
      descricao:         'Modelagem e análise de projetos de investimento industrial. Calcula VPL, TIR, Payback e gera análise qualitativa.',
      icone:             'trending-up',
      urlBase:           '/viabilidade',
      ativo:             true,
      ordem:             1,
      rolesDisponiveis:  JSON.stringify(['VISUALIZADOR','ANALISTA','MODERADOR','ADMIN_APP']),
    },
  })
  console.log('  ✅ Motor de Viabilidade Econômica')

  // ── 2. Premissas financeiras ─────────────────────────────────
  console.log('\n📊 Inserindo premissas financeiras...')
  const premissas = [
    { key: 'TMA_PADRAO',   value: 14.7,  unit: '%',     descricao: 'WACC UISA — Taxa Mínima de Atratividade padrão' },
    { key: 'IRPJ_CSLL',    value: 15.3,  unit: '%',     descricao: 'Alíquota efetiva IRPJ + CSLL' },
    { key: 'ANO_IRPJ',     value: 2034,  unit: 'ano',   descricao: 'Ano de início da tributação IRPJ/CSLL' },
    { key: 'ENCARGOS',     value: 80,    unit: '%',     descricao: 'Encargos sobre salário bruto (INSS+FGTS+férias+13º)' },
    { key: 'FGTS',         value: 8,     unit: '%',     descricao: 'Alíquota FGTS' },
    { key: 'MULTA_FGTS',   value: 40,    unit: '%',     descricao: 'Multa rescisória sobre FGTS acumulado' },
  ]
  for (const p of premissas) {
    await prisma.premissaConfig.upsert({
      where:  { key: p.key },
      update: { value: p.value },
      create: p,
    })
  }
  console.log('  ✅ 6 premissas inseridas')

  // ── 3. Produtos UISA (2T 25/26) ──────────────────────────────
  console.log('\n🌾 Inserindo produtos UISA (2T 25/26)...')
  const produtos = [
    { nome: 'Açúcar',            preco: 120.19,   margem: 15, unidade: 'sc'  },
    { nome: 'Etanol',            preco: 2697.10,  margem: 6,  unidade: 'm³'  },
    { nome: 'Levedura',          preco: 2570.85,  margem: 19, unidade: 't'   },
    { nome: 'Energia exportada', preco: 204.70,   margem: 10, unidade: 'GWh' },
    { nome: 'Soja',              preco: 100.35,   margem: 10, unidade: 'sc'  },
    { nome: 'Biomassa',          preco: 54.63,    margem: 5,  unidade: 't'   },
  ]
  for (const p of produtos) {
    await prisma.productConfig.upsert({
      where:  { nome: p.nome },
      update: p,
      create: p,
    })
  }
  console.log('  ✅ 6 produtos inseridos')

  // ── 4. Usuários ──────────────────────────────────────────────
  console.log('\n👥 Criando usuários iniciais...')

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@uisa.com.br' },
    update: {},
    create: {
      email:         'admin@uisa.com.br',
      name:          'Administrador UISA',
      globalRole:    'ADMIN',
      isActive:      true,
      emailVerified: new Date(),
    },
  })
  console.log('  ✅ admin@uisa.com.br (Admin Global)')

  const moderador = await prisma.user.upsert({
    where:  { email: 'controladoria@uisa.com.br' },
    update: {},
    create: {
      email:         'controladoria@uisa.com.br',
      name:          'Controladoria UISA',
      globalRole:    'USER',
      isActive:      true,
      emailVerified: new Date(),
    },
  })
  // Moderador no app de Viabilidade
  await prisma.appPermission.upsert({
    where:  { userId_appId: { userId: moderador.id, appId: viabilidadeApp.id } },
    update: { appRole: 'MODERADOR', isActive: true },
    create: { userId: moderador.id, appId: viabilidadeApp.id, appRole: 'MODERADOR', grantedBy: admin.id },
  })
  console.log('  ✅ controladoria@uisa.com.br (Moderador — Viabilidade)')

  const analista = await prisma.user.upsert({
    where:  { email: 'analista@uisa.com.br' },
    update: {},
    create: {
      email:         'analista@uisa.com.br',
      name:          'Analista Industrial',
      globalRole:    'USER',
      isActive:      true,
      emailVerified: new Date(),
    },
  })
  await prisma.appPermission.upsert({
    where:  { userId_appId: { userId: analista.id, appId: viabilidadeApp.id } },
    update: { appRole: 'ANALISTA', isActive: true },
    create: { userId: analista.id, appId: viabilidadeApp.id, appRole: 'ANALISTA', grantedBy: admin.id },
  })
  console.log('  ✅ analista@uisa.com.br (Analista — Viabilidade)')

  // ── 5. Projetos de demonstração ──────────────────────────────
  console.log('\n📁 Criando projetos de demonstração...\n')

  const demos: ProjectInputs[] = [
    {
      nome: 'Automação — Linha de Moagem 3', resp: 'Carlos Eduardo Mendes', depto: 'Industrial',
      tma: 14.7, ir: 15.3, pisCofins: 9.15, vidaUtil: 10, anoIRPJ: 2034, aplicarIRPJ: false,
      capex: 4_800_000, dataInvest: '2025-07-15', creditoPis: true, manutencao: 95_000, vidaFiscal: 5,
      rampupTipo: 'linear', rampupAnos: 3, rampupCustom: [],
      produtos: [
        { nome: 'Açúcar', volume: 185_000, preco: 120.19, margem: 15 },
        { nome: 'Etanol', volume: 420,     preco: 2697.10, margem: 6 },
      ],
      opex: [
        { nome: 'Redução energia elétrica',    tipo: 'energia',    valor:  320_000, anoInicio: 1, anoFim: 0 },
        { nome: 'Redução perdas ATR',          tipo: 'processo',   valor:  180_000, anoInicio: 1, anoFim: 0 },
        { nome: 'Manutenção preditiva',        tipo: 'opex',       valor:  -75_000, anoInicio: 1, anoFim: 0 },
        { nome: 'Licenças software automação', tipo: 'despesa',    valor:  -48_000, anoInicio: 1, anoFim: 0 },
      ],
      rh: [
        { cargo: 'Operador de Moenda',   variacao: -4, salario: 4200, anos: 6 },
        { cargo: 'Técnico de Automação', variacao:  2, salario: 7800, anos: 0 },
      ],
    },
    {
      nome: 'Levedura Seca — Implantação Linha de Secagem', resp: 'Ricardo Lopes Andrade', depto: 'Fermentação & Bioprocessos',
      tma: 14.7, ir: 15.3, pisCofins: 9.15, vidaUtil: 10, anoIRPJ: 2034, aplicarIRPJ: false,
      capex: 7_350_000, dataInvest: '2026-03-01', creditoPis: false, manutencao: 148_000, vidaFiscal: 5,
      rampupTipo: 'linear', rampupAnos: 2, rampupCustom: [],
      produtos: [
        { nome: 'Levedura', volume: 2800, preco: 2570.85, margem: 19 },
        { nome: 'Etanol',   volume: 180,  preco: 2697.10, margem: 6  },
      ],
      opex: [
        { nome: 'Redução descarte levedura',  tipo: 'processo',   valor:  210_000, anoInicio: 1, anoFim: 0 },
        { nome: 'Gás natural — secagem',      tipo: 'despesa',    valor: -390_000, anoInicio: 1, anoFim: 0 },
        { nome: 'Embalagem produto acabado',  tipo: 'despesa',    valor:  -95_000, anoInicio: 1, anoFim: 0 },
      ],
      rh: [
        { cargo: 'Técnico de Bioprocessos',   variacao:  3, salario: 6200, anos: 0 },
        { cargo: 'Auxiliar de Produção',      variacao: -2, salario: 2800, anos: 4 },
      ],
    },
  ]

  for (const inp of demos) {
    const dp = inp.dataInvest.split('-')
    const results = calcularFluxo({ ...inp, dataInvest: new Date(+dp[0], +dp[1]-1, +dp[2]) as any })
    ;(results as any).engineVersion = 6

    // Criar project_version_projects e project
    const project = await prisma.project.create({
      data: {
        name:        inp.nome,
        department:  inp.depto,
        responsible: inp.resp,
        ownerId:     moderador.id,
        status:      'CALCULATED',
        isDemo:      true,
      },
    })

    // Table project_version_projects was removed from schema

    await prisma.projectVersion.create({
      data: {
        projectId:    project.id,
        version:      1,
        createdBy:    moderador.id,
        tma:          inp.tma, ir: inp.ir, pisCofins: inp.pisCofins,
        vidaUtil:     inp.vidaUtil, anoIRPJ: inp.anoIRPJ, aplicarIRPJ: inp.aplicarIRPJ,
        engineVersion:6,
        capex:        inp.capex, dataInvest: inp.dataInvest,
        creditoPis:   inp.creditoPis, manutencao: inp.manutencao, vidaFiscal: inp.vidaFiscal,
        rampupTipo:   inp.rampupTipo as any, rampupAnos: inp.rampupAnos, rampupCustom: JSON.stringify(inp.rampupCustom),
        produtos:     JSON.stringify(inp.produtos), opex: JSON.stringify(inp.opex), rh: JSON.stringify(inp.rh),
        results:      JSON.stringify(results),
      },
    })

    const vpl = results.vpl > 0 ? `R$ ${(results.vpl/1e6).toFixed(2)}M` : `(R$ ${Math.abs(results.vpl/1e6).toFixed(2)}M)`
    const tir = results.tir ? `${(results.tir*100).toFixed(1)}%` : 'n/a'
    const pb  = results.payback ? `${results.payback.toFixed(2)}a` : '> período'
    console.log(`  ✅ ${inp.nome}`)
    console.log(`     VPL: ${vpl}  |  TIR: ${tir}  |  Payback: ${pb}\n`)
  }

  console.log('✅ Seed concluído com sucesso!')
  console.log('\nUsuários criados:')
  console.log('  admin@uisa.com.br        — Admin Global (acesso a tudo)')
  console.log('  controladoria@uisa.com.br — Moderador no Motor de Viabilidade')
  console.log('  analista@uisa.com.br      — Analista no Motor de Viabilidade')
}

main()
  .catch(e => { console.error('❌ Erro no seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
