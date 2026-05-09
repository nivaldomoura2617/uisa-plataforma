'use client'
import { useState } from 'react'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import type { ProjectInputs, CalculationResults } from '@/types'
import { fmtBRLFull, fmtPct, fmtYears } from '@/lib/formatters'
import { gerarAnalise } from '@/lib/analysis'
import { SensibilidadeTable } from './FluxoTable'
import { FluxoTable }         from './FluxoTable'

interface Props {
  inputs:      ProjectInputs
  results:     CalculationResults
  isModerador: boolean
  onEdit?:     () => void
}

export function ResultsView({ inputs, results, isModerador, onEdit }: Props) {
  const { vpl, tir, payback, paybackD } = results
  const viable = vpl > 0
  const analise = gerarAnalise(inputs, results)

  const kpis = [
    { label:'VPL',           value: fmtBRLFull(vpl),     sub: 'Valor Presente Líquido', green: viable },
    { label:'TIR',           value: fmtPct(tir),          sub: `TMA: ${inputs.tma}%`,    green: tir !== null && tir*100 >= inputs.tma },
    { label:'Payback',       value: fmtYears(payback),    sub: 'Simples',               green: payback !== null },
    { label:'Payback Desc.', value: fmtYears(paybackD),   sub: 'Descontado (TMA)',       green: paybackD !== null },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onEdit && (
            <button onClick={onEdit} className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{inputs.nome}</h1>
            <p className="text-slate-400 text-sm">{inputs.depto} · {inputs.resp}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            viable ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {analise.nivel}
          </span>
        </div>
      </div>

      {/* Veredicto banner */}
      <div className={`rounded-xl border p-5 flex items-center gap-4 ${
        viable ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
          viable ? 'bg-emerald-500/15' : 'bg-red-500/15'
        }`}>
          {viable ? '✅' : '❌'}
        </div>
        <div>
          <p className={`font-bold text-base ${viable ? 'text-emerald-400' : 'text-red-400'}`}>
            {viable ? 'Projeto Viável' : 'Projeto Inviável'}
          </p>
          <p className="text-slate-400 text-sm">
            {viable
              ? 'O retorno supera a TMA configurada. Recomendado para aprovação.'
              : 'VPL negativo indica que o projeto não cobre o custo de capital.'}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{k.label}</p>
            <p className={`text-xl font-bold font-mono ${k.green ? 'text-emerald-400' : 'text-red-400'}`}>
              {k.value}
            </p>
            <p className="text-[11px] text-slate-600 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Fluxo de Caixa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fluxo de Caixa — R$ mil</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <FluxoTable results={results} />
        </div>
      </div>

      {/* Sensibilidade TMA */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Análise de Sensibilidade — TMA
          </h3>
          <SensibilidadeTable fc={results.fc} baseTMA={inputs.tma} yf={results.yf} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Premissas</h3>
          <div className="space-y-2 text-xs">
            {[
              ['TMA (WACC)',     `${inputs.tma}%`],
              ['PIS/COFINS',    '9,15% — nas margens'],
              ['IRPJ/CSLL',     inputs.aplicarIRPJ ? `${inputs.ir}% (ativo)` : 'Zerrado'],
              ['Vida Útil',     `${inputs.vidaUtil} anos`],
              ['Encargos folha','80% (premissa UISA)'],
              ['Ramp-up',       inputs.rampupTipo],
            ].map(([l,v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">{l}</span>
                <span className="font-mono text-slate-300">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Análise Qualitativa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 text-lg">🧠</div>
          <div>
            <h3 className="text-sm font-bold text-white">Análise Qualitativa</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">
              Interpretação automática · Versão descritiva
            </p>
          </div>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
            style={{ color: analise.nivelCor, background: analise.nivelCor + '22' }}>
            {analise.nivel}
          </span>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {analise.sections.map(section => (
            <div key={section.titulo}
              className="rounded-xl p-4 border"
              style={{ background: section.cor + '08', borderColor: section.cor + '33' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: section.cor }}>
                {section.titulo}
              </p>
              <div className="space-y-2">
                {section.itens.map((item, i) => (
                  <p key={i} className="text-xs text-slate-400 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-indigo-500/5 border-t border-indigo-500/10 flex items-center gap-2">
          <span className="text-indigo-400 text-sm">✨</span>
          <p className="text-[11px] text-indigo-300/60">
            <strong className="text-indigo-300">Versão futura:</strong> análise por IA (Claude) com contexto completo do projeto, benchmarks e recomendações personalizadas.
          </p>
        </div>
      </div>
    </div>
  )
}
