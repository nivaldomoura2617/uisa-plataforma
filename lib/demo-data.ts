// ============================================================
// UISA — Plataforma de Aplicativos Internos
// lib/demo-data.ts — Dados mockados para DEMO_MODE
// Espelha exatamente o seed.ts mas roda sem banco de dados.
// ============================================================

import { calcularFluxo } from '@/lib/calculations'
import type { ProjectInputs } from '@/types'

// ── Sessão fake ──────────────────────────────────────────────

export const DEMO_USER = {
  id:         'demo-user-id',
  name:       'Demo User',
  email:      'demo@uisa.com.br',
  globalRole: 'ADMIN' as const,
  image:      null,
}

export const DEMO_SESSION = {
  user:    DEMO_USER,
  expires: '2099-01-01T00:00:00.000Z',
}

// ── Apps do Portal ───────────────────────────────────────────

export const DEMO_APPS = [
  {
    id:               'app-viabilidade',
    slug:             'viabilidade-economica',
    nome:             'Motor de Viabilidade Econômica',
    descricao:        'Modelagem e análise de projetos de investimento industrial. Calcula VPL, TIR, Payback e gera análise qualitativa.',
    icone:            'trending-up',
    urlBase:          '/viabilidade',
    ativo:            true,
    ordem:            1,
    rolesDisponiveis: ['VISUALIZADOR','ANALISTA','MODERADOR','ADMIN_APP'],
    hasAccess:        true,
    appRole:          'ADMIN_APP' as const,
  },
]

// ── Premissas financeiras ────────────────────────────────────

export const DEMO_PREMISSAS = {
  TMA_PADRAO: 14.7,
  IRPJ_CSLL:  15.3,
  ANO_IRPJ:   2034,
  ENCARGOS:   80,
  FGTS:       8,
  MULTA_FGTS: 40,
}

// ── Produtos UISA ────────────────────────────────────────────

export const DEMO_PRODUTOS = [
  { id: 'prod-1', nome: 'Açúcar',            preco: 120.19,  margem: 15, unidade: 'sc',  ativo: true },
  { id: 'prod-2', nome: 'Etanol',            preco: 2697.10, margem: 6,  unidade: 'm³',  ativo: true },
  { id: 'prod-3', nome: 'Levedura',          preco: 2570.85, margem: 19, unidade: 't',   ativo: true },
  { id: 'prod-4', nome: 'Energia exportada', preco: 204.70,  margem: 10, unidade: 'GWh', ativo: true },
  { id: 'prod-5', nome: 'Soja',              preco: 100.35,  margem: 10, unidade: 'sc',  ativo: true },
  { id: 'prod-6', nome: 'Biomassa',          preco: 54.63,   margem: 5,  unidade: 't',   ativo: true },
]

// ── Geração dos projetos demo com cálculos reais ─────────────

function buildProjects() {
  const inp1 = {
    nome: 'Automação — Linha de Moagem 3', resp: 'Carlos Eduardo Mendes', depto: 'Industrial',
    tma: 14.7, ir: 15.3, pisCofins: 9.15, vidaUtil: 10, anoIRPJ: 2034, aplicarIRPJ: false,
    capex: 4_800_000, dataInvest: '2025-07-15', creditoPis: true, manutencao: 95_000, vidaFiscal: 5,
    rampupTipo: 'linear' as const, rampupAnos: 3, rampupCustom: [],
    produtos: [
      { nome: 'Açúcar', volume: 185_000, preco: 120.19, margem: 15 },
      { nome: 'Etanol', volume: 420,     preco: 2697.10, margem: 6 },
    ],
    opex: [
      { nome: 'Redução energia elétrica',    tipo: 'energia',  valor:  320_000, anoInicio: 1, anoFim: 0 },
      { nome: 'Redução perdas ATR',          tipo: 'processo', valor:  180_000, anoInicio: 1, anoFim: 0 },
      { nome: 'Manutenção preditiva',        tipo: 'opex',     valor:  -75_000, anoInicio: 1, anoFim: 0 },
      { nome: 'Licenças software automação', tipo: 'despesa',  valor:  -48_000, anoInicio: 1, anoFim: 0 },
    ],
    rh: [
      { cargo: 'Operador de Moenda',   variacao: -4, salario: 4200, anos: 6 },
      { cargo: 'Técnico de Automação', variacao:  2, salario: 7800, anos: 0 },
    ],
  }

  const inp2 = {
    nome: 'Levedura Seca — Implantação Linha de Secagem', resp: 'Ricardo Lopes Andrade', depto: 'Fermentação & Bioprocessos',
    tma: 14.7, ir: 15.3, pisCofins: 9.15, vidaUtil: 10, anoIRPJ: 2034, aplicarIRPJ: false,
    capex: 7_350_000, dataInvest: '2026-03-01', creditoPis: false, manutencao: 148_000, vidaFiscal: 5,
    rampupTipo: 'linear' as const, rampupAnos: 2, rampupCustom: [],
    produtos: [
      { nome: 'Levedura', volume: 2800, preco: 2570.85, margem: 19 },
      { nome: 'Etanol',   volume: 180,  preco: 2697.10, margem: 6  },
    ],
    opex: [
      { nome: 'Redução descarte levedura', tipo: 'processo', valor:  210_000, anoInicio: 1, anoFim: 0 },
      { nome: 'Gás natural — secagem',     tipo: 'despesa',  valor: -390_000, anoInicio: 1, anoFim: 0 },
      { nome: 'Embalagem produto acabado', tipo: 'despesa',  valor:  -95_000, anoInicio: 1, anoFim: 0 },
    ],
    rh: [
      { cargo: 'Técnico de Bioprocessos', variacao:  3, salario: 6200, anos: 0 },
      { cargo: 'Auxiliar de Produção',    variacao: -2, salario: 2800, anos: 4 },
    ],
  }

  const inp3 = {
    nome: 'Expansão Capacidade — Caldeira B3', resp: 'Fernanda Souza Lima', depto: 'Utilidades',
    tma: 14.7, ir: 15.3, pisCofins: 9.15, vidaUtil: 12, anoIRPJ: 2034, aplicarIRPJ: false,
    capex: 2_100_000, dataInvest: '2025-11-01', creditoPis: true, manutencao: 55_000, vidaFiscal: 5,
    rampupTipo: 'integral' as const, rampupAnos: 0, rampupCustom: [] as number[],
    produtos: [
      { nome: 'Energia exportada', volume: 1200, preco: 204.70, margem: 10 },
    ],
    opex: [
      { nome: 'Aumento geração vapor',      tipo: 'energia',  valor:  95_000, anoInicio: 1, anoFim: 0 },
      { nome: 'Combustível adicional',       tipo: 'despesa',  valor: -35_000, anoInicio: 1, anoFim: 0 },
    ],
    rh: [
      { cargo: 'Operador de Caldeira', variacao: 1, salario: 5100, anos: 0 },
    ],
  }

  const now = new Date().toISOString()

  function build(inp: ProjectInputs & { nome: string; resp: string; depto: string; dataInvest: string }, id: string, status: string) {
    const dp = inp.dataInvest.split('-')
    const results = calcularFluxo({ ...inp, dataInvest: new Date(+dp[0], +dp[1]-1, +dp[2]) as any })

    return {
      id,
      name:        inp.nome,
      department:  inp.depto,
      responsible: inp.resp,
      ownerId:     DEMO_USER.id,
      status,
      isDemo:      true,
      deletedAt:   null,
      createdAt:   now,
      updatedAt:   now,
      owner: { name: DEMO_USER.name, email: DEMO_USER.email },
      versions: [{
        id:           `${id}-v1`,
        version:      1,
        createdBy:    DEMO_USER.id,
        createdAt:    now,
        tma:          inp.tma, ir: inp.ir, pisCofins: inp.pisCofins,
        vidaUtil:     inp.vidaUtil, anoIRPJ: inp.anoIRPJ, aplicarIRPJ: inp.aplicarIRPJ,
        engineVersion:6,
        capex:        inp.capex, dataInvest: inp.dataInvest,
        creditoPis:   inp.creditoPis, manutencao: inp.manutencao, vidaFiscal: inp.vidaFiscal,
        rampupTipo:   inp.rampupTipo, rampupAnos: inp.rampupAnos, rampupCustom: inp.rampupCustom,
        produtos:     inp.produtos,
        opex:         inp.opex,
        rh:           inp.rh,
        results,
      }],
    }
  }

  return [
    build(inp1, 'demo-project-1', 'CALCULATED'),
    build(inp2, 'demo-project-2', 'CALCULATED'),
    build(inp3, 'demo-project-3', 'CALCULATED'),
  ]
}

// Cache em memória (calculado uma vez)
let _projects: ReturnType<typeof buildProjects> | null = null

export function getDemoProjects() {
  if (!_projects) _projects = buildProjects()
  return _projects
}

export function getDemoProjectById(id: string) {
  return getDemoProjects().find(p => p.id === id) ?? null
}

// ── Helper: verificar DEMO_MODE ──────────────────────────────

export const IS_DEMO = process.env.DEMO_MODE === 'true'
