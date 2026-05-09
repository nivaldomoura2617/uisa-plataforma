# UISA — Plataforma de Aplicativos Internos

Portal centralizado de aplicativos corporativos UISA. Sistema de autenticação único, permissões em 2 níveis (acesso ao app + perfil dentro do app) e arquitetura modular para acomodar futuros aplicativos.

**Versão:** 1.0 (Arquitetura v2.2)
**Stack:** Next.js 14 + TypeScript + Prisma + PostgreSQL (Supabase) + NextAuth + Tailwind CSS
**Aplicativo inicial:** Motor de Viabilidade Econômica (Engine v6)

---

## 📋 Pré-requisitos

- **Node.js 18+** instalado
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (gratuita)
- Conta no [Resend](https://resend.com) para envio de Magic Links (gratuita até 3000 emails/mês)
- Git

---

## 🚀 Setup local — passo a passo

### 1. Instalar dependências

```bash
cd uisa-plataforma
npm install
```

### 2. Criar projeto no Supabase

1. Acesse **supabase.com** → **New Project**
2. Configure:
   - **Name**: `uisa-plataforma`
   - **Database Password**: anote em local seguro
   - **Region**: South America (São Paulo)
3. Aguarde ~2 min até o projeto estar pronto
4. Em **Settings → Database → Connection string**, copie:
   - **URI (Transaction pooler)** → `DATABASE_URL`
   - **URI (Session pooler)** → `DIRECT_URL`

### 3. Configurar Resend (Magic Link)

1. Acesse **resend.com** → criar conta gratuita
2. Adicionar e validar o domínio `uisa.com.br` (ou usar sandbox para testes iniciais)
3. Em **API Keys**, criar uma chave → copiar para `EMAIL_SERVER_PASS`

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env`:

```env
# Supabase
DATABASE_URL="postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# NextAuth — gerar com: openssl rand -base64 32
NEXTAUTH_SECRET="cole-o-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Resend
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASS="re_xxxxxxxxxxxx"
EMAIL_FROM="noreply@uisa.com.br"

# Domínio
ALLOWED_EMAIL_DOMAIN="uisa.com.br"
NEXT_PUBLIC_ALLOWED_DOMAIN="uisa.com.br"
```

### 5. Criar o banco e popular com dados iniciais

```bash
# Gera o Prisma Client
npm run db:generate

# Cria todas as tabelas no Supabase
npm run db:push

# Popula com apps, premissas, produtos, 3 usuários e 2 projetos demo
npm run db:seed
```

Saída esperada do seed:
```
🌱 Iniciando seed da plataforma UISA...
📱 Registrando aplicativos no portal...
  ✅ Motor de Viabilidade Econômica
📊 Inserindo premissas financeiras...
  ✅ 6 premissas inseridas
🌾 Inserindo produtos UISA (2T 25/26)...
  ✅ 6 produtos inseridos
👥 Criando usuários iniciais...
  ✅ admin@uisa.com.br        — Admin Global
  ✅ controladoria@uisa.com.br — Moderador
  ✅ analista@uisa.com.br      — Analista
📁 Criando projetos de demonstração...
  ✅ Automação — Linha de Moagem 3 — VPL: R$ 10.59M | TIR: 57.6% | Payback: 2.84a
  ✅ Levedura Seca                  — VPL: R$ X.XX M | TIR: XX.X% | Payback: X.XXa
✅ Seed concluído!
```

### 6. Rodar localmente

```bash
npm run dev
```

Acesse **http://localhost:3000**, informe um dos e-mails do seed e clique no link recebido.

---

## 🌐 Deploy na Vercel

### Opção A — Via GitHub (recomendado)

1. Crie um repositório no GitHub e suba o código:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — UISA Plataforma v1.0"
   git remote add origin https://github.com/SEU_USUARIO/uisa-plataforma.git
   git push -u origin main
   ```

2. Acesse **vercel.com** → **New Project** → conecte o repositório
3. Configure as variáveis de ambiente (cole o conteúdo do `.env`)
4. **Importante**: depois do primeiro deploy, atualize `NEXTAUTH_URL` para a URL da Vercel:
   ```
   NEXTAUTH_URL="https://uisa-plataforma.vercel.app"
   ```
5. Faça redeploy

### Opção B — Via Vercel CLI

```bash
npm i -g vercel
vercel
```

---

## 👥 Gestão de Usuários

### Como funciona o sistema de permissões

A plataforma usa **2 níveis de permissão**:

**Nível 1 — Acesso ao Aplicativo**
- Cada usuário recebe permissão para acessar cada app individualmente
- Sem permissão = card bloqueado no portal
- Admin global tem acesso automático a todos os apps

**Nível 2 — Perfil dentro do App**
- Para cada app, o usuário recebe um perfil específico:
  - **Visualizador** — só lê dados
  - **Analista** — cria e edita seus próprios projetos
  - **Moderador** — acesso amplo, edita premissas, vê todos os projetos
  - **Admin do App** — gerencia usuários do app
- O mesmo usuário pode ter perfis diferentes em apps diferentes

### Convidar novo usuário

1. Login como Admin Global (`admin@uisa.com.br`)
2. Acesse **/admin/usuarios**
3. Clique em **"+ Convidar Usuário"**
4. Informe o e-mail e os apps com perfis iniciais
5. O usuário recebe um Magic Link por e-mail e ao clicar é cadastrado automaticamente

### Alterar permissões de um usuário existente

1. Em **/admin/usuarios**, clique no usuário para expandir
2. Para cada app, selecione o perfil (ou "Sem acesso" para revogar)
3. Mudanças são aplicadas imediatamente

---

## 📂 Estrutura de pastas

```
uisa-plataforma/
├── app/
│   ├── (auth)/login/         ← Tela de login (Magic Link)
│   ├── (portal)/             ← Portal central (home + admin)
│   │   ├── page.tsx          ← Home — grade de aplicativos
│   │   └── admin/usuarios/   ← Gestão de usuários
│   ├── (apps)/
│   │   └── viabilidade/      ← Motor de Viabilidade Econômica
│   │       ├── page.tsx      ← Dashboard de projetos
│   │       ├── novo/         ← Wizard de novo projeto
│   │       ├── [id]/         ← Visualizar projeto
│   │       └── configuracoes/← Premissas (Moderador)
│   └── api/                  ← API routes
├── components/
│   ├── portal/               ← Sidebar, AppGrid, UsersTable
│   └── viabilidade/          ← Wizard, ResultsView, etc.
├── lib/
│   ├── auth.ts               ← NextAuth + Magic Link
│   ├── permissions.ts        ← Permissões em 2 níveis
│   ├── calculations.ts       ← Engine v6 (motor financeiro)
│   ├── analysis.ts           ← Análise qualitativa
│   ├── formatters.ts         ← BRL, %, anos
│   └── db.ts                 ← Prisma client
├── prisma/
│   ├── schema.prisma         ← Banco completo
│   └── seed.ts               ← Dados iniciais
├── types/
│   └── index.ts              ← Tipos TypeScript
├── middleware.ts             ← Verificação de auth
├── .env.example              ← Template de variáveis
└── README.md
```

---

## ➕ Adicionar um novo aplicativo à plataforma

1. **Cadastrar no banco** (via Prisma Studio ou seed):
   ```typescript
   await prisma.app.create({
     data: {
       slug:    'novo-app',
       nome:    'Novo Aplicativo',
       icone:   'bar-chart-3',
       urlBase: '/novo-app',
       rolesDisponiveis: ['VISUALIZADOR','ANALISTA','MODERADOR'],
     },
   })
   ```

2. **Criar pasta da rota**: `app/(apps)/novo-app/`
   - `layout.tsx` — verifica permissão (copiar de `viabilidade/layout.tsx`)
   - `page.tsx` — dashboard inicial do app

3. **Adicionar ao mapeamento do middleware** (se aplicável):
   ```typescript
   // middleware.ts
   const APP_ROUTE_MAP = {
     'viabilidade-economica': '/viabilidade',
     'novo-app':              '/novo-app',  // ← novo
   }
   ```

4. **Criar componentes** em `components/novo-app/`

5. **Conceder permissões** aos usuários via `/admin/usuarios`

---

## 🛠 Comandos úteis

| Comando | Uso |
|---|---|
| `npm run dev`        | Rodar localmente em http://localhost:3000 |
| `npm run build`      | Build de produção |
| `npm run typecheck`  | Verificar tipos sem compilar |
| `npm run db:studio`  | Abrir Prisma Studio (interface visual do banco) |
| `npm run db:reset`   | Apagar tudo e refazer o seed (⚠️ destrutivo) |
| `npm run db:migrate` | Criar nova migration (após mudar schema) |

---

## 🔒 Segurança

- ✅ Whitelist de domínio `@uisa.com.br` (configurável via env)
- ✅ Magic Link por e-mail (sem senha — sem risco de vazamento)
- ✅ Sessões JWT com httpOnly cookies
- ✅ Verificação de permissão em **3 camadas**: middleware → layout → API route
- ✅ Soft delete preserva histórico para auditoria
- ✅ Audit log de todas as ações sensíveis
- ✅ Rate limiting recomendado: configurar no Vercel/Cloudflare

---

## 📞 Suporte

Para dúvidas sobre a arquitetura: consultar `UISA_Arquitetura_Tecnica_v2_2.docx`.
Para revisão do motor financeiro: consultar `UISA_Motor_Calculo_v6.js`.

**Manutenção:** Controladoria UISA — TI Interno

---

## 📜 Licença

Software interno UISA — uso restrito. Todos os direitos reservados.
