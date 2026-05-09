import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title:       'UISA — Plataforma Interna',
  description: 'Portal de Aplicativos Internos UISA Bioenergia + Açúcar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${roboto.variable} font-sans bg-[var(--bg-base)] text-[var(--text-primary)] min-h-screen transition-colors duration-200`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
