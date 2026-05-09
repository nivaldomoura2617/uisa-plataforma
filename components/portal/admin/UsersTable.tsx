'use client'
import { useState, useTransition } from 'react'
import {
  Shield, User, ChevronDown, Check, X,
  AlertCircle, UserPlus, Search, RefreshCw,
} from 'lucide-react'

type AppRole = 'VISUALIZADOR' | 'ANALISTA' | 'MODERADOR' | 'ADMIN_APP'

interface AppItem {
  id: string
  nome: string
  slug: string
  rolesDisponiveis: AppRole[]
}

interface UserItem {
  id: string
  email: string
  name: string | null
  globalRole: 'USER' | 'ADMIN'
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  appPermissions: Array<{
    appRole: AppRole
    app: { nome: string; slug: string }
  }>
}

const ROLE_META: Record<AppRole, { label: string; bg: string; color: string; desc: string }> = {
  VISUALIZADOR: {
    label: 'Visualizador',
    bg: 'rgba(158,158,158,0.12)', color: 'var(--text-muted)',
    desc: 'Apenas leitura',
  },
  ANALISTA: {
    label: 'Analista',
    bg: 'rgba(59,130,246,0.12)', color: '#60A5FA',
    desc: 'Criar e editar projetos próprios',
  },
  MODERADOR: {
    label: 'Moderador',
    bg: 'rgba(0,121,96,0.12)', color: 'var(--uisa-green)',
    desc: 'Gerenciar todos os projetos',
  },
  ADMIN_APP: {
    label: 'Admin do App',
    bg: 'rgba(245,196,0,0.12)', color: 'var(--uisa-yellow)',
    desc: 'Acesso total ao aplicativo',
  },
}

// ── Formulário rápido de convidar novo usuário ────────────────
function InviteModal({
  apps,
  onClose,
  onSuccess,
}: {
  apps: AppItem[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail]     = useState('')
  const [name,  setName]      = useState('')
  const [perms, setPerms]     = useState<Record<string, AppRole | ''>>({})
  const [error, setError]     = useState('')
  const [busy,  setBusy]      = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const permissions = Object.entries(perms)
      .filter(([, r]) => r !== '')
      .map(([slug, appRole]) => ({ appSlug: slug, appRole }))

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: name || undefined, permissions }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao convidar'); return }
    onSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Convidar Usuário
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              O usuário poderá acessar a plataforma via magic link
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">E-mail corporativo *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@uisa.com.br"
              required
              className="field-input w-full"
            />
          </div>
          <div>
            <label className="field-label">Nome (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome completo"
              className="field-input w-full"
            />
          </div>

          {apps.length > 0 && (
            <div>
              <label className="field-label">Acessos iniciais (opcional)</label>
              <div className="space-y-2 mt-1">
                {apps.map(app => (
                  <div
                    key={app.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
                  >
                    <span className="flex-1 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {app.nome}
                    </span>
                    <select
                      value={perms[app.slug] ?? ''}
                      onChange={e => setPerms(p => ({ ...p, [app.slug]: e.target.value as AppRole | '' }))}
                      className="text-xs rounded-md px-2 py-1.5 transition-colors"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">— Sem acesso —</option>
                      {app.rolesDisponiveis.map(r => (
                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(192,57,43,0.10)', color: 'var(--uisa-red)' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !email}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:transform-none"
            >
              {busy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Convidar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Linha de permissão por app ────────────────────────────────
function AppPermRow({
  app,
  currentRole,
  userId,
  onRefresh,
}: {
  app: AppItem
  currentRole: AppRole | null
  userId: string
  onRefresh: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function handleChange(role: AppRole | '') {
    setBusy(true)
    if (role === '') {
      await fetch('/api/admin/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, appSlug: app.slug }),
      })
    } else {
      await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, appSlug: app.slug, appRole: role }),
      })
    }
    setBusy(false)
    onRefresh()
  }

  const meta = currentRole ? ROLE_META[currentRole] : null

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl"
      style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Status indicator */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: currentRole ? 'var(--uisa-green)' : 'var(--border)' }}
      />

      {/* App info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {app.nome}
        </p>
        {meta && (
          <p className="text-[10px] mt-0.5" style={{ color: meta.color }}>
            {meta.desc}
          </p>
        )}
      </div>

      {/* Badge atual */}
      {meta && (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
      )}

      {/* Selector */}
      <select
        value={currentRole ?? ''}
        onChange={e => handleChange(e.target.value as AppRole | '')}
        disabled={busy}
        className="text-xs rounded-lg px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          minWidth: '160px',
        }}
      >
        <option value="">— Sem acesso —</option>
        {app.rolesDisponiveis.map(r => (
          <option key={r} value={r}>{ROLE_META[r].label} — {ROLE_META[r].desc}</option>
        ))}
      </select>

      {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function UsersTable({
  users: initialUsers,
  apps,
}: {
  users: UserItem[]
  apps: AppItem[]
}) {
  const [users,     setUsers]     = useState(initialUsers)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [, startTransition]       = useTransition()

  async function refreshUsers() {
    const res  = await fetch('/api/admin/users')
    const data = await res.json()
    startTransition(() => setUsers(data))
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Convidar Usuário
        </button>
      </div>

      {/* ── Legenda de papéis ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {(Object.entries(ROLE_META) as [AppRole, typeof ROLE_META[AppRole]][]).map(([role, meta]) => (
          <div
            key={role}
            className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: meta.bg, border: `1px solid ${meta.color}20` }}
          >
            <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: meta.color }} />
            <div>
              <p className="text-[11px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{meta.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabela ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-12 px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-hover)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="col-span-4">Usuário</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-4">Apps com acesso</div>
          <div className="col-span-1">Último acesso</div>
          <div className="col-span-1" />
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        )}

        {filtered.map(user => {
          const isOpen = expanded === user.id

          return (
            <div
              key={user.id}
              style={{ borderBottom: '1px solid var(--border)' }}
              className="last:border-b-0"
            >
              {/* ── Linha do usuário ── */}
              <button
                onClick={() => setExpanded(isOpen ? null : user.id)}
                className="w-full grid grid-cols-12 px-5 py-4 items-center text-left transition-colors"
                style={{ background: isOpen ? 'var(--bg-hover)' : undefined }}
                onMouseEnter={e => {
                  if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  if (!isOpen) (e.currentTarget as HTMLElement).style.background = ''
                }}
              >
                {/* Avatar + nome */}
                <div className="col-span-4 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{
                      background: user.globalRole === 'ADMIN'
                        ? 'rgba(245,196,0,0.15)'
                        : 'var(--bg-hover)',
                      color: user.globalRole === 'ADMIN'
                        ? 'var(--uisa-yellow)'
                        : 'var(--text-muted)',
                    }}
                  >
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {user.name ?? user.email.split('@')[0]}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Global role */}
                <div className="col-span-2">
                  {user.globalRole === 'ADMIN' ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                      style={{ background: 'rgba(245,196,0,0.12)', color: 'var(--uisa-yellow)' }}
                    >
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Usuário</span>
                  )}
                </div>

                {/* Apps */}
                <div className="col-span-4 flex flex-wrap gap-1.5">
                  {user.appPermissions.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
                      Nenhum app liberado
                    </span>
                  ) : (
                    user.appPermissions.map(p => {
                      const m = ROLE_META[p.appRole]
                      return (
                        <span
                          key={p.app.slug}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: m.bg, color: m.color }}
                        >
                          <Check className="w-2.5 h-2.5" />
                          {p.app.nome.split(' — ')[0].split(' Motor')[0]}
                        </span>
                      )
                    })
                  )}
                </div>

                {/* Data */}
                <div className="col-span-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR')
                    : 'Nunca'}
                </div>

                {/* Toggle */}
                <div className="col-span-1 flex justify-end">
                  <ChevronDown
                    className="w-4 h-4 transition-transform duration-200"
                    style={{
                      color: 'var(--text-muted)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </div>
              </button>

              {/* ── Painel de permissões expandido ── */}
              {isOpen && (
                <div
                  className="px-5 pb-5 pt-4 space-y-3"
                  style={{
                    background: 'var(--bg-surface)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Gerenciar Acessos — {user.name ?? user.email.split('@')[0]}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Alterações são salvas automaticamente
                    </p>
                  </div>

                  {apps.map(app => {
                    const current = user.appPermissions.find(p => p.app.slug === app.slug)?.appRole ?? null
                    return (
                      <AppPermRow
                        key={app.id}
                        app={app}
                        currentRole={current}
                        userId={user.id}
                        onRefresh={refreshUsers}
                      />
                    )
                  })}

                  {apps.length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                      Nenhum aplicativo cadastrado.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modal de convite ── */}
      {showModal && (
        <InviteModal
          apps={apps}
          onClose={() => setShowModal(false)}
          onSuccess={refreshUsers}
        />
      )}
    </>
  )
}
