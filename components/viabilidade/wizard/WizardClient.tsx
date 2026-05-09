'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calcularFluxo } from '@/lib/calculations'
import type { ProjectInputs } from '@/types'

// Sub-components (importados)
import { StepConfig }   from './StepConfig'
import { StepCapex, StepReceita, StepOpex, StepRH, StepRevisao } from './StepCapex'
import { ResultsView }  from '../results/ResultsView'

const STEPS = [
  { id: 1, label: 'Configurações' },
  { id: 2, label: 'CAPEX' },
  { id: 3, label: 'Receitas' },
  { id: 4, label: 'Custos / OPEX' },
  { id: 5, label: 'RH / Folha' },
  { id: 6, label: 'Revisão' },
]

interface Props {
  isModerador:  boolean
  canCalculate: boolean   // apenas MODERADOR e ADMIN_APP
  premissas: { tma: number; ir: number; anoIRPJ: number }
  produtos: Array<{ nome: string; preco: number; margem: number; unidade: string }>
  initialInputs?: Partial<ProjectInputs>
  projectId?: string
}

export function WizardClient({ isModerador, canCalculate, premissas, produtos, initialInputs, projectId }: Props) {
  const router = useRouter()
  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)
  const [results, setResults] = useState<any>(null)
  const [savedId, setSavedId] = useState<string | null>(projectId ?? null)

  const [inputs, setInputs] = useState<Partial<ProjectInputs>>({
    tma:        premissas.tma,
    ir:         premissas.ir,
    anoIRPJ:    premissas.anoIRPJ,
    pisCofins:  9.15,
    vidaUtil:   10,
    aplicarIRPJ:false,
    creditoPis: false,
    manutencao: 0,
    vidaFiscal: 5,
    rampupTipo: 'integral',
    rampupAnos: 5,
    rampupCustom:[],
    produtos:   [],
    opex:       [],
    rh:         [],
    ...initialInputs,
  })

  function merge(partial: Partial<ProjectInputs>) {
    setInputs(prev => ({ ...prev, ...partial }))
  }

  async function handleCalculate() {
    setSaving(true)
    try {
      const method  = savedId ? 'PUT' : 'POST'
      const url     = savedId ? `/api/projects/${savedId}` : '/api/projects'
      const res     = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ inputs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const id = savedId ?? data.projectId
      setSavedId(id)

      // Calcular localmente para exibir imediatamente
      const dp = (inputs.dataInvest as string).split('-')
      const r  = calcularFluxo({
        ...(inputs as ProjectInputs),
        dataInvest: new Date(+dp[0], +dp[1]-1, +dp[2]) as any,
      })
      setResults(r)
    } catch (e) {
      alert('Erro ao salvar: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Mostrar resultados após calcular
  if (results && savedId) {
    return (
      <ResultsView
        inputs={inputs as ProjectInputs}
        results={results}
        isModerador={isModerador}
        onEdit={() => { setResults(null); setStep(1) }}
      />
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Steps bar */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: step === s.id ? 'var(--uisa-orange)' :
                              step > s.id  ? 'rgba(240,112,34,0.20)' :
                                             'var(--bg-hover)',
                  color: step === s.id ? '#fff' :
                         step > s.id  ? 'var(--uisa-orange)' :
                                        'var(--text-muted)',
                }}
              >
                {step > s.id ? '✓' : s.id}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: step === s.id ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-8 h-px mx-3"
                style={{ background: step > s.id ? 'rgba(240,112,34,0.4)' : 'var(--border)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div
        className="rounded-2xl p-8"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {step === 1 && <StepConfig inputs={inputs} onChange={merge} isModerador={isModerador} />}
        {step === 2 && <StepCapex  inputs={inputs} onChange={merge} />}
        {step === 3 && <StepReceita inputs={inputs} onChange={merge} produtos={produtos} isModerador={isModerador} />}
        {step === 4 && <StepOpex    inputs={inputs} onChange={merge} />}
        {step === 5 && <StepRH      inputs={inputs} onChange={merge} />}
        {step === 6 && <StepRevisao inputs={inputs} premissas={premissas} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-30"
        >
          ← Anterior
        </button>

        {step < 6 ? (
          <button
            onClick={() => setStep(s => Math.min(6, s + 1))}
            className="btn-primary"
          >
            Próximo →
          </button>
        ) : canCalculate ? (
          /* ── Usuário pode calcular ── */
          <button
            onClick={handleCalculate}
            disabled={saving || !inputs.nome || !inputs.capex}
            className="btn-primary disabled:opacity-50 disabled:transform-none"
          >
            {saving ? 'Calculando...' : '⚡ Calcular Viabilidade'}
          </button>
        ) : (
          /* ── Usuário sem permissão de calcular: salva rascunho ── */
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={async () => {
                setSaving(true)
                try {
                  const method = savedId ? 'PUT' : 'POST'
                  const url    = savedId ? `/api/projects/${savedId}` : '/api/projects'
                  const res    = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inputs }),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error)
                  setSavedId(savedId ?? data.projectId)
                  alert('Dados salvos com sucesso! Um Moderador ou Administrador irá realizar a análise.')
                } catch (e) {
                  alert('Erro ao salvar: ' + (e as Error).message)
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving || !inputs.nome || !inputs.capex}
              className="btn-primary disabled:opacity-50 disabled:transform-none"
            >
              {saving ? 'Salvando...' : '💾 Salvar Estudo'}
            </button>
            <div
              className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(240,112,34,0.08)',
                border: '1px solid rgba(240,112,34,0.20)',
                color: 'var(--uisa-orange)',
              }}
            >
              <span>🔒</span>
              <span>
                A análise final deve ser executada por um <strong>Moderador</strong> ou <strong>Administrador</strong>.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
