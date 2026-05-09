// ── StepConfig ────────────────────────────────────────────────
'use client'
import type { ProjectInputs } from '@/types'

interface StepProps { inputs: Partial<ProjectInputs>; onChange: (p: Partial<ProjectInputs>) => void }

export function StepConfig({ inputs, onChange, isModerador }: StepProps & { isModerador: boolean }) {
  const f = (field: keyof ProjectInputs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value
    onChange({ [field]: v })
  }

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-uisa-green/15 flex items-center justify-center text-uisa-green text-xs font-bold">1</div>
        Configurações do Estudo
      </h2>
      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className="field-label">Nome do Projeto *</label>
          <input className="field-input" value={inputs.nome ?? ''} onChange={f('nome')} placeholder="Ex: Automação Linha 3 — Moagem" />
        </div>
        <div>
          <label className="field-label">Responsável</label>
          <input className="field-input" value={inputs.resp ?? ''} onChange={f('resp')} placeholder="Nome do responsável" />
        </div>
        <div>
          <label className="field-label">Departamento</label>
          <input className="field-input" value={inputs.depto ?? ''} onChange={f('depto')} placeholder="Ex: Industrial" />
        </div>
        <div>
          <label className="field-label">Vida Útil (anos)</label>
          <input className="field-input" type="number" value={inputs.vidaUtil ?? 10} onChange={f('vidaUtil')} min={1} max={30} />
        </div>
        <div>
          <label className="field-label">TMA / WACC (%/ano) {!isModerador && <span className="text-slate-600 text-[10px]">— fixado</span>}</label>
          <input className="field-input" type="number" value={inputs.tma ?? 14.7} onChange={f('tma')} step={0.1} disabled={!isModerador} />
        </div>
        <div>
          <label className="field-label">IRPJ + CSLL (%) {!isModerador && <span className="text-slate-600 text-[10px]">— fixado</span>}</label>
          <input className="field-input" type="number" value={inputs.ir ?? 15.3} onChange={f('ir')} step={0.1} disabled={!isModerador} />
        </div>
        <div>
          <label className="field-label">Início IRPJ (ano) {!isModerador && <span className="text-slate-600 text-[10px]">— fixado</span>}</label>
          <input className="field-input" type="number" value={inputs.anoIRPJ ?? 2034} onChange={f('anoIRPJ')} disabled={!isModerador} />
        </div>
        <div className="col-span-2">
          <label className="field-label">Aplicar IRPJ/CSLL no Fluxo?</label>
          <div className="flex gap-4 mt-2">
            {[{v:false,l:'Não — Zerrado (padrão UISA)'},{v:true,l:'Sim — Calcular e incluir no FCL'}].map(opt => (
              <label key={String(opt.v)} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={inputs.aplicarIRPJ === opt.v}
                  onChange={() => onChange({ aplicarIRPJ: opt.v })} className="accent-uisa-green" />
                <span className="text-sm text-slate-300">{opt.l}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
