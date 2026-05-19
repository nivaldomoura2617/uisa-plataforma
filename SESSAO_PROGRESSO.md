# SESSAO_PROGRESSO.md — UISA Plataforma

> **Finalidade:** Registro contínuo de sessões de trabalho para garantir continuidade e evitar quebras no código existente.  
> Sempre leia este arquivo antes de começar qualquer sessão de desenvolvimento.

---

## ⚠️ Estado Atual do Projeto

```
STATUS: PRODUÇÃO LOCAL FUNCIONANDO ✅ — AGUARDANDO APROVAÇÃO PARA DEPLOY GCP 🟡
```

O código atual está **estável e funcional em ambiente local**. Nenhuma alteração de código foi feita ainda para o deploy GCP. O projeto roda localmente com:

```bash
npm run dev   # porta 3002
# Banco: SQLite local (prisma/dev.db)
# IA: Anthropic Claude Sonnet (chave local no .env)
```

**Não altere o código antes de confirmar aprovação da gestão e retomar a sessão de deploy.**

---

## Histórico de Sessões

---

### 📅 Sessão: 2026-05-15 — Planejamento de Deploy GCP

**Objetivo da sessão:** Pesquisar e elaborar plano de migração para Google Cloud Platform.

**O que foi feito:**
- ✅ Levantamento completo da stack atual (Next.js 14, Prisma/SQLite, NextAuth, Anthropic Claude)
- ✅ Pesquisa de melhores práticas: Cloud Run + Cloud SQL + Artifact Registry + Vertex AI
- ✅ Análise de custo-benefício: Gemini 2.5 Flash vs Claude Sonnet
- ✅ Definição da estratégia de dois ambientes (Staging → Produção)
- ✅ Elaboração do plano completo de deploy salvo em `docs/09-DEPLOY-GCP.md`
- ✅ Criação deste arquivo `SESSAO_PROGRESSO.md`

**Decisões tomadas:**
| Decisão | Escolha | Motivo |
|---|---|---|
| IA | Gemini 2.5 Flash (Vertex AI) | 30x mais barato, ecossistema GCP, qualidade suficiente para análise financeira |
| Banco | Cloud SQL PostgreSQL | SQLite é incompatível com Cloud Run (filesystem efêmero) |
| Runtime | Cloud Run | Serverless, escala a zero, custo proporcional ao uso |
| CI/CD | GitHub Actions | Integração nativa com repositório existente |
| Ambientes | Staging (GCP existente) + Produção (GCP a aprovar) | Segurança: validar antes de ir ao ar |

**O que NÃO foi feito (código intacto):**
- ❌ `schema.prisma` ainda com `sqlite` (sem alteração)
- ❌ `next.config.mjs` sem `output: 'standalone'` ainda
- ❌ `Dockerfile` ainda não criado
- ❌ Dependência `@google/genai` ainda não instalada
- ❌ Branch `develop` ainda não criada

**Pendências para próxima sessão:**
1. Receber aprovação da gestão
2. Confirmar Project ID do GCP de staging
3. Confirmar se `gcloud` CLI está instalado
4. Executar Fase 1 do plano (alterações no código)
5. Executar Fase 2 (configuração do GCP staging)

---

## Próxima Sessão: O que fazer primeiro

```
1. Leia este arquivo (SESSAO_PROGRESSO.md) ✅
2. Leia docs/09-DEPLOY-GCP.md para o plano completo
3. Confirme com o usuário: aprovação OK? Project ID do GCP?
4. Se aprovado, inicie pela Fase 1 — sem quebrar o código atual
```

### Ordem segura de alterações (Fase 1)

Execute nessa ordem exata para não quebrar o ambiente local:

```bash
# 1. Criar branch develop antes de qualquer mudança
git checkout -b develop

# 2. Alterar schema.prisma (sqlite → postgresql)
# — Neste ponto o DEV LOCAL vai parar de funcionar com SQLite
# — Só fazer se o Cloud SQL de staging já estiver pronto

# 3. Atualizar next.config.mjs (adicionar output: 'standalone')
# — Impacto mínimo, pode fazer sem medo

# 4. Criar Dockerfile e .dockerignore
# — Apenas novos arquivos, sem impacto no código existente

# 5. Instalar @google/genai (não remover @anthropic-ai/sdk ainda)
# npm install @google/genai

# 6. Criar lib/ai-client.ts (novo arquivo, sem alterar o existente)
# — Somente trocar a referência na API route após validar no staging
```

> ⚠️ **Regra de ouro:** A migração do banco (`sqlite` → `postgresql`) só deve ser feita depois que o Cloud SQL de staging estiver configurado e acessível. Antes disso, o ambiente local continua funcionando normalmente.

---

## Arquivos de Referência

| Arquivo | Descrição |
|---|---|
| `docs/09-DEPLOY-GCP.md` | Plano completo de deploy no GCP |
| `prisma/schema.prisma` | Schema atual (SQLite — a migrar para PostgreSQL) |
| `next.config.mjs` | Config do Next.js (sem `standalone` ainda) |
| `.env` | Variáveis locais (SQLite + Anthropic) |
| `.env.example` | Modelo para produção (já tem estrutura PostgreSQL) |

---

## Stack Atual (Referência Rápida)

```
Framework:    Next.js 14 (App Router)
Linguagem:    TypeScript
Estilo:       TailwindCSS
Banco:        Prisma + SQLite (local) → PostgreSQL (GCP)
Auth:         NextAuth v4 (Magic Link email)
IA:           @anthropic-ai/sdk — Claude Sonnet → Gemini 2.5 Flash (GCP)
Email:        nodemailer / resend
Porta local:  3002
```

---

_Última atualização: 2026-05-15 por sessão de planejamento GCP_
