# Banco de Dados — ERD e Guia de Migrações

## Índice
- [Diagrama ER (ERD)](#diagrama-er)
- [Descrição dos Modelos](#descrição-dos-modelos)
- [Comandos de Banco](#comandos-de-banco)
- [Guia de Migração](#guia-de-migração)
- [Banco em Produção](#banco-em-produção)
- [Seed de Dados](#seed-de-dados)

---

## Diagrama ER

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string name
        string globalRole
        boolean isActive
        datetime lastLoginAt
        datetime createdAt
    }

    Account {
        string id PK
        string userId FK
        string provider
        string providerAccountId
    }

    Session {
        string id PK
        string userId FK
        string sessionToken UK
        datetime expires
    }

    VerificationToken {
        string identifier
        string token UK
        datetime expires
    }

    Invitation {
        string id PK
        string email
        string tokenHash UK
        string invitedById FK
        datetime expiresAt
        datetime usedAt
    }

    App {
        string id PK
        string slug UK
        string nome
        string descricao
        string icone
        string urlBase
        boolean ativo
        int ordem
        string rolesDisponiveis
    }

    AppPermission {
        string id PK
        string userId FK
        string appId FK
        string appRole
        string grantedBy
        datetime expiresAt
        boolean isActive
    }

    Project {
        string id PK
        string name
        string department
        string responsible
        string ownerId FK
        string status
        boolean isDemo
        datetime deletedAt
    }

    ProjectVersion {
        string id PK
        string projectId FK
        int version
        float tma
        float ir
        float capex
        string dataInvest
        string rampupTipo
        string produtos
        string opex
        string rh
        string results
    }

    QualitativeAnalysis {
        string id PK
        string projectId FK
        string versionId FK
        string engine
        string contentJson
        datetime generatedAt
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string appSlug
        string resourceType
        string resourceId
        string payloadJson
        datetime createdAt
    }

    PremissaConfig {
        string id PK
        string key UK
        float value
        string unit
        string descricao
    }

    ProductConfig {
        string id PK
        string nome UK
        float preco
        float margem
        string unidade
        boolean ativo
    }

    User ||--o{ Account : "tem"
    User ||--o{ Session : "tem"
    User ||--o{ AppPermission : "recebe"
    User ||--o{ Project : "cria"
    User ||--o{ AuditLog : "gera"
    User ||--o{ Invitation : "envia"
    App ||--o{ AppPermission : "concede"
    Project ||--o{ ProjectVersion : "versiona"
    Project ||--o{ QualitativeAnalysis : "analisa"
    ProjectVersion ||--o{ QualitativeAnalysis : "referencia"
```

---

## Descrição dos Modelos

### 🔐 Auth (NextAuth)

#### `User`
Usuário da plataforma. Todo usuário que faz login é criado automaticamente.

| Campo | Descrição |
|-------|-----------|
| `globalRole` | `"USER"` (padrão) ou `"ADMIN"` (acesso total) |
| `isActive` | Pode ser desativado pelo admin sem apagar o registro |
| `lastLoginAt` | Atualizado a cada login bem-sucedido |

#### `Account`, `Session`, `VerificationToken`
Tabelas internas do NextAuth. **Não manipular diretamente.**

#### `Invitation`
Convite enviado pelo admin. Contém permissões iniciais em `initialPermissions` (JSON). Quando o usuário usa o magic link pela primeira vez, as permissões são criadas.

---

### 🏢 Portal

#### `App`
Catálogo de aplicativos registrados na plataforma.

| Campo | Exemplo | Descrição |
|-------|---------|-----------|
| `slug` | `"viabilidade-economica"` | Identificador único, usado em permissões |
| `urlBase` | `"/viabilidade"` | Rota de entrada do app |
| `icone` | `"trending-up"` | Nome do ícone → mapeia para imagem 3D em `public/app-icons/` |
| `rolesDisponiveis` | `["ANALISTA","MODERADOR","ADMIN_APP"]` | JSON com papéis permitidos neste app |
| `ordem` | `1` | Ordem de exibição no grid do portal |

#### `AppPermission`
Um registro = um usuário com um papel em um app.

| Campo | Descrição |
|-------|-----------|
| `appRole` | `VISUALIZADOR` / `ANALISTA` / `MODERADOR` / `ADMIN_APP` |
| `isActive` | `false` = revogado (soft delete, preserva histórico) |
| `expiresAt` | Acesso temporário (opcional) |
| `grantedBy` | ID do admin que concedeu |

> **Constraint:** `UNIQUE(userId, appId)` — um usuário tem apenas **um papel** por app.

---

### 📊 Viabilidade

#### `Project`
Registro mestre de um estudo de viabilidade.

| `status` | Quando ocorre |
|----------|--------------|
| `DRAFT` | Criado por Analista (sem cálculo) |
| `CALCULATED` | Calculado por Moderador/Admin |
| `ARCHIVED` | Soft-deleted |

#### `ProjectVersion`
Cada edição de um projeto gera uma nova versão. A versão mais recente é usada como dado atual.

**Campos JSON (armazenados como string):**
- `produtos` → `Array<{ nome, volume, preco, margem, unidade }>`
- `opex` → `Array<{ nome, valor, tipo, indice }>`
- `rh` → `Array<{ cargo, qtd, salario, encargos }>`
- `results` → Resultado completo do `calcularFluxo()` (VPL, TIR, Payback, fluxo anual)

> **Motivo de JSON como string:** Compatibilidade com SQLite, que não suporta tipos `JSON` nativos. Em PostgreSQL, esses campos podem ser migrados para `Json`.

#### `PremissaConfig`
Parâmetros globais configuráveis pelo Moderador/Admin.

| `key` | Padrão | Descrição |
|-------|--------|-----------|
| `TMA_PADRAO` | 14.7 | Taxa Mínima de Atratividade (%) |
| `IRPJ_CSLL` | 15.3 | Alíquota IRPJ + CSLL (%) |
| `ANO_IRPJ` | 2034 | Ano início do IRPJ |
| `PIS_COFINS` | 9.15 | Alíquota PIS/COFINS (%) |

---

## Comandos de Banco

```bash
# Gerar o Prisma Client após mudança no schema
npm run db:generate

# Sincronizar schema com o banco (desenvolvimento, sem criar migration)
npm run db:push

# Criar uma migração formal (usar em produção)
npm run db:migrate

# Popular banco com dados iniciais
npm run db:seed

# Abrir GUI visual do banco
npm run db:studio

# Apagar TUDO e recriar do zero
npm run db:reset
```

---

## Guia de Migração

### Fluxo de Desenvolvimento

Em desenvolvimento, use sempre `db:push` — não cria arquivos de migração, apenas sincroniza.

```bash
# 1. Edite o schema.prisma
# 2. Sincronize
npm run db:push
# 3. Atualize o client
npm run db:generate
```

### Fluxo de Produção

Em produção, **sempre use migrações formais** para rastreabilidade:

```bash
# Criar a migração
npx prisma migrate dev --name descricao_da_mudanca

# Aplicar em produção
npx prisma migrate deploy
```

### Adicionando um novo campo

```prisma
// schema.prisma
model ProjectVersion {
  // ... campos existentes ...
  novoCampo String? @default("valor") // sempre com default para não quebrar dados existentes
}
```

```bash
npm run db:migrate  # ou db:push em dev
npm run db:generate
```

---

## Banco em Produção

### Migrar de SQLite para PostgreSQL

1. No `.env`, altere:
```env
DATABASE_URL="postgresql://user:pass@host:5432/uisa_plataforma"
```

2. No `schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Campos JSON (opcional, melhora performance):
```prisma
// SQLite:  results String?
// Postgres: results Json?
```

4. Aplicar:
```bash
npx prisma migrate deploy
npm run db:generate
```

### Backup

```bash
# SQLite (dev)
cp prisma/dev.db prisma/dev.db.backup

# PostgreSQL (prod)
pg_dump -U user -d uisa_plataforma > backup_$(date +%Y%m%d).sql
```

---

## Seed de Dados

**Arquivo:** `prisma/seed.ts`

Executar com:
```bash
npm run db:seed
```

**O que o seed cria:**

| Categoria | Dados |
|-----------|-------|
| Apps | Motor de Viabilidade Econômica (slug: `viabilidade-economica`) |
| Premissas | TMA, IRPJ, PIS/COFINS, vida útil padrão |
| Produtos | Açúcar VHP, Etanol Hidratado, Etanol Anidro, Energia Elétrica |
| Usuários | admin, moderador, analista, visualizador (todos @uisa.com.br) |
| Permissões | Cada usuário recebe o papel correspondente ao seu nome |
| Projetos Demo | 2 projetos de exemplo com resultados calculados |
