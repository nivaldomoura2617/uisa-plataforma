'use client'
import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { UisaLogo } from '@/components/UisaLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

const DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? 'uisa.com.br'

function LoginForm() {
  const params   = useSearchParams()
  const error    = params.get('error')

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [err,     setErr]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!email.endsWith(`@${DOMAIN}`)) {
      setErr(`Apenas e-mails @${DOMAIN} são autorizados.`)
      return
    }
    setLoading(true)
    const res = await signIn('email', { email, redirect: false, callbackUrl: '/' })
    setLoading(false)
    if (res?.error) setErr('Erro ao enviar o link. Tente novamente.')
    else setSent(true)
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Toggle theme — canto superior direito */}
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      {/* Decoração de fundo */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ background: 'linear-gradient(90deg, #C0392B 0%, #F07022 50%, #F5C400 100%)' }}
      />
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F07022, transparent)' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F5C400, transparent)' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <UisaLogo size="lg" variant="full" />
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {sent ? (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(0,121,96,0.15)' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--uisa-green)' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Link enviado!
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Verifique sua caixa de entrada em{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                Clique no link para acessar a plataforma.
              </p>
              <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                O link expira em 24 horas.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Acessar Plataforma
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Informe seu e-mail corporativo para receber o link de acesso.
              </p>

              {(error || err) && (
                <div
                  className="rounded-lg p-3 mb-4 text-sm"
                  style={{
                    background: 'rgba(192,57,43,0.10)',
                    border: '1px solid rgba(192,57,43,0.25)',
                    color: 'var(--uisa-red)',
                  }}
                >
                  {err || (error === 'domain'
                    ? `Acesso restrito a @${DOMAIN}`
                    : 'Erro de autenticação. Tente novamente.'
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    E-mail corporativo
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={`nome@${DOMAIN}`}
                      required
                      className="w-full rounded-lg pl-10 pr-4 py-3 text-sm transition-colors"
                      style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Enviar link de acesso
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </form>

              <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
                Somente e-mails @{DOMAIN} são autorizados.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg-base)' }} />}>
      <LoginForm />
    </Suspense>
  )
}
