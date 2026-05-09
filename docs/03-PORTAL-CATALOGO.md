# Catálogo do Portal — Modelo de App

## Índice
- [O que é o Catálogo](#o-que-é-o-catálogo)
- [Como um App é Exibido no Portal](#como-um-app-é-exibido-no-portal)
- [Estrutura do Modelo App](#estrutura-do-modelo-app)
- [Como Registrar um Novo App](#como-registrar-um-novo-app)
- [Ícones 3D dos Apps](#ícones-3d-dos-apps)
- [Apps Ativos Hoje](#apps-ativos-hoje)

---

## O que é o Catálogo

O **Catálogo** é a tabela `App` no banco de dados. Cada app registrado aparece automaticamente no portal (`/`) como um card visual — liberado ou bloqueado dependendo da permissão do usuário logado.

O portal não tem lista hardcoded de apps: tudo vem do banco, tornando o sistema extensível sem alterar código.

---

## Como um App é Exibido no Portal

```
Usuário acessa /
    ↓
Server Component: getAppsWithStatus(userId)
    ↓
Para cada App no banco:
  - verifica se usuário tem AppPermission ativa
  - retorna { ...app, hasAccess: bool, appRole: AppRole | null }
    ↓
AppGrid renderiza os cards:
  - hasAccess = true  → card clicável, badge de papel, botão "Abrir"
  - hasAccess = false → card com cadeado, "Solicite acesso"
```

**Arquivo:** `lib/permissions.ts > getAppsWithStatus()`
**Componente:** `components/portal/AppGrid.tsx`

---

## Estrutura do Modelo App

```prisma
model App {
  slug             String   @unique  // identificador — usado em AppPermission
  nome             String            // nome exibido no card
  descricao        String?           // texto descritivo (2 linhas no card)
  icone            String            // slug do ícone → imagem em public/app-icons/
  urlBase          String            // rota de entrada: ex "/viabilidade"
  ativo            Boolean           // se false, não aparece no portal
  ordem            Int               // posição no grid
  rolesDisponiveis String            // JSON: quais AppRoles são aplicáveis
}
```

### Campo `rolesDisponiveis`

Armazena quais papéis fazem sentido para este app como JSON string:

```json
["VISUALIZADOR", "ANALISTA", "MODERADOR", "ADMIN_APP"]
```

Usado na tela de gerenciamento de usuários para popular o select de papéis.

---

## Como Registrar um Novo App

### Passo 1 — Criar a entrada no banco

**Via seed (recomendado para dev):**

```typescript
// prisma/seed.ts — adicionar ao array de apps
{
  slug:             'nome-do-app',
  nome:             'Nome do App',
  descricao:        'Descrição curta do que o app faz.',
  icone:            'bar-chart-3',     // ver seção de ícones abaixo
  urlBase:          '/nome-do-app',
  ativo:            true,
  ordem:            2,                 // posição no grid (1 = primeiro)
  rolesDisponiveis: JSON.stringify(['ANALISTA', 'MODERADOR', 'ADMIN_APP']),
}
```

**Via SQL direto (produção):**

```sql
INSERT INTO apps (id, slug, nome, descricao, icone, "urlBase", ativo, ordem, "rolesDisponiveis", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'nome-do-app',
  'Nome do App',
  'Descrição curta do app.',
  'bar-chart-3',
  '/nome-do-app',
  true,
  2,
  '["ANALISTA","MODERADOR","ADMIN_APP"]',
  now(),
  now()
);
```

### Passo 2 — Criar o ícone 3D

Salvar a imagem em `public/app-icons/<slug-do-icone>.png`.

Adicionar a entrada em `components/portal/AppGrid.tsx > APP_VISUAL`:

```typescript
'nome-do-app-icone': {
  image:        '/app-icons/nome-do-app-icone.png',
  gradient:     'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
  gradientDark: 'linear-gradient(135deg, #0C1526 0%, #142447 100%)',
  accent:       '#3B82F6',
  category:     'Categoria do App',
},
```

### Passo 3 — Criar as rotas do app

Estrutura recomendada:

```
app/(apps)/nome-do-app/
├── layout.tsx        # verifica permissão, renderiza sidebar
├── page.tsx          # tela principal / lista
├── novo/page.tsx     # criar item
└── [id]/
    ├── page.tsx      # visualizar
    └── editar/page.tsx # editar
```

Template de `layout.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserAppPermission } from '@/lib/permissions'

export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as any).id
  const perm   = await getUserAppPermission(userId, 'SLUG-DO-APP')
  if (!perm) redirect('/?error=sem-acesso')

  return (
    <div>
      {/* Sidebar do app */}
      {children}
    </div>
  )
}
```

### Passo 4 — Liberar acesso para usuários

Acessar `/admin/usuarios` e conceder o AppRole para cada usuário.

---

## Ícones 3D dos Apps

Os ícones são imagens PNG salvas em `public/app-icons/` e mapeadas em `APP_VISUAL` no `AppGrid.tsx`.

**Ícones disponíveis atualmente:**

| Arquivo | Slug | Categoria |
|---------|------|-----------|
| `trending-up.png` | `trending-up` | Finanças & Estratégia |
| `bar-chart-3.png` | `bar-chart-3` | Analytics & Dados |
| `target.png` | `target` | Metas & Performance |
| `layout-grid.png` | `layout-grid` | Plataforma (padrão) |

Para adicionar um novo ícone, gere uma imagem 3D e salve em `public/app-icons/`.

**Propriedades do visual por app:**

| Propriedade | Descrição |
|-------------|-----------|
| `image` | Caminho da imagem PNG |
| `gradient` | Gradiente do banner (light mode) |
| `gradientDark` | Gradiente do banner (dark mode) |
| `accent` | Cor do botão "Abrir" e borda hover |
| `category` | Tag exibida no banner inferior |

---

## Apps Ativos Hoje

| Slug | Nome | Rota | Status |
|------|------|------|--------|
| `viabilidade-economica` | Motor de Viabilidade Econômica | `/viabilidade` | ✅ Ativo |

### Planejados (não implementados)

| Slug sugerido | Nome sugerido | Categoria |
|--------------|--------------|-----------|
| `analytics-producao` | Analytics de Produção | Analytics & Dados |
| `metas-safra` | Metas de Safra | Metas & Performance |
| `gestao-contratos` | Gestão de Contratos | Operações |
