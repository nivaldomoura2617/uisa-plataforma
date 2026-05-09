# Autenticação e Autorização — UISA Plataforma

## Índice
- [Visão Geral](#visão-geral)
- [Fluxo de Autenticação (Magic Link)](#fluxo-de-autenticação-magic-link)
- [Middleware — Proteção de Rotas](#middleware--proteção-de-rotas)
- [Sessão e JWT](#sessão-e-jwt)
- [Dois Níveis de Autorização](#dois-níveis-de-autorização)
- [Matriz de Permissões por App](#matriz-de-permissões-por-app)
- [Como Verificar Permissão no Código](#como-verificar-permissão-no-código)
- [Usuários Seed (Dev)](#usuários-seed-dev)

---

## Visão Geral

A plataforma usa **NextAuth.js v4** com a estratégia **Email (Magic Link)** — sem senha. O usuário recebe um link por e-mail (ou no terminal, em dev) e é autenticado com JWT.

```
Browser → Login Page → API /api/auth/signin → Email enviado
    ↓
Usuário clica no link
    ↓
/api/auth/callback/email → JWT criado → Cookie de sessão
    ↓
Middleware verifica JWT → Portal liberado
```

---

## Fluxo de Autenticação (Magic Link)

### Passo a passo

1. Usuário acessa qualquer rota protegida → redirecionado para `/login`
2. Digita e-mail com domínio `@uisa.com.br`
3. NextAuth verifica o domínio (`lib/auth.ts > sendVerificationRequest`)
4. **Desenvolvimento**: o link é exibido no terminal (sem enviar e-mail)
5. **Produção**: e-mail HTML enviado via SMTP (Nodemailer)
6. Usuário clica no link → callback valida o token
7. `signIn()` callback verifica:
   - Domínio autorizado (`ALLOWED_EMAIL_DOMAIN`)
   - Usuário está ativo no banco (`isActive = true`)
8. JWT criado com: `userId`, `globalRole`, `name`
9. Cookie de sessão definido no browser

### Arquivo chave

```
lib/auth.ts — authOptions (NextAuth config)
```

### Validade do Link

- O token de verificação expira em **24 horas** (padrão NextAuth)
- Após uso, o token é invalidado imediatamente

---

## Middleware — Proteção de Rotas

**Arquivo:** `middleware.ts`

```
Todas as rotas → middleware executado
    ↓
/login ou /api/auth/* → Passe direto (público)
    ↓
Sem token JWT → Redireciona para /login
    ↓
Domínio inválido → Redireciona para /login?error=domain
    ↓
Token válido + domínio OK → Passe (acesso ao portal)
```

**Matcher:** exclui assets estáticos (`_next/static`, `_next/image`, `favicon`, imagens PNG).

> ⚠️ O middleware **não verifica acesso a apps específicos** — apenas autenticação. A autorização por app é feita nos **Server Components** de cada rota.

---

## Sessão e JWT

### Campos do token JWT

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | string | ID do usuário no banco (CUID) |
| `globalRole` | `"USER"` \| `"ADMIN"` | Nível global do usuário |
| `name` | string? | Nome do usuário |
| `email` | string | E-mail |

### Como acessar na sessão (Server Component)

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)
const userId     = (session?.user as any).id
const globalRole = (session?.user as any).globalRole
```

### Como acessar na sessão (Client Component)

```typescript
'use client'
import { useSession } from 'next-auth/react'

const { data: session } = useSession()
const globalRole = (session?.user as any)?.globalRole
```

---

## Dois Níveis de Autorização

### Nível 1 — Acesso Global (`globalRole`)

Definido diretamente no `User.globalRole`:

| Valor | Quem é | O que pode |
|-------|--------|-----------|
| `USER` | Usuário comum | Acessar apenas os apps que tiver permissão |
| `ADMIN` | Administrador global | Acesso a **todos** os apps como `ADMIN_APP`, painel `/admin/usuarios` |

> Admin Global não precisa de entrada em `AppPermission` — o `lib/permissions.ts` retorna `ADMIN_APP` automaticamente.

### Nível 2 — Permissão por App (`AppRole`)

Definido em `AppPermission.appRole` para cada par (usuário, app):

| Valor | Quem é | Capacidades (Viabilidade) |
|-------|--------|--------------------------|
| `VISUALIZADOR` | Leitor | Ver projetos (somente) |
| `ANALISTA` | Analista | Criar, editar e salvar seus projetos |
| `MODERADOR` | Gerente | Ver todos os projetos + **calcular análises** |
| `ADMIN_APP` | Admin do App | Tudo + gerenciar usuários do app + configurações |

---

## Matriz de Permissões por App

**Arquivo:** `lib/permissions.ts`

| Ação | VISUALIZADOR | ANALISTA | MODERADOR | ADMIN_APP |
|------|:---:|:---:|:---:|:---:|
| `VIEW_PROJECTS` | ✅ | ✅ | ✅ | ✅ |
| `CREATE_PROJECT` | ❌ | ✅ | ✅ | ✅ |
| `EDIT_OWN_PROJECT` | ❌ | ✅ | ✅ | ✅ |
| `DELETE_OWN_PROJECT` | ❌ | ✅ | ✅ | ✅ |
| `EXPORT_PROJECT` | ❌ | ✅ | ✅ | ✅ |
| `VIEW_ALL_PROJECTS` | ❌ | ❌ | ✅ | ✅ |
| `EDIT_ANY_PROJECT` | ❌ | ❌ | ✅ | ✅ |
| `DELETE_ANY_PROJECT` | ❌ | ❌ | ✅ | ✅ |
| `EDIT_PREMISES` | ❌ | ❌ | ✅ | ✅ |
| `CALCULATE_PROJECT` | ❌ | ❌ | ✅ | ✅ |
| `ACCESS_ADV_SENSITIVITY` | ❌ | ❌ | ✅ | ✅ |
| `GENERATE_AI_ANALYSIS` | ❌ | ❌ | ✅ | ✅ |
| `MANAGE_APP_USERS` | ❌ | ❌ | ❌ | ✅ |

> **Importante:** `CALCULATE_PROJECT` é verificado em **dois lugares**:
> 1. Frontend — WizardClient oculta o botão "⚡ Calcular Viabilidade"
> 2. Backend — API `/api/projects` e `/api/projects/[id]` não executam `calcularFluxo()` sem essa permissão

---

## Como Verificar Permissão no Código

### Server Component / Route Handler

```typescript
import { getUserAppPermission, canDoAction } from '@/lib/permissions'

// Verificar acesso ao app
const perm = await getUserAppPermission(userId, 'viabilidade-economica')
if (!perm) redirect('/viabilidade') // sem acesso ao app

// Verificar ação específica
if (!canDoAction(perm.appRole, 'CALCULATE_PROJECT')) {
  // bloquear ação
}

// Helpers rápidos
const isModerador = ['MODERADOR', 'ADMIN_APP'].includes(perm.appRole)
```

### Client Component (recebe prop do Server)

```typescript
// Server Component passa como prop:
<WizardClient canCalculate={canDoAction(perm.appRole, 'CALCULATE_PROJECT')} />

// Client Component usa a prop:
{canCalculate ? <button>Calcular</button> : <span>🔒 Somente Moderadores</span>}
```

---

## Usuários Seed (Dev)

Criados automaticamente com `npm run db:seed`:

| E-mail | Role Global | Acesso Viabilidade |
|--------|------------|-------------------|
| `admin@uisa.com.br` | `ADMIN` | `ADMIN_APP` (automático) |
| `moderador@uisa.com.br` | `USER` | `MODERADOR` |
| `analista@uisa.com.br` | `USER` | `ANALISTA` |
| `visualizador@uisa.com.br` | `USER` | `VISUALIZADOR` |

> Para fazer login com qualquer um deles: use o e-mail na tela de login e copie o magic link do terminal.
