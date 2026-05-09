// ============================================================
// UISA — Plataforma de Aplicativos Internos
// types/index.ts — Tipos TypeScript completos
// ============================================================

export type RampupType = 'integral' | 'linear' | 'personalizado'

export interface ProductInput {
  nome:   string
  volume: number
  preco:  number
  margem: number
}

export interface OpexInput {
  nome:      string
  tipo:      string  // 'manutencao' | 'energia' | 'estoque' | 'processo' | 'despesa' | 'outro' | 'opex'
  valor:     number  // SIGNED: + = economia, - = custo
  anoInicio: number  // 1 = primeiro ano operacional
  anoFim:    number  // 0 = permanente
}

export interface RHInput {
  cargo:    string
  variacao: number  // negativo = demissão (saving), positivo = contratação (custo)
  salario:  number  // R$/mês bruto
  anos:     number  // anos de empresa (para rescisão)
}

export interface ProjectInputs {
  nome:         string
  resp?:        string
  depto?:       string

  // Parâmetros financeiros
  tma:          number   // % a.a.
  ir:           number   // % IRPJ+CSLL
  pisCofins:    number   // % — sempre 9.15
  vidaUtil:     number   // anos
  anoIRPJ:      number   // ano início IRPJ
  aplicarIRPJ:  boolean  // padrão: false

  // CAPEX
  capex:        number   // R$ bruto
  dataInvest:   string   // YYYY-MM-DD ou Date
  creditoPis:   boolean
  manutencao:   number   // R$/ano
  vidaFiscal:   number   // anos depreciação

  // Ramp-up
  rampupTipo:   RampupType
  rampupAnos:   number
  rampupCustom: number[]

  // Inputs
  produtos:     ProductInput[]
  opex:         OpexInput[]
  rh:           RHInput[]
}

// ── RESULTADO DO MOTOR ────────────────────────────────────────

export interface CalculationResults {
  // Timeline
  safras:   string[]
  n:        number
  pA:       number[]
  rump:     number[]

  // Vetores do fluxo
  vCapex:      number[]
  vManut:      number[]
  vReceita:    number[]
  vRH:         number[]
  vResc:       number[]
  vCustos:     number[]
  vReducoes:   number[]
  vIRPJ:       number[]
  vDepreciacao:number[]

  // Fluxos acumulados
  fc:      number[]
  fcDisc:  number[]
  fcAcum:  number[]
  fcAcumD: number[]

  // KPIs
  vpl:      number
  tir:      number | null
  payback:  number | null
  paybackD: number | null
  roi:      number | null

  // Metadados
  capexLiq:      number
  yf:            number
  engineVersion: number
}

// ── ANÁLISE QUALITATIVA ───────────────────────────────────────

export interface AnalysisSection {
  titulo: string
  icon:   string
  cor:    string
  itens:  string[]
}

export type ConvictionLevel =
  | 'Alta Convicção'
  | 'Convicção Moderada'
  | 'Convicção Baixa'
  | 'Inviável'

export interface QualitativeAnalysisResult {
  nivel:    ConvictionLevel
  nivelCor: string
  spread:   number | null
  sections: AnalysisSection[]
}

// ── PREMISSAS UISA ────────────────────────────────────────────

export const PREMISSAS_UISA = {
  ENCARGOS: 0.80,
  FGTS:     0.08,
  MULTA:    0.40,
  MESES:    13 + 1/3,
  FERIAS:   1 + 1/3,
  AV_BASE:  30,
  AV_ANO:   3,
} as const

export const PRODUTOS_PADRAO = {
  precos: {
    'Açúcar':             120.19,
    'Etanol':            2697.10,
    'Levedura':          2570.85,
    'Energia exportada':  204.70,
    'Soja':               100.35,
    'Biomassa':            54.63,
  },
  margens: {
    'Açúcar':            15,
    'Etanol':             6,
    'Levedura':          19,
    'Energia exportada': 10,
    'Soja':              10,
    'Biomassa':           5,
  },
  unidades: {
    'Açúcar':            'sc',
    'Etanol':            'm³',
    'Levedura':          't',
    'Energia exportada': 'GWh',
    'Soja':              'sc',
    'Biomassa':          't',
  },
} as const
