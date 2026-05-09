# UISA Plataforma — README

> Portal de Aplicativos Internos da UISA Bioenergia + Açúcar

## Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológico](#stack-tecnológico)
- [Pré-requisitos](#pré-requisitos)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Documentação Complementar](#documentação-complementar)

---

## Visão Geral

A **Plataforma UISA** é um portal web interno que centraliza aplicativos de uso corporativo. Cada app é registrado no catálogo do portal e exposto a usuários específicos com controle de acesso granular por perfil.

**Aplicativo atual:**
| App | Rota | Descrição |
|-----|------|-----------|
| Motor de Viabilidade Econômica | `/viabilidade` | Modelagem financeira de projetos industriais (VPL, TIR, Payback) |

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 14.x |
| Linguagem | TypeScript | 5.x |
| Banco de dados | SQLite (dev) / PostgreSQL (prod) | — |
| ORM | Prisma | 5.x |
| Autenticação | NextAuth.js v4 | 4.x |
| Estilização | Tailwind CSS + CSS Variables | 3.x |
| Fonte | Roboto (Google Fonts) | — |
| Ícones | Lucide React | 0.396 |
| Gráficos | Chart.js + react-chartjs-2 | 4.x |
| Tema Dark/Light | next-themes | 0.4.x |
| Validação | Zod | 3.x |
| E-mail | Nodemailer / Resend | — |
| IA (planejado v2) | Anthropic SDK | 0.25.x |

---

## Pré-requisitos

- **Node.js** ≥ 18.17
- **npm** ≥ 9
- Nenhum Docker necessário em desenvolvimento (SQLite local)

---

## Como Rodar Localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com os valores corretos. Os campos obrigatórios para rodar localmente são:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="qualquer-string-aleatoria-aqui"
NEXTAUTH_URL="http://localhost:3000"
ALLOWED_EMAIL_DOMAIN="uisa.com.br"
```

> Para produção, veja a seção de variáveis completas abaixo.

### 3. Criar e popular o banco de dados

```bash
npm run db:push    # Cria as tabelas no SQLite
npm run db:seed    # Insere dados iniciais (usuários + apps + projetos demo)
```

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em: **http://localhost:3000**

### 5. Fazer login (ambiente local)

1. Acesse `http://localhost:3000`
2. Digite um e-mail `@uisa.com.br` — ex: `admin@uisa.com.br`
3. Clique em **"Enviar link de acesso"**
4. Copie o link que aparece **no terminal** do `npm run dev`
5. Cole o link no browser → você estará logado

> Em produção com SMTP configurado, o link é enviado por e-mail automaticamente.

---

## Scripts Disponíveis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Compila o projeto para produção |
| `npm run start` | Inicia o servidor em modo produção |
| `npm run typecheck` | Verifica tipos TypeScript sem compilar |
| `npm run lint` | Executa o linter ESLint |
| `npm run db:generate` | Regenera o Prisma Client após mudança no schema |
| `npm run db:push` | Sincroniza o schema com o banco (dev, sem migrações) |
| `npm run db:migrate` | Cria e aplica uma migração formal (produção) |
| `npm run db:seed` | Popula o banco com dados iniciais |
| `npm run db:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run db:reset` | Apaga tudo e re-cria do zero |
| `npm run test` | Executa testes unitários (Jest) |

---

## Estrutura de Pastas

```
uisa-plataforma/
├── app/                          # App Router do Next.js
│   ├── (auth)/login/             # Tela de login (pública)
│   ├── (portal)/                 # Layout do portal (autenticado)
│   │   ├── page.tsx              # Tela inicial — grade de apps
│   │   └── admin/usuarios/       # Gerenciamento de usuários
│   ├── (apps)/viabilidade/       # App: Motor de Viabilidade
│   │   ├── page.tsx              # Lista de projetos
│   │   ├── novo/                 # Criar novo estudo
│   │   ├── [id]/                 # Ver resultado
│   │   └── [id]/editar/          # Editar estudo
│   ├── api/                      # Route Handlers (API REST)
│   │   ├── auth/[...nextauth]/   # Handler NextAuth
│   │   ├── admin/                # APIs administrativas
│   │   └── projects/             # CRUD de projetos
│   ├── globals.css               # Design system (CSS variables)
│   ├── layout.tsx                # Root layout (fonte + tema)
│   └── providers.tsx             # SessionProvider + ThemeProvider
│
├── components/
│   ├── UisaLogo.tsx              # Logo SVG UISA
│   ├── ThemeToggle.tsx           # Botão dark/light
│   ├── portal/                   # Componentes do portal
│   │   ├── PortalSidebar.tsx
│   │   ├── AppGrid.tsx           # Cards dos aplicativos
│   │   └── admin/UsersTable.tsx  # Tabela de usuários
│   └── viabilidade/              # Componentes do app
│       ├── ViabilidadeSidebar.tsx
│       ├── ProjectCard.tsx
│       ├── wizard/               # Wizard de criação (6 steps)
│       └── results/              # Tela de resultados
│
├── lib/
│   ├── auth.ts                   # Configuração NextAuth
│   ├── db.ts                     # Singleton do Prisma Client
│   ├── permissions.ts            # Matriz de permissões RBAC
│   ├── calculations.ts           # Motor financeiro (VPL, TIR, etc.)
│   ├── analysis.ts               # Análise qualitativa descritiva
│   └── formatters.ts             # Formatadores de números/datas
│
├── prisma/
│   ├── schema.prisma             # Schema do banco de dados
│   ├── seed.ts                   # Script de seed
│   └── dev.db                    # Banco SQLite local (gitignore)
│
├── types/                        # Tipos TypeScript globais
├── middleware.ts                 # Proteção de rotas (NextAuth)
├── docs/                         # ← Esta documentação
└── public/
    └── app-icons/                # Ícones 3D dos aplicativos
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `DATABASE_URL` | ✅ | URL do banco. Local: `file:./prisma/dev.db` |
| `NEXTAUTH_SECRET` | ✅ | Chave secreta para assinar JWTs (min. 32 chars) |
| `NEXTAUTH_URL` | ✅ | URL base da aplicação. Ex: `https://plataforma.uisa.com.br` |
| `ALLOWED_EMAIL_DOMAIN` | ✅ | Domínio autorizado para login. Ex: `uisa.com.br` |
| `EMAIL_SERVER_HOST` | Prod | Host SMTP para envio de magic links |
| `EMAIL_SERVER_PORT` | Prod | Porta SMTP (587 = TLS, 465 = SSL) |
| `EMAIL_SERVER_USER` | Prod | Usuário SMTP |
| `EMAIL_SERVER_PASS` | Prod | Senha SMTP |
| `EMAIL_FROM` | Prod | Remetente dos e-mails. Ex: `noreply@uisa.com.br` |
| `ANTHROPIC_API_KEY` | v2 | Chave da API Anthropic (análise via IA — não implementado) |
| `NEXT_PUBLIC_ALLOWED_DOMAIN` | Opcional | Expõe o domínio ao frontend para mensagem de ajuda no login |

---

## Documentação Complementar

| Documento | Conteúdo |
|-----------|---------|
| [02-AUTH.md](./02-AUTH.md) | Fluxo de autenticação, autorização e RBAC |
| [03-PORTAL-CATALOGO.md](./03-PORTAL-CATALOGO.md) | Como registrar e gerenciar apps no portal |
| [04-DATABASE.md](./04-DATABASE.md) | ERD, modelos e guia de migrações |
| [05-MOTOR-VIABILIDADE.md](./05-MOTOR-VIABILIDADE.md) | Lógica de cálculo financeiro e regras de negócio |
| [06-INTEGRAÇÕES.md](./06-INTEGRACOES.md) | Contratos de API, e-mail e IA |
| [07-RUNBOOK.md](./07-RUNBOOK.md) | Deploy, rollback, backup e incidentes |
| [08-DESIGN-SYSTEM.md](./08-DESIGN-SYSTEM.md) | Paleta de cores, tipografia e componentes visuais |
