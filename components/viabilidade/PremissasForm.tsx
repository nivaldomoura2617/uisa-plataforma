'use client'
import { useState } from 'react'
import { Save, Check } from 'lucide-react'

interface Premissa { id: string; key: string; value: number; unit: string | null; descricao: string | null }
interface Produto  { id: string; nome: string; preco: number; margem: number; unidade: string }

export function PremissasForm({ premissas, produtos }: { premissas: Premissa[]; produtos: Produto[] }) {
  const [premissaValues, setPremissaValues] = useState<Record<string, number>>(
    Object.fromEntries(premissas.map(p => [p.key, p.value]))
  )
  const [productValues, setProductValues] = useState<Record<string, { preco: number; margem: number }>>(
    Object.fromEntries(produtos.map(p => [p.nome, { preco: p.preco, margem: p.margem }]))
  )
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/admin/premissas', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ premissas: premissaValues, produtos: productValues }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  // Filtrar apenas premissas editáveis na UI
  const editaveisFinanceiras = ['TMA_PADRAO', 'IRPJ_CSLL', 'ANO_IRPJ']

  return (
    <div className="space-y-6">
      {/* Premissas Financeiras */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">Parâmetros Financeiros</h2>
        <div className="grid grid-cols-3 gap-4">
          {premissas.filter(p => editaveisFinanceiras.includes(p.key)).map(p => (
            <div key={p.key}>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {p.descricao ?? p.key} {p.unit && <span className="text-slate-600">({p.unit})</span>}
              </label>
              <input
                type="number"
                step={0.1}
                value={premissaValues[p.key]}
                onChange={e => setPremissaValues(v => ({ ...v, [p.key]: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-uisa-green"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Produtos */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-bold text-white mb-1">Preços e Margens — Produtos UISA</h2>
        <p className="text-xs text-slate-500 mb-4">2T 25/26 — atualizar quando houver nova safra de preços.</p>
        <div className="space-y-2">
          {produtos.map(p => (
            <div key={p.nome} className="grid grid-cols-12 gap-3 items-center bg-slate-800/40 rounded-lg p-3">
              <span className="col-span-4 text-sm text-slate-200 font-semibold">{p.nome}</span>
              <span className="col-span-2 text-xs text-slate-500">({p.unidade})</span>
              <div className="col-span-3">
                <label className="block text-[9px] text-slate-600 mb-1 uppercase tracking-wider">Preço (R$)</label>
                <input type="number" step={0.01}
                  value={productValues[p.nome]?.preco}
                  onChange={e => setProductValues(v => ({ ...v, [p.nome]: { ...v[p.nome], preco: parseFloat(e.target.value)||0 } }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-uisa-green" />
              </div>
              <div className="col-span-3">
                <label className="block text-[9px] text-slate-600 mb-1 uppercase tracking-wider">Margem (%)</label>
                <input type="number" step={0.1}
                  value={productValues[p.nome]?.margem}
                  onChange={e => setProductValues(v => ({ ...v, [p.nome]: { ...v[p.nome], margem: parseFloat(e.target.value)||0 } }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-uisa-green" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-500">Alterações se aplicam apenas a novos projetos.</p>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-uisa-green hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
          {saved ? <><Check className="w-4 h-4"/> Salvo!</> : <><Save className="w-4 h-4"/> {saving ? 'Salvando...' : 'Salvar Alterações'}</>}
        </button>
      </div>
    </div>
  )
}
