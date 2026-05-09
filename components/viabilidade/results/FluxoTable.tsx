'use client'
import type { CalculationResults } from '@/types'
import { fmtBRL, fmtBRLFull, fmtYears } from '@/lib/formatters'
import { calcularPayback } from '@/lib/calculations'

// ── FLUXO TABLE ────────────────────────────────────────────────
export function FluxoTable({ results }: { results: CalculationResults }) {
  const { safras, vCapex, vManut, vReceita, vRH, vResc, vReducoes, vCustos, vIRPJ, fc, fcAcum } = results
  const zero = Array(safras.length).fill(0)

  const rows: Array<{ label: string; data: number[]; cls: string; bold?: boolean; italic?: boolean }> = [
    { label: '(−) CAPEX',          data: vCapex,          cls: 'text-red-400' },
    { label: '(−) Manutenção',     data: vManut,          cls: 'text-orange-400' },
    { label: 'Ganhos Receita',     data: vReceita,        cls: 'text-emerald-400' },
    { label: '∆ Folha / RH',       data: vRH,             cls: 'text-blue-400' },
    { label: 'Rescisões (one-off)',data: vResc || zero,   cls: 'text-red-300' },
    { label: 'Economias de Custo', data: vReducoes || zero, cls: 'text-emerald-300' },
    { label: 'Var. Custos / OPEX', data: vCustos,         cls: 'text-orange-300' },
    { label: '(−) IRPJ/CSLL',     data: vIRPJ || zero,   cls: 'text-slate-400' },
    { label: '(=) FCL',            data: fc,              cls: 'text-white', bold: true },
    { label: 'FCL Acumulado',      data: fcAcum,          cls: 'text-slate-400', italic: true },
  ]

  const thCls = 'px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap'
  const tdVal = (v: number) => {
    const col = v < 0 ? 'text-red-400' : v > 0 ? 'text-emerald-400' : 'text-slate-600'
    return `${col} font-mono`
  }

  return (
    <table className="w-full text-xs min-w-max">
      <thead>
        <tr>
          <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-40">Item (R$ mil)</th>
          {safras.map(s => <th key={s} className={thCls}>{s}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.label} className={row.bold ? 'bg-uisa-green/5' : ''}>
            <td className={`px-3 py-1.5 ${row.cls} ${row.bold ? 'font-bold' : ''} ${row.italic ? 'italic' : ''} sticky left-0 bg-slate-900 text-xs`}>
              {row.label}
            </td>
            {row.data.map((v, i) => (
              <td key={i} className={`px-3 py-1.5 text-right text-[11px] ${row.bold ? tdVal(v) + ' font-bold' : tdVal(v)}`}>
                {fmtBRL(v)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── SENSIBILIDADE TABLE ────────────────────────────────────────
export function SensibilidadeTable({ fc, baseTMA, yf }: {
  fc: number[]
  baseTMA: number
  yf: number
}) {
  const deltas = [-5, -2.5, 0, 2.5, 5, 10]

  const rows = deltas.map(d => {
    const tma  = baseTMA + d
    const rate = tma / 100
    const vpl  = fc.reduce((s, v, t) => s + (t === 0 ? v : v / Math.pow(1 + rate, t)), 0)
    const fcD  = fc.map((v, t) => t === 0 ? v : v / Math.pow(1 + rate, t))
    const acD  = fcD.reduce<number[]>((acc, v, i) => { acc.push((acc[i-1]??0)+v); return acc }, [])
    const pb   = calcularPayback(acD, fcD, yf)
    return { tma, delta: d, vpl, payback: pb, viable: vpl > 0 }
  })

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest pb-2 border-b border-slate-800">
        <span>TMA Cenário</span><span className="text-right">VPL</span><span className="text-right">Payback Desc.</span><span className="text-right">Status</span>
      </div>
      {rows.map(row => (
        <div key={row.tma} className={`grid grid-cols-4 items-center py-2 text-xs border-b border-slate-800/50 ${row.delta === 0 ? 'font-bold' : ''}`}>
          <span className={`font-mono ${row.delta === 0 ? 'text-white' : 'text-slate-400'}`}>
            {row.tma.toFixed(1)}%{row.delta === 0 ? ' ← base' : row.delta > 0 ? ` (+${row.delta}%)` : ` (${row.delta}%)`}
          </span>
          <span className={`text-right font-mono ${row.viable ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtBRLFull(row.vpl)}
          </span>
          <span className="text-right font-mono text-slate-300">{fmtYears(row.payback)}</span>
          <span className={`text-right text-[10px] font-bold px-2 py-0.5 rounded-full ${
            row.viable ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {row.viable ? 'Viável' : 'Inviável'}
          </span>
        </div>
      ))}
    </div>
  )
}
