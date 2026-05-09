'use client'
import Link from 'next/link'
import { useState } from 'react'
import { TrendingUp, TrendingDown, Clock, Edit2, Trash2, BarChart3 } from 'lucide-react'
import type { AppRole } from '@/lib/permissions'

interface Props {
  project: any
  appRole: AppRole
  userId:  string
}

export function ProjectCard({ project, appRole, userId }: Props) {
  const [deleting, setDeleting] = useState(false)
  const version = project.versions[0]
  const rawResults = version?.results
  const results = rawResults
    ? (typeof rawResults === 'string' ? (() => { try { return JSON.parse(rawResults) } catch { return null } })() : rawResults)
    : null
  const vpl     = results?.vpl
  const tir     = results?.tir ? (results.tir * 100).toFixed(1) : null
  const payback = results?.payback ? results.payback.toFixed(2) : null
  const viable  = vpl !== undefined && vpl !== null && vpl > 0

  const isOwner    = project.ownerId === userId
  const canEdit    = isOwner || ['MODERADOR','ADMIN_APP'].includes(appRole)
  const canDelete  = isOwner || ['MODERADOR','ADMIN_APP'].includes(appRole)

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

  async function handleDelete() {
    if (!confirm('Excluir este projeto permanentemente?')) return
    setDeleting(true)
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors relative overflow-hidden">
      {/* Status bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
        !results ? 'bg-slate-700' : viable ? 'bg-emerald-500' : 'bg-red-500'
      }`} />

      <div className="flex items-start justify-between pl-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-white text-sm truncate">{project.name}</h3>
            {results && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                viable
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {viable ? 'Viável' : 'Inviável'}
              </span>
            )}
            {!results && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                Rascunho
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {project.department && `${project.department} · `}
            {project.responsible && `${project.responsible} · `}
            {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* KPIs */}
        {results && (
          <div className="flex gap-6 mx-6">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">VPL</p>
              <p className={`text-sm font-bold font-mono ${viable ? 'text-emerald-400' : 'text-red-400'}`}>
                {vpl !== null ? (vpl >= 0 ? '' : '') + fmtBRL(vpl) : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">TIR</p>
              <p className="text-sm font-bold font-mono text-slate-200">{tir ? `${tir}%` : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Payback</p>
              <p className="text-sm font-bold font-mono text-slate-200">{payback ? `${payback}a` : '—'}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {results && (
            <Link
              href={`/viabilidade/${project.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-uisa-green/10 text-uisa-green hover:bg-uisa-green/20 text-xs font-semibold transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Ver análise
            </Link>
          )}
          {canEdit && (
            <Link
              href={`/viabilidade/${project.id}/editar`}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
