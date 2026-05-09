// ============================================================
// UISA — Motor de Viabilidade Econômica
// lib/analysis.ts — Motor de Análise Qualitativa Descritiva v1
//
// Esta versão usa regras e limiares predefinidos.
// Na v2 do aplicativo, substituir gerarAnalise() por chamada
// à API Anthropic (modelo a definir pelo cliente final).
// Ver Arquitetura Técnica v2.0 seção 3 para especificação
// completa da integração com IA.
// ============================================================

import type {
  ProjectInputs,
  CalculationResults,
  QualitativeAnalysisResult,
  ConvictionLevel,
  AnalysisSection,
} from '@/types'
import { fmtBRLFull, fmtPct, fmtYears } from './formatters'

// ── CONFIGURAÇÃO DE LIMIARES ──────────────────────────────────

const THRESHOLDS = {
  spreadAltaConviccao:    30,   // TIR - TMA ≥ 30pp
  spreadModerada:         15,   // TIR - TMA ≥ 15pp
  pbRatioExcelente:       0.30, // payback < 30% da vida útil
  pbRatioEquilibrado:     0.50,
  pbRatioPaciente:        0.80,
  folgaBaixo:             20,   // TMA pode subir 20pp
  folgaModerado:          10,
  folgaElevado:            5,
  capexComiteInvestimentos: 5_000_000, // R$ 5M → aprovação em comitê
} as const

// ── DETERMINAÇÃO DO NÍVEL ─────────────────────────────────────

function getNivel(vpl: number, spread: number | null): ConvictionLevel {
  if (vpl <= 0)                              return 'Inviável'
  if (spread !== null && spread >= THRESHOLDS.spreadAltaConviccao)
                                             return 'Alta Convicção'
  if (spread !== null && spread >= THRESHOLDS.spreadModerada)
                                             return 'Convicção Moderada'
  return 'Convicção Baixa'
}

function getNivelCor(nivel: ConvictionLevel): string {
  const map: Record<ConvictionLevel, string> = {
    'Alta Convicção':      '#34d399',
    'Convicção Moderada':  '#fbbf24',
    'Convicção Baixa':     '#60a5fa',
    'Inviável':            '#f87171',
  }
  return map[nivel]
}

// ── TMA CRÍTICA (até onde aguenta) ───────────────────────────

function calcTMACritica(fc: number[], baseTMA: number): number | null {
  for (let t = baseTMA; t <= 100; t += 0.1) {
    const vpl = fc.reduce((s, v, i) =>
      s + (i === 0 ? v : v / Math.pow(1 + t / 100, i)), 0
    )
    if (vpl <= 0) return parseFloat(t.toFixed(1))
  }
  return null
}

// ── GERAÇÃO DO TEXTO POR SEÇÃO ────────────────────────────────

function gerarSecaoVeredicto(
  inputs: ProjectInputs,
  results: CalculationResults,
  spread: number | null,
  roi: number | null,
  nivel: ConvictionLevel
): AnalysisSection {
  const { vpl, tir } = results
  const viable = vpl > 0
  const tirPct = tir ? tir * 100 : null

  let texto: string
  let detalhe: string

  if (!viable) {
    texto = `O projeto apresenta <strong>VPL negativo de ${fmtBRLFull(vpl)}</strong>, indicando que o investimento não cobre o custo de capital exigido (TMA de ${inputs.tma}%). ${tirPct !== null ? `A TIR calculada de <strong>${tirPct.toFixed(1)}%</strong> é inferior à TMA.` : 'Não foi possível calcular a TIR para este fluxo.'}`
    detalhe = `Antes de descartar, revisar: (1) volume incremental de receita — pequenas variações mudam o resultado; (2) valor do CAPEX — há margem para redução?; (3) prazo de ramp-up — antecipar operação melhora o VPL.`
  } else if (nivel === 'Alta Convicção') {
    texto = `O projeto demonstra <strong>alta atratividade econômica</strong>. Com VPL de <strong>${fmtBRLFull(vpl)}</strong> e TIR de <strong>${tirPct?.toFixed(1)}%</strong>, o retorno supera a TMA em <strong>${spread?.toFixed(1)} pp</strong> — margem de segurança robusta mesmo diante de cenários adversos.`
    detalhe = roi !== null ? `Relação VPL/CAPEX de <strong>${roi.toFixed(1)}%</strong>: para cada R$ 1,00 investido, o projeto gera R$ ${(1 + roi / 100).toFixed(2)} de valor presente. Perfil prioritário para alocação de capital.` : ''
  } else if (nivel === 'Convicção Moderada') {
    texto = `O projeto é <strong>economicamente viável</strong> com VPL de <strong>${fmtBRLFull(vpl)}</strong> e TIR de <strong>${tirPct?.toFixed(1)}%</strong>. O spread de ${spread?.toFixed(1)}pp acima da TMA oferece convicção moderada.`
    detalhe = `A margem de segurança significa que o retorno pode cair até ${spread?.toFixed(1)}pp e o projeto ainda seria viável. Recomendável, mas sensível a variações de premissas.`
  } else {
    texto = `O projeto é <strong>marginalmente viável</strong>. Com spread de apenas ${spread?.toFixed(1)}pp acima da TMA, qualquer deterioração nas premissas pode inverter a conclusão.`
    detalhe = `Spread abaixo de ${THRESHOLDS.spreadModerada}pp exige validação rigorosa das premissas de receita e custo. Análise de cenário pessimista recomendada antes da aprovação.`
  }

  return {
    titulo: 'Veredicto Econômico',
    icon:   'target',
    cor:    viable ? '#34d399' : '#f87171',
    itens:  [texto, detalhe].filter(Boolean),
  }
}

function gerarSecaoRetorno(
  inputs: ProjectInputs,
  results: CalculationResults
): AnalysisSection {
  const { payback, paybackD, vReceita, capexLiq } = results
  const vidaUtil   = inputs.vidaUtil ?? 10
  const pbRatio    = payback ? payback / vidaUtil : null
  const recAcum    = vReceita.reduce((s, v) => s + v, 0)
  const cobrCapex  = capexLiq > 0 ? recAcum / capexLiq : null

  const itens: string[] = []

  if (payback) itens.push(`<strong>Payback Simples de ${fmtYears(payback)}</strong> — investimento recuperado em ${pbRatio ? (pbRatio * 100).toFixed(0) : '?'}% da vida útil.`)
  if (paybackD) itens.push(`<strong>Payback Descontado de ${fmtYears(paybackD)}</strong> — considerando custo de capital (TMA ${inputs.tma}%).`)

  if (pbRatio !== null) {
    if (pbRatio < THRESHOLDS.pbRatioExcelente)
      itens.push(`Payback no primeiro terço da vida útil — <strong>excelente aproveitamento</strong> do ativo.`)
    else if (pbRatio < THRESHOLDS.pbRatioEquilibrado)
      itens.push(`Payback na primeira metade da vida útil — <strong>perfil equilibrado</strong> de retorno.`)
    else if (pbRatio < THRESHOLDS.pbRatioPaciente)
      itens.push(`Payback na segunda metade da vida útil — projeto tem retorno, mas <strong>requer paciência de capital</strong>.`)
    else
      itens.push(`⚠️ Payback próximo ao fim da vida útil — <strong>alta dependência dos anos finais</strong> do projeto.`)
  }

  if (cobrCapex !== null) {
    itens.push(`Receita incremental acumulada: <strong>${fmtBRLFull(recAcum)}</strong> — representa <strong>${cobrCapex.toFixed(1)}× o CAPEX investido</strong>.`)
  }

  return { titulo: 'Análise de Retorno e Prazo', icon: 'clock', cor: '#fbbf24', itens }
}

function gerarSecaoRisco(
  inputs: ProjectInputs,
  results: CalculationResults
): AnalysisSection {
  const { fc, fcAcum } = results
  const tmaCritica = calcTMACritica(fc, inputs.tma)
  const folga = tmaCritica !== null ? tmaCritica - inputs.tma : null
  const picoNeg = Math.min(...fcAcum)

  const itens: string[] = []

  // TMA crítica
  if (folga !== null && tmaCritica !== null) {
    const riscoLabel =
      folga >= THRESHOLDS.folgaBaixo    ? 'baixo' :
      folga >= THRESHOLDS.folgaModerado ? 'moderado' :
      folga >= THRESHOLDS.folgaElevado  ? 'elevado' : 'alto'
    itens.push(`<strong>TMA crítica: ${tmaCritica.toFixed(1)}%</strong> — o projeto suporta até <strong>${folga.toFixed(1)}pp de elevação na TMA</strong> antes de se tornar inviável. Risco de taxa: <strong>${riscoLabel}</strong>.`)
  }

  // Exposição máxima
  itens.push(`<strong>Exposição máxima de capital: ${fmtBRLFull(Math.abs(picoNeg))}</strong> — maior desembolso acumulado antes da recuperação.`)

  // Ramp-up
  if (inputs.rampupTipo === 'integral') {
    itens.push(`Ramp-up <strong>integral</strong> assume 100% de capacidade desde a 1ª safra. Qualquer atraso na implantação impacta diretamente o payback.`)
  } else if (inputs.rampupTipo === 'linear') {
    itens.push(`Ramp-up <strong>linear</strong> distribui o risco de implantação gradualmente, reduzindo o impacto de atrasos iniciais.`)
  } else {
    itens.push(`Ramp-up <strong>personalizado</strong> configurado para o cronograma específico do projeto. Validar com equipe operacional.`)
  }

  // Headcount
  const demitidos = (inputs.rh ?? [])
    .filter(g => g.variacao < 0)
    .reduce((s, g) => s + Math.abs(g.variacao), 0)
  if (demitidos > 0) {
    itens.push(`Projeto prevê <strong>redução de ${demitidos} colaborador${demitidos > 1 ? 'es' : ''}</strong>. Alinhar com RH e Jurídico sobre processo de desligamento e possíveis passivos trabalhistas.`)
  }

  // IRPJ
  if (!inputs.aplicarIRPJ) {
    itens.push(`<strong>IRPJ/CSLL está zerrado</strong> nesta análise. Quando ativado, pode reduzir o VPL dependendo da base tributável.`)
  }

  return { titulo: 'Avaliação de Risco', icon: 'shield-alert', cor: '#60a5fa', itens }
}

function gerarSecaoProximosPassos(
  inputs: ProjectInputs,
): AnalysisSection {
  const itens: string[] = []

  // Validação de receita
  if ((inputs.produtos ?? []).length > 0) {
    const prods = inputs.produtos.map(p => p.nome).join(', ')
    itens.push(`<strong>Validar volumes incrementais:</strong> os ganhos de ${prods} são a principal fonte de retorno. Confirmar com equipe operacional antes da aprovação.`)
  }

  // Contratações
  if ((inputs.rh ?? []).some(g => g.variacao > 0)) {
    itens.push(`<strong>Contratações planejadas:</strong> validar disponibilidade de mercado para os cargos e tempo de onboarding, que pode atrasar o ramp-up de produtividade.`)
  }

  // Reduções estruturais
  if (((inputs as any).reducoes ?? []).length > 0) {
    itens.push(`<strong>Economias estruturais:</strong> formalizar em contrato ou plano de gestão antes da execução para garantir realização do benefício.`)
  }

  // Comitê de investimentos
  if (inputs.capex > THRESHOLDS.capexComiteInvestimentos) {
    itens.push(`<strong>CAPEX acima de R$ 5M:</strong> verificar nível de alçada decisória na governança UISA — projetos neste porte normalmente requerem aprovação em Comitê de Investimentos.`)
  }

  // Monitoramento
  const monitorAnos = Math.min(3, inputs.vidaUtil ?? 10)
  itens.push(`<strong>Monitoramento pós-implantação:</strong> revisão semestral dos resultados realizados vs. projetados durante os primeiros ${monitorAnos} anos de operação.`)

  return {
    titulo: 'Pontos de Atenção e Próximos Passos',
    icon:   'check-circle',
    cor:    '#a78bfa',
    itens,
  }
}

// ── FUNÇÃO PRINCIPAL ──────────────────────────────────────────

/**
 * Gera análise qualitativa descritiva baseada em regras.
 *
 * Esta é a versão v1 — sem IA, 100% local e offline.
 *
 * Para migrar para IA (v2):
 * 1. Criar lib/analysis-ai.ts com chamada à API Anthropic
 * 2. Passar inputs + results como contexto estruturado
 * 3. Retornar o mesmo tipo QualitativeAnalysisResult
 * 4. Manter esta função como fallback quando IA indisponível
 *
 * Modelo recomendado: a definir pelo cliente final.
 * Opções: claude-sonnet-4 (qualidade/custo), claude-opus-4 (máxima qualidade).
 */
export function gerarAnalise(
  inputs: ProjectInputs,
  results: CalculationResults
): QualitativeAnalysisResult {
  const { vpl, tir } = results
  const tirPct  = tir ? tir * 100 : null
  const spread  = tirPct !== null ? tirPct - inputs.tma : null
  const roi     = results.capexLiq > 0 ? (vpl / results.capexLiq) * 100 : null
  const nivel   = getNivel(vpl, spread)
  const nivelCor = getNivelCor(nivel)

  const sections: AnalysisSection[] = [
    gerarSecaoVeredicto(inputs, results, spread, roi, nivel),
    gerarSecaoRetorno(inputs, results),
    gerarSecaoRisco(inputs, results),
    gerarSecaoProximosPassos(inputs),
  ]

  return { nivel, nivelCor, spread, sections }
}
