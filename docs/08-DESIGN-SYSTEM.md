# Design System — Identidade Visual UISA

## Índice
- [Paleta de Cores](#paleta-de-cores)
- [Tipografia](#tipografia)
- [CSS Variables (Tokens)](#css-variables-tokens)
- [Dark Mode](#dark-mode)
- [Componentes Utilitários](#componentes-utilitários)
- [Logo UISA](#logo-uisa)
- [Ícones](#ícones)
- [Como Estilizar Novos Componentes](#como-estilizar-novos-componentes)

---

## Paleta de Cores

### Brand Colors UISA

| Token | Valor | Uso |
|-------|-------|-----|
| `--uisa-orange` | `#F07022` | Ação principal, CTAs, sidebar ativo, hover |
| `--uisa-yellow` | `#F5C400` | Badge Admin, ícone de alerta, Sol do toggle |
| `--uisa-green`  | `#007960` | Status viável, badge Moderador, confirmações |
| `--uisa-red`    | `#C0392B` | Status inviável, erros, alertas críticos |
| `--uisa-gray-dark` | `#4A4A4A` | Texto principal (light) |
| `--uisa-gray`   | `#9E9E9E` | Texto secundário, placeholders |

### Cores de Interface (tema-sensíveis)

Essas cores mudam automaticamente com o tema dark/light via CSS Variables.

---

## Tipografia

**Fonte:** [Roboto](https://fonts.google.com/specimen/Roboto) — Google Fonts

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');
```

| Weight | Classe Tailwind | Uso |
|--------|----------------|-----|
| 300 (Light) | `font-light` | Subtítulos secundários |
| 400 (Regular) | `font-normal` | Corpo de texto |
| 500 (Medium) | `font-medium` | Labels, nav items |
| 700 (Bold) | `font-bold` | Títulos, botões |
| 900 (Black) | `font-black` | Números grandes, KPIs |

---

## CSS Variables (Tokens)

Definidas em `app/globals.css`. **Sempre use variáveis em vez de cores hardcoded.**

### Light Mode (`:root`)

```css
--bg-base:        #F0F2F5;   /* fundo da página */
--bg-surface:     #FFFFFF;   /* cards, modais, formulários */
--bg-sidebar:     #FFFFFF;   /* sidebar */
--bg-card:        #FFFFFF;   /* cards de app */
--bg-hover:       #F5F5F5;   /* hover de elementos */
--border:         #E5E7EB;   /* bordas padrão */
--border-strong:  #D1D5DB;   /* bordas de destaque */
--text-primary:   #1A1A1A;   /* texto principal */
--text-secondary: #4A4A4A;   /* texto secundário */
--text-muted:     #9E9E9E;   /* texto auxiliar, labels */
--text-inverse:   #FFFFFF;   /* texto em fundo escuro */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.10);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
```

### Dark Mode (`.dark`)

```css
--bg-base:        #0F1117;
--bg-surface:     #1A1D27;
--bg-sidebar:     #13161F;
--bg-card:        #1E2130;
--bg-hover:       #252839;
--border:         #2A2D3A;
--border-strong:  #363A4E;
--text-primary:   #F0F0F5;
--text-secondary: #B0B3C1;
--text-muted:     #6B7280;
```

---

## Dark Mode

O Dark Mode é gerenciado pelo `next-themes` com a estratégia `class`:

- A classe `.dark` é adicionada ao `<html>` quando o tema escuro está ativo
- A preferência é salva automaticamente no `localStorage`
- O padrão é **dark** (configurado em `app/providers.tsx`)

### Como acessar o tema em Client Components

```typescript
'use client'
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()
```

### Regra de ouro

> **NUNCA use cores hardcoded** em componentes. Sempre use `var(--variavel)` ou as classes do Tailwind mapeadas no `tailwind.config.ts`.

```tsx
// ❌ Errado — quebra o dark mode
<div style={{ background: '#1A1D27' }}>

// ✅ Correto
<div style={{ background: 'var(--bg-surface)' }}>
```

---

## Componentes Utilitários

Definidos em `app/globals.css` como `@layer components`:

### Inputs

```css
.field-label   /* label uppercase tracking */
.field-input   /* input estilizado com focus laranja */
```

**Uso:**
```tsx
<label className="field-label">Nome do Projeto</label>
<input className="field-input" placeholder="Digite aqui..." />
```

### Botões

```css
.btn-primary   /* fundo laranja UISA, hover com sombra */
.btn-secondary /* fundo neutro, borda, hover sutil */
```

**Uso:**
```tsx
<button className="btn-primary">Salvar</button>
<button className="btn-secondary">Cancelar</button>
```

### Cards

```css
.uisa-card   /* card com border + shadow + hover */
.stat-card   /* card de estatística com hover translateY */
```

### Sidebar

```css
.sidebar          /* container lateral */
.sidebar-link     /* item de navegação */
.sidebar-link.active  /* item ativo (laranja UISA) */
```

---

## Logo UISA

**Componente:** `components/UisaLogo.tsx`

### Uso

```tsx
import { UisaLogo } from '@/components/UisaLogo'

// Variante completa (triângulo + texto)
<UisaLogo size="sm" variant="full" />

// Apenas triângulo
<UisaLogo size="md" variant="icon" />
```

### Props

| Prop | Opções | Padrão | Descrição |
|------|--------|--------|-----------|
| `size` | `"sm"` \| `"md"` \| `"lg"` | `"md"` | Tamanho do logo |
| `variant` | `"full"` \| `"icon"` | `"full"` | Com ou sem texto |

### Estrutura Visual

O triângulo usa um degradê SVG:
- Esquerda: `#C0392B` (Vermelho UISA)
- Centro: `#F07022` (Laranja UISA)  
- Direita: `#F5C400` (Amarelo UISA)

O interior do triângulo usa `var(--logo-inner)` — branco no light, escuro no dark.

---

## Ícones

**Biblioteca:** [Lucide React](https://lucide.dev/)

```tsx
import { TrendingUp, Shield, Users, Lock } from 'lucide-react'

<TrendingUp className="w-5 h-5" style={{ color: 'var(--uisa-orange)' }} />
```

### Ícones de App (cards do portal)

Imagens PNG 3D em `public/app-icons/`. Mapeadas em `components/portal/AppGrid.tsx > APP_VISUAL`.

| Arquivo | Representa |
|---------|-----------|
| `trending-up.png` | Finanças, Viabilidade |
| `bar-chart-3.png` | Analytics, Dados |
| `target.png` | Metas, Performance |
| `layout-grid.png` | Plataforma, Grid (padrão) |

---

## Como Estilizar Novos Componentes

### Checklist de estilização

1. **Use sempre variáveis CSS** para cores de fundo, texto e bordas
2. **Use classes utilitárias** (`btn-primary`, `field-input`, etc.) para consistência
3. **Teste no dark mode** — ative o toggle e verifique o componente
4. **Hover e transições** — use `transition-all duration-200` para micro-animações
5. **Bordas arredondadas** — padrão: `rounded-xl` (cards), `rounded-lg` (inputs/botões)

### Template de card novo

```tsx
<div
  className="rounded-xl p-5 transition-all duration-200"
  style={{
    background:  'var(--bg-card)',
    border:      '1px solid var(--border)',
    boxShadow:   'var(--shadow-sm)',
  }}
  onMouseEnter={e => {
    const el = e.currentTarget as HTMLElement
    el.style.boxShadow = 'var(--shadow-md)'
    el.style.borderColor = 'rgba(240,112,34,0.35)'
  }}
  onMouseLeave={e => {
    const el = e.currentTarget as HTMLElement
    el.style.boxShadow = 'var(--shadow-sm)'
    el.style.borderColor = 'var(--border)'
  }}
>
  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
    Título
  </h3>
  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
    Descrição
  </p>
</div>
```

### Template de badge de status

```tsx
// Viável (verde)
<span style={{ background: 'rgba(0,121,96,0.12)', color: 'var(--uisa-green)' }}
  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
  Viável
</span>

// Inviável (vermelho)
<span style={{ background: 'rgba(192,57,43,0.12)', color: 'var(--uisa-red)' }}
  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
  Inviável
</span>
```
