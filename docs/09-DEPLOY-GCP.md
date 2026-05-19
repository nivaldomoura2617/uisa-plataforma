# 09 — Plano de Deploy: Google Cloud Platform

> **Status:** 🟡 Aguardando aprovação da gestão  
> **Criado em:** 2026-05-15  
> **Última atualização:** 2026-05-15  
> **Responsável:** Nívaldo Moura

---

## Visão Geral

A **UISA Plataforma** (Next.js 14 + Prisma + NextAuth) será migrada para o Google Cloud Platform em **dois ambientes independentes**:

- **Staging** → Projeto GCP já existente (para validação técnica)
- **Produção** → Projeto GCP novo (a ser aprovado pela gestão)

---

## Decisões Arquiteturais

| Ponto | Decisão |
|---|---|
| **Plataforma** | Google Cloud Platform (GCP) |
| **Runtime** | Cloud Run (serverless containers) |
| **Banco de dados** | Cloud SQL — PostgreSQL 16 |
| **IA** | Vertex AI — Gemini 2.5 Flash |
| **Imagens Docker** | Artifact Registry |
| **Secrets** | Secret Manager |
| **CI/CD** | GitHub Actions |
| **Região** | `southamerica-east1` (São Paulo) |

---

## Por que Gemini 2.5 Flash?

A plataforma usa IA para **análise qualitativa de projetos de viabilidade econômica**. O Gemini 2.5 Flash foi escolhido sobre o Claude Sonnet pelos seguintes motivos:

| Critério | Claude Sonnet | Gemini 2.5 Flash |
|---|---|---|
| Custo entrada | ~$3,00/M tokens | ~$0,10/M tokens (30x mais barato) |
| Custo saída | ~$15,00/M tokens | ~$0,40/M tokens (37x mais barato) |
| Qualidade pt-BR | Excelente | Muito boa para análise estruturada |
| Janela de contexto | 200K tokens | 1M tokens |
| Ecossistema | Externo (Anthropic) | 100% GCP ✅ |
| Data residency | EUA | Brasil (southamerica-east1) ✅ |

> **Porta de saída:** Se durante o staging a qualidade não satisfizer, é possível reverter para Claude apenas alterando variáveis de ambiente no Secret Manager — sem mudança de infraestrutura.

---

## Arquitetura

```
GitHub Repository
        │
        ├── branch: develop ──▶ STAGING (Projeto GCP existente)
        │                        - Cloud Run: uisa-staging
        │                        - Cloud SQL: uisa-db-staging
        │                        - URL: uisa-staging-xxxx.run.app
        │
        └── branch: main ──────▶ PRODUÇÃO (Projeto GCP novo)
                                  - Cloud Run: uisa-prod
                                  - Cloud SQL: uisa-db-prod
                                  - URL: plataforma.uisa.com.br
```

---

## Mudanças Necessárias no Código

### 1. Banco de Dados — `prisma/schema.prisma`

```prisma
// ANTES (SQLite — incompatível com Cloud Run)
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// DEPOIS (PostgreSQL — Cloud SQL)
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // via pgBouncer (pooled)
  directUrl = env("DIRECT_URL")     // direto, para migrations
}
```

> ⚠️ **Atenção:** Após a alteração, rodar `prisma migrate dev --name migrate-sqlite-to-postgres` para gerar a migration inicial.

---

### 2. Next.js — `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // ← essencial para Cloud Run
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}
export default nextConfig
```

---

### 3. Dockerfile (a criar na raiz)

```dockerfile
# Stage 1: Dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner (imagem final mínima)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

---

### 4. Integração de IA — substituir Anthropic por Gemini

```bash
npm install @google/genai
# Remover @anthropic-ai/sdk apenas após validação no staging
```

Novo arquivo `lib/ai-client.ts`:
```typescript
import { GoogleGenerativeAI } from '@google/genai';

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export const aiModel = genai.getGenerativeModel({
  model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
});

export async function generateAnalysis(prompt: string): Promise<string> {
  const result = await aiModel.generateContent(prompt);
  return result.response.text();
}
```

---

### 5. CI/CD — GitHub Actions

Dois workflows a criar:
- `.github/workflows/deploy-staging.yml` → trigger: push em `develop`
- `.github/workflows/deploy-prod.yml` → trigger: push em `main`

Autenticação via **Workload Identity Federation** (sem chaves JSON armazenadas no GitHub).

---

## Variáveis de Ambiente por Ambiente

| Variável | Staging | Produção |
|---|---|---|
| `DATABASE_URL` | Cloud SQL staging (pooled) | Cloud SQL prod (pooled) |
| `DIRECT_URL` | Cloud SQL staging (direto) | Cloud SQL prod (direto) |
| `NEXTAUTH_SECRET` | Secret Manager | Secret Manager |
| `NEXTAUTH_URL` | URL do Cloud Run staging | `https://plataforma.uisa.com.br` |
| `GOOGLE_API_KEY` | Chave Vertex AI staging | Chave Vertex AI prod |
| `GEMINI_MODEL` | `gemini-2.5-flash` | `gemini-2.5-flash` |
| `EMAIL_SERVER_*` | Configuração SMTP | Configuração SMTP |
| `ALLOWED_EMAIL_DOMAIN` | `uisa.com.br` | `uisa.com.br` |
| `LOG_LEVEL` | `DEBUG` | `INFO` |

---

## Estimativa de Custo Mensal

| Serviço | Staging | Produção |
|---|---|---|
| Cloud Run | ~$0–5 | ~$10–30 |
| Cloud SQL (db-f1-micro) | ~$10–15 | ~$15–25 |
| Artifact Registry | ~$0,50 | ~$0,50 |
| Secret Manager | ~$0 | ~$0 |
| Vertex AI (Gemini) | ~$0–1 | ~$1–5 |
| **Total (USD)** | **~$12–22** | **~$27–61** |
| **Total (BRL ~5.5x)** | **~R$66–121** | **~R$149–336** |

---

## Fases de Execução

### Fase 1 — Preparação do Código (não precisa de GCP)
- [ ] Migrar `schema.prisma`: `sqlite` → `postgresql`
- [ ] Atualizar `next.config.mjs` com `output: 'standalone'`
- [ ] Criar `Dockerfile` e `.dockerignore` na raiz
- [ ] Instalar `@google/genai`, criar `lib/ai-client.ts`
- [ ] Criar branch `develop` no repositório
- [ ] Testar build local: `docker build . && docker run -p 3000:3000`

### Fase 2 — Deploy no Staging (projeto GCP existente)
- [ ] Criar Cloud SQL PostgreSQL no projeto de staging
- [ ] Rodar `prisma migrate deploy` contra Cloud SQL staging
- [ ] Criar Artifact Registry no projeto de staging
- [ ] Criar segredos no Secret Manager (staging)
- [ ] Configurar GitHub Actions `deploy-staging.yml`
- [ ] Push em `develop` → validar deploy automático
- [ ] Testar: login, projetos, análise de IA com Gemini

### Fase 3 — Validação (1–2 semanas de uso piloto)
- [ ] Testar qualidade das análises do Gemini com dados reais
- [ ] Ajustar prompts se necessário
- [ ] Testar com usuários piloto (@uisa.com.br)
- [ ] Confirmar estabilidade: latência, banco, logs

### Fase 4 — Produção (quando projeto GCP for aprovado)
- [ ] Criar Cloud SQL PostgreSQL no projeto de produção
- [ ] Configurar GitHub Actions `deploy-prod.yml`
- [ ] Configurar domínio `plataforma.uisa.com.br`
- [ ] Ajustar `NEXTAUTH_URL` para domínio final
- [ ] Deploy via merge `develop` → `main`

---

## Informações Necessárias para Iniciar

Antes de executar a Fase 2, confirmar:
1. **Project ID** do projeto GCP de staging
2. **`gcloud` CLI** instalado localmente? (`gcloud --version`)
3. **Aprovação da gestão** para prosseguir

---

## Referências

- [Cloud Run — Next.js Standalone](https://cloud.google.com/run/docs/quickstarts/frameworks/nextjs)
- [Prisma — Cloud SQL](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-google-cloud-run)
- [Vertex AI — Gemini 2.5 Flash](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini)
- [GitHub Actions — Google Cloud](https://github.com/google-github-actions)
