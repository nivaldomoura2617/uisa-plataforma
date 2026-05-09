'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evita hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="
        flex items-center justify-center w-8 h-8 rounded-lg
        bg-slate-100 hover:bg-slate-200 text-slate-600
        dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300
        transition-all duration-200
      "
    >
      {isDark
        ? <Sun  className="w-4 h-4 text-uisa-yellow" />
        : <Moon className="w-4 h-4 text-uisa-gray-dark" />
      }
    </button>
  )
}
