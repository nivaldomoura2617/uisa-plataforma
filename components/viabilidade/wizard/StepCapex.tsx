'use client'
import type { ProjectInputs, OpexInput, RHInput } from '@/types'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface StepProps { inputs: Partial<ProjectInputs>; onChange: (p: Partial<ProjectInputs>) => void }

// ── CAPEX ─────────────────────────────────────────────────────
export function StepCapex({ inputs, onChange }: StepProps) {
  const f = (field: keyof ProjectInputs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) :
              e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    onChange({ [field]: v })
  }

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-400 text-xs font-bold">2</div>
        CAPEX — Investimento
      </h2>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="field-label">Valor do Investimento (R$) *</label>
          <input className="field-input" type="number" value={inputs.capex ?? ''} onChange={f('capex')} placeholder="Ex: 1652000" />
        </div>
        <div>
          <label className="field-label">Data do Investimento *</label>
          <input className="field-input" type="date" value={inputs.dataInvest ?? ''} onChange={f('dataInvest')} />
        </div>
        <div>
          <label className="field-label">Manutenção Anual (R$)</label>
          <input className="field-input" type="number" value={inputs.manutencao ?? 0} onChange={f('manutencao')} />
        </div>
        <div>
          <label className="field-label">Vida Útil Fiscal (anos)</label>
          <input className="field-input" type="number" value={inputs.vidaFiscal ?? 5} onChange={f('vidaFiscal')} min={1} max={20} />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <input type="checkbox" id="creditoPis" checked={inputs.creditoPis ?? false}
            onChange={e => onChange({ creditoPis: e.target.checked })} className="accent-uisa-green w-4 h-4" />
          <label htmlFor="creditoPis" className="text-sm text-slate-300">
            Crédito de PIS/COFINS no CAPEX (9,15% de desconto no investimento)
          </label>
        </div>
        <div className="col-span-2">
          <label className="field-label">Tipo de Ramp-up</label>
          <div className="flex gap-3 mt-2">
            {(['integral','linear','personalizado'] as const).map(tipo => (
              <label key={tipo} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                inputs.rampupTipo === tipo
                  ? 'border-uisa-green bg-uisa-green/10 text-uisa-green'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
                <input type="radio" name="rampup" value={tipo} checked={inputs.rampupTipo === tipo}
                  onChange={() => onChange({ rampupTipo: tipo })} className="sr-only" />
                <span className="capitalize">{tipo === 'integral' ? 'Integral (100% desde o 1º ano)' : tipo === 'linear' ? 'Linear (gradual)' : 'Personalizado'}</span>
              </label>
            ))}
          </div>
          {inputs.rampupTipo === 'linear' && (
            <div className="mt-3">
              <label className="field-label">Anos para atingir 100%</label>
              <input className="field-input w-32" type="number" value={inputs.rampupAnos ?? 5}
                onChange={e => onChange({ rampupAnos: parseInt(e.target.value) })} min={1} max={9} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── RECEITA ───────────────────────────────────────────────────
export function StepReceita({ inputs, onChange, produtos, isModerador }: StepProps & {
  produtos: Array<{ nome: string; preco: number; margem: number; unidade: string }>
  isModerador: boolean
}) {
  const prods = inputs.produtos ?? []
  const updateProd = (nome: string, field: 'volume' | 'preco' | 'margem', value: number) => {
    const existing = prods.find(p => p.nome === nome)
    if (existing) {
      onChange({ produtos: prods.map(p => p.nome === nome ? { ...p, [field]: value } : p) })
    } else {
      const template = produtos.find(p => p.nome === nome)
      onChange({ produtos: [...prods, { nome, volume: 0, preco: template?.preco ?? 0, margem: template?.margem ?? 0, [field]: value }] })
    }
  }
  const getProd = (nome: string) => prods.find(p => p.nome === nome)
  const template = (nome: string) => produtos.find(p => p.nome === nome)

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs font-bold">3</div>
        Receitas — Ganho Incremental de Produção
      </h2>
      <p className="text-xs text-slate-500 mb-5">Insira apenas o volume INCREMENTAL que o projeto vai gerar. Margens já líquidas de PIS/COFINS.</p>
      <div className="space-y-3">
        {produtos.map(prod => {
          const current = getProd(prod.nome)
          return (
            <div key={prod.nome} className="grid grid-cols-12 gap-3 items-end p-3 bg-slate-800/50 rounded-lg">
              <div className="col-span-4">
                <label className="field-label text-[9px]">{prod.nome} ({prod.unidade})</label>
                <input className="field-input text-xs py-1.5" type="number"
                  value={current?.volume ?? ''} min={0} placeholder="0"
                  onChange={e => updateProd(prod.nome, 'volume', parseFloat(e.target.value)||0)} />
              </div>
              <div className="col-span-4">
                <label className="field-label text-[9px]">Preço (R$/{prod.unidade})</label>
                <input className="field-input text-xs py-1.5 font-mono" type="number"
                  value={current?.preco ?? template(prod.nome)?.preco ?? 0}
                  disabled={!isModerador} step={0.01}
                  onChange={e => updateProd(prod.nome, 'preco', parseFloat(e.target.value)||0)} />
              </div>
              <div className="col-span-4">
                <label className="field-label text-[9px]">Margem (%)</label>
                <input className="field-input text-xs py-1.5 font-mono" type="number"
                  value={current?.margem ?? template(prod.nome)?.margem ?? 0}
                  disabled={!isModerador} step={0.1}
                  onChange={e => updateProd(prod.nome, 'margem', parseFloat(e.target.value)||0)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── OPEX UNIFICADO ────────────────────────────────────────────
export function StepOpex({ inputs, onChange }: StepProps) {
  const opex = (inputs.opex ?? []) as OpexInput[]

  const add = (nome: string, tipo: string, valorDefault: number) => {
    onChange({ opex: [...opex, { nome, tipo, valor: valorDefault, anoInicio: 1, anoFim: 0 }] })
  }
  const remove = (i: number) => onChange({ opex: opex.filter((_, idx) => idx !== i) })
  const update = (i: number, field: keyof OpexInput, value: any) => {
    onChange({ opex: opex.map((o, idx) => idx === i ? { ...o, [field]: value } : o) })
  }

  const btnClass = (color: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${color}`

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 text-xs font-bold">4</div>
        Custos / OPEX
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        <strong className="text-emerald-400">(+) positivo</strong> = economia/redução de custo existente ·
        <strong className="text-red-400"> (−) negativo</strong> = novo custo gerado pelo projeto.
        Ramp-up aplicado automaticamente.
      </p>

      {/* Seção 1 */}
      <div className="mb-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Variações de Custo / OPEX</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { n:'Redução de Manutenção', t:'manutencao', v:0, c:'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' },
            { n:'Redução de Energia',    t:'energia',    v:0, c:'border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' },
            { n:'Redução de Estoque',    t:'estoque',    v:0, c:'border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' },
            { n:'Redução de Processo',   t:'processo',   v:0, c:'border-orange-500/20 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' },
            { n:'Outro OPEX',            t:'outro',      v:0, c:'border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700' },
          ].map(b => <button key={b.n} onClick={() => add(b.n, b.t, b.v)} className={btnClass(b.c)}><Plus className="w-3 h-3"/> {b.n.replace('Redução de ','+ ')}</button>)}
        </div>
      </div>

      {/* Seção 2 */}
      <div className="mb-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Despesas e Serviços</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { n:'Serviço Profissional', t:'despesa', v:-0 },
            { n:'Despesa Comercial',    t:'despesa', v:-0 },
            { n:'Utilities',            t:'despesa', v:-0 },
            { n:'Outra Despesa',        t:'despesa', v:-0 },
          ].map(b => <button key={b.n} onClick={() => add(b.n, b.t, b.v)}
            className={btnClass('border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20')}>
            <Plus className="w-3 h-3"/> {b.n}</button>)}
        </div>
      </div>

      {/* Lista de itens */}
      <div className="space-y-2">
        {opex.map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-800/50 p-3 rounded-lg">
            <div className="col-span-4">
              <label className="field-label text-[9px]">Descrição</label>
              <input className="field-input text-xs py-1.5" value={item.nome}
                onChange={e => update(i, 'nome', e.target.value)} />
            </div>
            <div className="col-span-3">
              <label className="field-label text-[9px]">(+) Economia / (−) Custo</label>
              <input className="field-input text-xs py-1.5 font-mono" type="number" value={item.valor}
                onChange={e => update(i, 'valor', parseFloat(e.target.value)||0)} placeholder="Ex: 80000 ou -75000" />
            </div>
            <div className="col-span-2">
              <label className="field-label text-[9px]">Início</label>
              <input className="field-input text-xs py-1.5" type="number" value={item.anoInicio} min={1} max={20}
                onChange={e => update(i, 'anoInicio', parseInt(e.target.value)||1)} />
            </div>
            <div className="col-span-2">
              <label className="field-label text-[9px]">Fim (0=sempre)</label>
              <input className="field-input text-xs py-1.5" type="number" value={item.anoFim} min={0} max={20}
                onChange={e => update(i, 'anoFim', parseInt(e.target.value)||0)} />
            </div>
            <div className="col-span-1 flex justify-end">
              <button onClick={() => remove(i)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {opex.length === 0 && (
          <p className="text-center text-slate-600 text-xs py-4">Nenhum item adicionado. Use os botões acima.</p>
        )}
      </div>
    </div>
  )
}

// ── RH / FOLHA ────────────────────────────────────────────────
export function StepRH({ inputs, onChange }: StepProps) {
  const rh = (inputs.rh ?? []) as RHInput[]

  const add = () => onChange({ rh: [...rh, { cargo: '', variacao: -1, salario: 0, anos: 0 }] })
  const remove = (i: number) => onChange({ rh: rh.filter((_, idx) => idx !== i) })
  const update = (i: number, field: keyof RHInput, value: any) => {
    onChange({ rh: rh.map((r, idx) => idx === i ? { ...r, [field]: value } : r) })
  }

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 text-xs font-bold">5</div>
        RH / Folha de Pagamento
      </h2>
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-3 mb-4 text-xs text-slate-400 leading-relaxed">
        <strong className="text-slate-200">Sinal:</strong> negativo (−) = demissão → gera <span className="text-emerald-400">economia (+)</span> recorrente.
        Positivo (+) = contratação → gera <span className="text-red-400">custo (−)</span> recorrente.
        Encargos fixos: <strong className="text-slate-200">80%</strong> sobre salário bruto.
      </div>

      <div className="space-y-2 mb-4">
        {rh.map((grupo, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-800/50 p-3 rounded-lg">
            <div className="col-span-4">
              <label className="field-label text-[9px]">Cargo / Grupo</label>
              <input className="field-input text-xs py-1.5" value={grupo.cargo}
                onChange={e => update(i, 'cargo', e.target.value)} placeholder="Ex: Operador de Moenda" />
            </div>
            <div className="col-span-2">
              <label className="field-label text-[9px]">Δ Headcount</label>
              <input className="field-input text-xs py-1.5 font-mono" type="number" value={grupo.variacao}
                onChange={e => update(i, 'variacao', parseInt(e.target.value)||0)} />
            </div>
            <div className="col-span-3">
              <label className="field-label text-[9px]">Salário Bruto (R$/mês)</label>
              <input className="field-input text-xs py-1.5 font-mono" type="number" value={grupo.salario} min={0}
                onChange={e => update(i, 'salario', parseFloat(e.target.value)||0)} />
            </div>
            <div className="col-span-2">
              <label className="field-label text-[9px]">Tempo empresa (anos)</label>
              <input className="field-input text-xs py-1.5" type="number" value={grupo.anos} min={0}
                onChange={e => update(i, 'anos', parseFloat(e.target.value)||0)} />
            </div>
            <div className="col-span-1 flex justify-end">
              <button onClick={() => remove(i)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {rh.length === 0 && <p className="text-center text-slate-600 text-xs py-4">Nenhum grupo adicionado.</p>}
      </div>
      <button onClick={add} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <Plus className="w-4 h-4" /> Adicionar Grupo de Cargos
      </button>
    </div>
  )
}

// ── REVISÃO ───────────────────────────────────────────────────
export function StepRevisao({ inputs, premissas }: {
  inputs: Partial<ProjectInputs>
  premissas: { tma: number; ir: number; anoIRPJ: number }
}) {
  const brl = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(v)

  const rows: [string, string][] = [
    ['Projeto',          inputs.nome ?? '—'],
    ['Responsável',      inputs.resp ?? '—'],
    ['Departamento',     inputs.depto ?? '—'],
    ['TMA',              `${inputs.tma ?? premissas.tma}% a.a.`],
    ['Vida Útil',        `${inputs.vidaUtil ?? 10} anos`],
    ['IRPJ/CSLL',        inputs.aplicarIRPJ ? `${inputs.ir ?? premissas.ir}% (ativo)` : 'Zerrado'],
    ['CAPEX',            brl(inputs.capex ?? 0)],
    ['Data Investimento',inputs.dataInvest ?? '—'],
    ['Manutenção Anual', brl(inputs.manutencao ?? 0)],
    ['Ramp-up',          inputs.rampupTipo ?? 'integral'],
    ['Produtos',         `${(inputs.produtos ?? []).filter(p => p.volume > 0).length} produto(s) com volume`],
    ['OPEX',             `${(inputs.opex ?? []).length} item(ns)`],
    ['RH',               `${(inputs.rh ?? []).length} grupo(s) de cargos`],
  ]

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 text-xs font-bold">6</div>
        Revisão Final
      </h2>
      <p className="text-xs text-slate-500 mb-4">Confirme os dados antes de calcular a viabilidade.</p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 border-b border-slate-800">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-semibold text-slate-200 text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
