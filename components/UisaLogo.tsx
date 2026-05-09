'use client'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon'
  className?: string
}

const sizes = {
  sm:  { icon: 28, text: 18, sub: 8 },
  md:  { icon: 36, text: 22, sub: 9 },
  lg:  { icon: 48, text: 30, sub: 10 },
  xl:  { icon: 72, text: 46, sub: 12 },
}

export function UisaLogo({ size = 'md', variant = 'full', className = '' }: Props) {
  const s = sizes[size]

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Triângulo SVG com degradê */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="uisa-tri-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#C0392B" />
            <stop offset="50%"  stopColor="#F07022" />
            <stop offset="100%" stopColor="#F5C400" />
          </linearGradient>
        </defs>
        {/* Triângulo arredondado externo */}
        <path
          d="M50 5 C48 5 46 6 45 8 L8 72 C6 75 6 78 8 81 C10 84 13 86 17 86 L83 86 C87 86 90 84 92 81 C94 78 94 75 92 72 L55 8 C54 6 52 5 50 5 Z"
          fill="url(#uisa-tri-grad)"
        />
        {/* Triângulo interno recortado (efeito anel) */}
        <path
          d="M50 28 C49 28 48 29 47.5 30 L26 67 C25.5 68 25.5 69.5 26 70.5 C26.5 71.5 27.5 72 28.5 72 L71.5 72 C72.5 72 73.5 71.5 74 70.5 C74.5 69.5 74.5 68 74 67 L52.5 30 C52 29 51 28 50 28 Z"
          fill="white"
          className="dark:fill-[#0F1117]"
          style={{ fill: 'var(--logo-inner, white)' }}
        />
      </svg>

      {/* Texto UISA */}
      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span
            className="font-black tracking-tight text-[#4A4A4A] dark:text-white"
            style={{ fontSize: s.text }}
          >
            UISA
          </span>
          {size !== 'sm' && (
            <span
              className="font-semibold tracking-widest uppercase text-[#9E9E9E] dark:text-slate-400"
              style={{ fontSize: s.sub, letterSpacing: '0.15em' }}
            >
              Bioenergia + Açúcar
            </span>
          )}
        </div>
      )}
    </div>
  )
}
