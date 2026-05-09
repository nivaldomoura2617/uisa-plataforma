// ============================================================
// UISA — Motor de Viabilidade Econômica
// lib/formatters.ts
// ============================================================

/**
 * Formata valor em Real (BRL).
 * Por padrão divide por 1000 (exibe em R$ mil).
 */
export function fmtBRL(value: number | null | undefined, inThousands = true): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const v   = inThousands ? value / 1000 : value
  const abs = Math.abs(v)
  const str = abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return v < 0 ? `(${str})` : str
}

/**
 * Formata valor em Real completo com símbolo R$.
 */
export function fmtBRLFull(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formata taxa em percentual.
 * Recebe valor decimal (0.147) ou percentual (14.7) conforme `isDecimal`.
 */
export function fmtPct(
  value: number | null | undefined,
  isDecimal = true,
  decimals = 1
): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const pct = isDecimal ? value * 100 : value
  return `${pct.toFixed(decimals)}%`
}

/**
 * Formata anos fracionários em "Xa Ym".
 * Exemplo: 2.95 → "2a 11m"
 */
export function fmtYears(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '> período'
  const y = Math.floor(value)
  const m = Math.round((value - y) * 12)
  if (m === 0) return `${y} anos`
  if (y === 0) return `${m} meses`
  return `${y}a ${m}m`
}

/**
 * Formata número com separadores PT-BR.
 */
export function fmtNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Trunca texto com reticências.
 */
export function truncate(text: string, max = 40): string {
  return text.length <= max ? text : text.slice(0, max - 1) + '…'
}
