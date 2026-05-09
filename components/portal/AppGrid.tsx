'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Lock, ArrowRight } from 'lucide-react'
import type { AppRole } from '@/lib/permissions'

interface AppWithStatus {
  id: string
  slug: string
  nome: string
  descricao: string | null
  icone: string
  urlBase: string
  hasAccess: boolean
  appRole: AppRole | null
}

const ROLE_LABELS: Record<AppRole, { label: string; bg: string; color: string }> = {
  VISUALIZADOR: { label: 'Visualizador', bg: 'rgba(158,158,158,0.15)', color: 'var(--text-muted)' },
  ANALISTA:     { label: 'Analista',     bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA' },
  MODERADOR:    { label: 'Moderador',    bg: 'rgba(0,121,96,0.15)',    color: 'var(--uisa-green)' },
  ADMIN_APP:    { label: 'Admin',        bg: 'rgba(245,196,0,0.15)',   color: 'var(--uisa-yellow)' },
}

/* Metadados visuais por slug do ícone — adicionais apps aqui */
const APP_VISUAL: Record<string, {
  image:        string
  gradient:     string
  gradientDark: string
  accent:       string
  category:     string
}> = {
  'trending-up': {
    image:        '/app-icons/trending-up.png',
    gradient:     'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 60%, #FED7AA 100%)',
    gradientDark: 'linear-gradient(135deg, #1C1308 0%, #2D1B06 60%, #3D2510 100%)',
    accent:       '#F07022',
    category:     'Finanças & Estratégia',
  },
  'bar-chart-3': {
    image:        '/app-icons/bar-chart-3.png',
    gradient:     'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 60%, #BFDBFE 100%)',
    gradientDark: 'linear-gradient(135deg, #0C1526 0%, #0F1E38 60%, #142447 100%)',
    accent:       '#3B82F6',
    category:     'Analytics & Dados',
  },
  'target': {
    image:        '/app-icons/target.png',
    gradient:     'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 60%, #FDE68A 100%)',
    gradientDark: 'linear-gradient(135deg, #1A1500 0%, #261D00 60%, #332600 100%)',
    accent:       '#F5C400',
    category:     'Metas & Performance',
  },
  'layout-grid': {
    image:        '/app-icons/layout-grid.png',
    gradient:     'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 60%, #BBF7D0 100%)',
    gradientDark: 'linear-gradient(135deg, #061210 0%, #0A1E1A 60%, #0E2920 100%)',
    accent:       '#007960',
    category:     'Plataforma',
  },
}

const DEFAULT_VISUAL = APP_VISUAL['layout-grid']

export function AppGrid({ apps }: { apps: AppWithStatus[] }) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
        <div className="w-20 h-20 mx-auto mb-4 opacity-30 relative">
          <Image src="/app-icons/layout-grid.png" alt="" fill style={{ objectFit: 'contain' }} />
        </div>
        <p className="font-medium">Nenhum aplicativo disponível.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Apps com acesso */}
      {apps.filter(a => a.hasAccess).length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Meus Aplicativos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {apps.filter(a => a.hasAccess).map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}

      {/* Apps bloqueados */}
      {apps.filter(a => !a.hasAccess).length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Disponíveis — Solicitar Acesso
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {apps.filter(a => !a.hasAccess).map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AppCard({ app }: { app: AppWithStatus }) {
  const roleInfo = app.appRole ? ROLE_LABELS[app.appRole] : null
  const visual   = APP_VISUAL[app.icone] ?? DEFAULT_VISUAL

  const card = (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        border:    '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        opacity:   app.hasAccess ? 1 : 0.55,
        cursor:    app.hasAccess ? 'pointer' : 'default',
      }}
    >
      {/* ── Banner com imagem 3D ── */}
      <div className="relative h-40 flex items-center justify-center overflow-hidden">
        {/* Gradiente de fundo: light vs dark */}
        <div
          className="absolute inset-0"
          style={{ background: visual.gradient }}
        />
        <div
          className="absolute inset-0 opacity-0 dark:opacity-100"
          style={{ background: visual.gradientDark }}
        />

        {/* Imagem 3D */}
        <div className="relative z-10 w-28 h-28">
          <Image
            src={visual.image}
            alt={app.nome}
            fill
            style={{
              objectFit: 'contain',
              filter: app.hasAccess
                ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.20))'
                : 'grayscale(80%) opacity(0.6)',
            }}
            className="transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Cadeado — bloqueado */}
        {!app.hasAccess && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Lock className="w-4 h-4 text-white/70" />
          </div>
        )}

        {/* Badge de role */}
        {app.hasAccess && roleInfo && (
          <div className="absolute top-3 right-3">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{
                background: roleInfo.bg,
                color:      roleInfo.color,
                border:     `1px solid ${roleInfo.color}40`,
              }}
            >
              {roleInfo.label}
            </span>
          </div>
        )}

        {/* Categoria */}
        <div className="absolute bottom-3 left-3">
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md"
            style={{
              background: 'rgba(0,0,0,0.28)',
              color:      'rgba(255,255,255,0.90)',
            }}
          >
            {visual.category}
          </span>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="p-5" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-sm font-bold mb-1.5 leading-snug" style={{ color: 'var(--text-primary)' }}>
          {app.nome}
        </h3>
        {app.descricao && (
          <p
            className="text-xs leading-relaxed mb-4"
            style={{
              color:           'var(--text-secondary)',
              display:         '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow:        'hidden',
            }}
          >
            {app.descricao}
          </p>
        )}

        {app.hasAccess ? (
          <div
            className="flex items-center gap-2 text-xs font-bold transition-all duration-200 group-hover:gap-3"
            style={{ color: visual.accent }}
          >
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            Abrir aplicativo
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Solicite acesso ao administrador.
          </p>
        )}
      </div>

      {/* Linha de acento na base ao hover */}
      {app.hasAccess && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, transparent, ${visual.accent}, transparent)` }}
        />
      )}
    </div>
  )

  return app.hasAccess
    ? <Link href={app.urlBase} className="block group">{card}</Link>
    : card
}
