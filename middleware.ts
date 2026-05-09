import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas (sem autenticação)
const PUBLIC_PATHS = ['/login', '/api/auth']

// Mapeamento slug → prefixo de rota
const APP_ROUTE_MAP: Record<string, string> = {
  'viabilidade-economica': '/viabilidade',
  // Adicionar novos apps aqui conforme desenvolvidos
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const token = (req as any).nextauth?.token

    // Rotas públicas: passa direto
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    // Sem token: redireciona para login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Domínio não autorizado
    const email = token.email as string
    const domain = email?.split('@')[1]
    if (domain !== (process.env.ALLOWED_EMAIL_DOMAIN ?? 'uisa.com.br')) {
      return NextResponse.redirect(new URL('/login?error=domain', req.url))
    }

    // Portal e admin: requer estar autenticado (RBAC feito nos Server Components)
    if (pathname === '/' || pathname.startsWith('/admin')) {
      return NextResponse.next()
    }

    // Apps: verificar acesso via app_permissions
    // A verificação detalhada fica no layout de cada app (Server Component)
    // O middleware apenas garante que o usuário está autenticado
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl
        if (['/login', '/api/auth'].some(p => pathname.startsWith(p))) {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
