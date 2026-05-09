import type { NextAuthOptions, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import { logger, maskEmail } from '@/lib/logger'
import { createTransport } from 'nodemailer'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'uisa.com.br'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,

  providers: [
    EmailProvider({
      server: {
        host:   process.env.EMAIL_SERVER_HOST,
        port:   Number(process.env.EMAIL_SERVER_PORT ?? 587),
        secure: process.env.EMAIL_SERVER_PORT === '465',
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASS,
        },
      },
      from: process.env.EMAIL_FROM ?? `noreply@${ALLOWED_DOMAIN}`,

      async sendVerificationRequest({ identifier: email, url, provider }) {
        const domain = email.split('@')[1]
        if (domain !== ALLOWED_DOMAIN) {
          throw new Error(`Domínio não autorizado: @${domain}`)
        }

        console.log('\n\n=============================================')
        console.log('🚀 MAGIC LINK PARA LOGIN LOCAL:')
        console.log(url)
        console.log('=============================================\n\n')

        // Bypass para desenvolvimento local sem SMTP
        if (process.env.NODE_ENV !== 'production' || process.env.DATABASE_URL?.startsWith('file:')) {
          return
        }

        const transport = createTransport(provider.server)
        await transport.sendMail({
          to:      email,
          from:    provider.from,
          subject: 'Acesso à Plataforma UISA',
          html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <div style="background:#07140a;padding:24px;border-radius:12px;margin-bottom:24px">
                <span style="font-size:28px;font-weight:800;color:#fff">UISA</span>
                <span style="font-size:28px;font-weight:800;color:#FFCF01">.</span>
              </div>
              <h2 style="color:#111916;margin:0 0 8px">Acesse a Plataforma</h2>
              <p style="color:#596760;margin:0 0 24px">
                Clique no botão abaixo para entrar. O link expira em <strong>24 horas</strong>.
              </p>
              <a href="${url}" style="display:inline-block;background:#007960;color:#fff;padding:14px 32px;border-radius:10px;font-weight:600;text-decoration:none;font-size:15px">
                Acessar Plataforma
              </a>
              <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">
                Se você não solicitou este acesso, ignore este e-mail.<br>
                Link alternativo: <a href="${url}" style="color:#007960">${url}</a>
              </p>
            </div>
          `,
        })
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    // Bloqueia usuários inativos ou fora do domínio
    async signIn({ user }) {
      if (!user.email) return false
      const domain = user.email.split('@')[1]
      if (domain !== ALLOWED_DOMAIN) {
        logger.warn('Login bloqueado — domínio não autorizado', {
          route: '/api/auth/signin',
          error: `Domínio @${domain} não autorizado`,
        })
        return false
      }

      // Verifica se usuário está ativo no banco
      const dbUser = await db.user.findUnique({ where: { email: user.email } })
      if (dbUser && !dbUser.isActive) {
        logger.warn('Login bloqueado — usuário inativo', {
          route:  '/api/auth/signin',
          userId: dbUser.id,
        })
        return false
      }

      // Atualiza lastLoginAt
      if (dbUser) {
        await db.user.update({
          where: { id: dbUser.id },
          data:  { lastLoginAt: new Date() },
        })
        logger.info('Login bem-sucedido', {
          route:      '/api/auth/signin',
          userId:     dbUser.id,
          globalRole: dbUser.globalRole,
        })
      } else {
        logger.info('Novo usuário logado pela primeira vez', {
          route: '/api/auth/signin',
        })
      }
      return true
    },

    // Inclui globalRole na sessão JWT
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({
          where:  { email: user.email },
          select: { id: true, globalRole: true, name: true },
        })
        if (dbUser) {
          token.userId     = dbUser.id
          token.globalRole = dbUser.globalRole
          token.name       = dbUser.name
        }
      }
      return token
    },

    // Expõe globalRole e userId na sessão do cliente
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as any).id         = token.userId
        ;(session.user as any).globalRole = token.globalRole
      }
      return session
    },
  },

  pages: {
    signIn:   '/login',
    error:    '/login',
    verifyRequest: '/login?verify=1',
  },
}
