// ============================================================
// UISA — Motor de Viabilidade Econômica
// lib/calculations.ts — Engine v5
//
// Replica exatamente a planilha padrão UISA.
// Fórmulas documentadas na Arquitetura Técnica v2.0 seção 2.
// ============================================================

import type {
  ProjectInputs,
  CalculationResults,
  ProductInput,
  OpexInput,
  RHInput,
} from '@/types'
import { PREMISSAS_UISA } from '@/types'

const { ENCARGOS, FGTS, MULTA, MESES, FERIAS, AV_BASE, AV_ANO } = PREMISSAS_UISA

// ── HELPERS INTERNOS ──────────────────────────────────────────

/**
 * Converte data ISO "YYYY-MM-DD" em objeto Date local (sem timezone offset).
 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Safra label a partir de uma data.
 * Março 31 de ANO → safra "(ANO-1)/ANO" → e.g. "25/26"
 */
export function safraOf(date: Date): string {
  const y = date.getFullYear()
  return `${String(y - 1).slice(-2)}/${String(y).slice(-2)}`
}

/**
 * iFEY — Investment Fiscal End Year.
 * Ano de FIM do ano fiscal em que o investimento ocorre.
 * Ciclo: abril/ano → março/ano+1.
 *
 * Mês ≤ março (0–2): iFEY = ano
 * Mês ≥ abril  (3+): iFEY = ano + 1
 *
 * Exemplo:
 *   15/07/2025 → iFEY = 2026 → Safra 25/26
 *   15/02/2026 → iFEY = 2026 → Safra 25/26
 *   15/04/2026 → iFEY = 2027 → Safra 26/27
 */
export function investFiscalEndYear(date: Date): number {
  return date.getMonth() < 3 ? date.getFullYear() : date.getFullYear() + 1
}

/**
 * Fração de ano da data de investimento até 31/março do iFEY.
 * Usada como offset do payback (replicando planilha F96).
 */
export function yearfracToFimSafra(date: Date): number {
  const iFEY = investFiscalEndYear(date)
  const fim = new Date(iFEY, 2, 31)
  return (fim.getTime() - date.getTime()) / (365.25 * 86400 * 1000)
}

/**
 * Fator de ramp-up para um dado período operacional.
 * p=0 → período de CAPEX (sem operação) → retorna 0
 */
export function rampupFn(
  p: number,
  tipo: string,
  anos: number,
  custom: number[]
): number {
  if (p <= 0) return 0
  if (tipo === 'integral') return 1
  if (tipo === 'linear') return p > anos ? 1 : p / anos
  if (tipo === 'personalizado' && custom.length > 0) {
    const idx = p - 1
    if (idx < 0) return 0
    if (idx >= custom.length) return 1
    return (custom[idx] ?? 0) / 100
  }
  return 1
}

// ── TIR — Newton-Raphson ──────────────────────────────────────

/**
 * Calcula a TIR (Taxa Interna de Retorno) pelo método Newton-Raphson.
 * Tolerância relativa ao maior fluxo absoluto (evita divisão por zero
 * quando fc[0] = 0, que era o bug da versão anterior).
 *
 * Replicando IRR(F94:O94) da planilha UISA.
 */
export function calcularTIR(flows: number[]): number | null {
  let r = 0.1

  for (let i = 0; i < 2000; i++) {
    let npv = 0
    let dnpv = 0

    for (let t = 0; t < flows.length; t++) {
      const d = Math.pow(1 + r, t)
      npv  += flows[t] / d
      dnpv -= (t * flows[t]) / (d * (1 + r))
    }

    if (Math.abs(dnpv) < 1e-12) break

    const rNew = r - npv / dnpv
    if (Math.abs(rNew - r) < 1e-10) { r = rNew; break }
    r = rNew < -0.9999 ? -0.5 : rNew
  }

  // Tolerância: 0.1% do maior fluxo absoluto (NÃO flows[0] que pode ser 0)
  const ref = Math.max(...flows.map(v => Math.abs(v)), 1)
  const check = flows.reduce((s, v, t) => s + v / Math.pow(1 + r, t), 0)
  return Math.abs(check) < ref * 0.001 ? r : null
}

// ── PAYBACK ───────────────────────────────────────────────────

/**
 * Calcula payback replicando exatamente a fórmula F96 da planilha UISA.
 *
 * pb[0] = yf se acumulado[0] < 0 (offset da fração de ano até fim da safra)
 * pb[i] = pb[i-1] + 1           se acumulado[i] < 0
 * pb[i] = pb[i-1] + |acum[i-1]| / fc[i]  se cruzamento (virada de sinal)
 * pb[i] = pb[i-1]               se já quitado
 */
export function calcularPayback(
  fcAcum: number[],
  fc: number[],
  yf: number
): number | null {
  const n = fcAcum.length
  const pb = new Array(n).fill(0)

  if (fcAcum[0] < 0) pb[0] = yf

  for (let i = 1; i < n; i++) {
    const prev = fcAcum[i - 1]
    const cur  = fcAcum[i]

    if (prev < 0 && cur >= 0 && fc[i] > 0) {
      // Cruzamento: interpolação fracionária
      pb[i] = pb[i - 1] + Math.abs(prev) / fc[i]
    } else if (cur < 0) {
      pb[i] = pb[i - 1] + 1
    } else {
      pb[i] = pb[i - 1] // já quitado
    }
  }

  // Se ainda negativo ao final → não paga dentro da vida útil
  return fcAcum[n - 1] < 0 ? null : Math.max(...pb)
}

// ── MOTOR PRINCIPAL ───────────────────────────────────────────

/**
 * Motor de Cálculo v5 — replica exatamente a planilha padrão UISA.
 *
 * Melhorias em relação à versão do protótipo HTML:
 * - Timeline ancorada no iFEY (não em "hoje")
 * - Encargos = 80% (não 8% FGTS)
 * - Sinal da folha corrigido: demissão = saving (+)
 * - Rescisão separada da folha recorrente
 * - PIS/COFINS NÃO deduzido do fluxo (já nas margens)
 * - Manutenção em TODOS os períodos operacionais
 * - Sem inflação nos custos (modelo nominal)
 * - IRPJ zerado por padrão (toggle)
 */
export function calcularFluxo(inputs: ProjectInputs): CalculationResults {
  const {
    tma, ir, vidaUtil, anoIRPJ, aplicarIRPJ,
    capex, dataInvest, creditoPis, manutencao, vidaFiscal,
    rampupTipo, rampupAnos, rampupCustom,
    produtos, opex, rh,
    pisCofins,
  } = inputs

  // ── 1. Data de investimento ──────────────────────────────────
  const dataObj = typeof dataInvest === 'string'
    ? parseDate(dataInvest)
    : new Date(dataInvest as unknown as string)
  dataObj.setHours(0, 0, 0, 0)

  // ── 2. Timeline — ancoragem no iFEY ─────────────────────────
  const iFEY = investFiscalEndYear(dataObj)
  const datas: Date[] = []
  for (let i = 0; i < 10; i++) {
    datas.push(new Date(iFEY + i, 2, 31)) // 31 de março de cada ano
  }
  const safras = datas.map(safraOf)
  const n      = datas.length
  const pA     = datas.map((_, i) => i) // [0,1,2,...,9]

  // ── 3. Yearfrac para offset do payback ───────────────────────
  const yf = yearfracToFimSafra(dataObj)

  // ── 4. Ramp-up ───────────────────────────────────────────────
  const rump = pA.map(p => rampupFn(p, rampupTipo, rampupAnos, rampupCustom))

  // ── 5. CAPEX ─────────────────────────────────────────────────
  const pisCofinsRate = (pisCofins ?? 9.15) / 100
  const capexLiq = creditoPis ? capex * (1 - pisCofinsRate) : capex
  const vuOp     = vidaUtil > 0 ? vidaUtil : 9999

  const vCapex = new Array(n).fill(0) as number[]
  const vManut = new Array(n).fill(0) as number[]

  vCapex[0] = -capexLiq // CAPEX sempre no período 0

  for (let i = 0; i < n; i++) {
    const p = pA[i]
    if (p <= 0) continue
    if (p % vuOp === 0) {
      vCapex[i] = -capexLiq // renovação ao fim da vida útil
    }
    vManut[i] = -manutencao // manutenção em TODOS os períodos operacionais
  }

  // ── 6. Receita ───────────────────────────────────────────────
  // Margens são líquidas — PIS/COFINS já embutido
  // NÃO deduzir novamente do fluxo
  const vReceita = new Array(n).fill(0) as number[]

  for (const prod of (produtos ?? [])) {
    const fatorEnergia = prod.nome === 'Energia exportada' ? 1000 : 1
    const margem       = (prod.margem ?? 0) / 100

    for (let i = 0; i < n; i++) {
      if (pA[i] > 0) {
        vReceita[i] += rump[i] * prod.volume * fatorEnergia * prod.preco * margem
      }
    }
  }

  // ── 7. Headcount ─────────────────────────────────────────────
  //
  // FOLHA RECORRENTE:
  //   folhaAnual = −variacao × salário × (1 + ENCARGOS=80%) × 13,33 meses
  //   demissão (variacao < 0) → resultado positivo = ECONOMIA
  //   contratação (variacao > 0) → resultado negativo = CUSTO
  //   Aplicado com ramp-up em todos os períodos operacionais
  //
  // RESCISÃO (one-off, período 1):
  //   custo = |demitidos| × sal × (1 + multa_FGTS + férias_prop + aviso_meses)
  //   multa_FGTS = MULTA × FGTS × MESES × anos  ← SÓ A MULTA, não o saldo FGTS
  //   FGTS acumulado NÃO entra na rescisão (conforme planilha UISA)

  const vRH   = new Array(n).fill(0) as number[]   // folha recorrente
  const vResc = new Array(n).fill(0) as number[]   // rescisão one-off

  for (const grupo of (rh ?? [])) {
    const { variacao = 0, salario = 0, anos = 0 } = grupo

    // Folha recorrente (todos os períodos operacionais)
    const folhaAnual = -variacao * salario * (1 + ENCARGOS) * MESES
    for (let i = 0; i < n; i++) {
      if (pA[i] > 0) {
        vRH[i] += rump[i] * folhaAnual
      }
    }

    // Rescisão — somente para demissão, somente no período 1
    if (variacao < 0) {
      const nFunc     = Math.abs(variacao)
      const multaFgts = MULTA * FGTS * MESES * anos
      const avMeses   = (AV_BASE + AV_ANO * anos) / AV_BASE
      const custoPorFunc = salario * (1 + multaFgts + FERIAS + avMeses)
      vResc[1] -= nFunc * custoPorFunc // negativo = custo
    }
  }

  // ── 8. OPEX Unificado (economias + custos) ───────────────────
  // OpexInput.valor: positivo = economia (+), negativo = custo (−)
  // Ramp-up aplicado automaticamente. Controle de anoInicio/anoFim.
  const vCustos   = new Array(n).fill(0) as number[]
  const vReducoes = new Array(n).fill(0) as number[]

  for (const item of (opex ?? [])) {
    for (let i = 0; i < n; i++) {
      const p = pA[i]
      if (p <= 0) continue
      if (p < (item.anoInicio ?? 1)) continue
      if ((item.anoFim ?? 0) > 0 && p > item.anoFim!) continue

      const valorComRamp = rump[i] * (item.valor ?? 0)
      if (valorComRamp >= 0) {
        // economia / redução de custo → vai para vReducoes
        vReducoes[i] += valorComRamp
      } else {
        // novo custo → vai para vCustos
        vCustos[i] += valorComRamp
      }
    }
  }

  // ── 10. Depreciação & IRPJ ───────────────────────────────────
  // IRPJ zerado por padrão (aplicarIRPJ = false)
  // Base IRPJ: receita + folha_delta + custos + economias − depreciação
  const vDepreciacao = new Array(n).fill(0) as number[]
  const vIRPJ        = new Array(n).fill(0) as number[]

  if (aplicarIRPJ) {
    const taxaIRPJ = (ir ?? 15.3) / 100

    for (let i = 0; i < n; i++) {
      const p = pA[i]
      if (p <= 0) continue

      // Depreciação com suporte a ciclos de renovação
      const ciclo = Math.floor((p - 1) / vuOp)
      const pC    = p - ciclo * vuOp
      const dep   = pC <= (vidaFiscal ?? 5) ? capexLiq / (vidaFiscal ?? 5) : 0
      vDepreciacao[i] = -dep

      // IRPJ incide a partir do anoIRPJ
      if (datas[i].getFullYear() > (anoIRPJ ?? 2034)) {
        const base =
          vReceita[i] + vRH[i] + vResc[i] + vCustos[i] + vReducoes[i] - dep
        if (base > 0) {
          vIRPJ[i] = -taxaIRPJ * base
        }
      }
    }
  }

  // ── 11. Fluxo de Caixa Livre ─────────────────────────────────
  const fc = pA.map((_, i) =>
    vCapex[i] +
    vManut[i] +
    vReceita[i] +
    vRH[i] +
    vResc[i] +
    vCustos[i] +
    vReducoes[i] +
    vIRPJ[i]
  )

  // ── 12. Desconto & acumulados ─────────────────────────────────
  const wacc   = (tma ?? 14.7) / 100
  const fcDisc = fc.map((v, t) => (t === 0 ? v : v / Math.pow(1 + wacc, t)))

  const fcAcum  = fc.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? 0) + v)
    return acc
  }, [])

  const fcAcumD = fcDisc.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? 0) + v)
    return acc
  }, [])

  // ── 13. VPL ──────────────────────────────────────────────────
  // Replicando F98 = NPV(WACC, G94:O94) + F94
  // fc[0] NÃO é descontado (t=0)
  let vpl = fc[0]
  for (let i = 1; i < n; i++) {
    vpl += fc[i] / Math.pow(1 + wacc, i)
  }

  // ── 14. TIR ──────────────────────────────────────────────────
  const tir = calcularTIR(fc)

  // ── 15. Payback ───────────────────────────────────────────────
  const payback  = calcularPayback(fcAcum,  fc,     yf)
  const paybackD = calcularPayback(fcAcumD, fcDisc, yf)

  // ── 16. ROI ───────────────────────────────────────────────────
  const roi = capexLiq > 0 ? (vpl / capexLiq) * 100 : null

  return {
    safras, n, pA, rump,
    vCapex, vManut, vReceita, vRH, vResc, vCustos, vReducoes, vIRPJ, vDepreciacao,
    fc, fcDisc, fcAcum, fcAcumD,
    vpl, tir, payback, paybackD, roi,
    capexLiq, yf,
    engineVersion: 5,
  }
}

// ── SENSITIVITY ANALYSIS ─────────────────────────────────────

export interface SensitivityRow {
  tma:     number
  delta:   number   // difference from base TMA in pp
  vpl:     number
  payback: number | null
  viable:  boolean
}

/**
 * Análise de sensibilidade — recalcula VPL e Payback para 6 cenários de TMA.
 * NÃO recalcula o fluxo completo (usa fc já calculado com outros parâmetros fixos).
 */
export function calcularSensibilidade(
  fc: number[],
  fcAcumBase: number[],
  baseTMA: number,
  yf: number
): SensitivityRow[] {
  const deltas = [-5, -2.5, 0, 2.5, 5, 10]

  return deltas.map(delta => {
    const tma  = baseTMA + delta
    const rate = tma / 100

    // VPL: fc[0] + Σ fc[t]/(1+r)^t
    const vpl = fc.reduce((s, v, t) =>
      s + (t === 0 ? v : v / Math.pow(1 + rate, t)), 0
    )

    // Discounted payback
    const fcD = fc.map((v, t) => (t === 0 ? v : v / Math.pow(1 + rate, t)))
    const fcDA = fcD.reduce<number[]>((acc, v, i) => {
      acc.push((acc[i - 1] ?? 0) + v)
      return acc
    }, [])
    const payback = calcularPayback(fcDA, fcD, yf)

    return { tma, delta, vpl, payback, viable: vpl > 0 }
  })
}
