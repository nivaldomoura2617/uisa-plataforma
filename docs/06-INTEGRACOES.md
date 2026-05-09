# Integrações — Contratos de API e Serviços Externos

## Índice
- [API REST Interna](#api-rest-interna)
- [Contrato de Cada Endpoint](#contrato-de-cada-endpoint)
- [Serviço de E-mail](#serviço-de-e-mail)
- [IA — Anthropic (v2)](#ia--anthropic-v2)
- [Tratamento de Falhas](#tratamento-de-falhas)
- [Padrão de Resposta de Erro](#padrão-de-resposta-de-erro)

---

## API REST Interna

Toda comunicação cliente-servidor segue o padrão de **Route Handlers do Next.js** em `app/api/`.

**Base URL:** `/api`
**Autenticação:** Cookie de sessão JWT (gerenciado pelo NextAuth, automático no browser)
**Formato:** JSON

### Endpoints disponíveis

| Método | Rota | Permissão mínima | Descrição |
|--------|------|-----------------|-----------|
| `GET` | `/api/projects` | VISUALIZADOR | Lista projetos do usuário |
| `POST` | `/api/projects` | ANALISTA | Cria projeto (calcula se MODERADOR+) |
| `GET` | `/api/projects/[id]` | VISUALIZADOR | Detalhe de um projeto |
| `PUT` | `/api/projects/[id]` | ANALISTA (próprio) | Edita projeto (calcula se MODERADOR+) |
| `DELETE` | `/api/projects/[id]` | ANALISTA (próprio) | Soft delete do projeto |
| `POST` | `/api/admin/permissions` | ADMIN | Concede acesso a um app |
| `DELETE` | `/api/admin/permissions` | ADMIN | Revoga acesso |
| `GET` | `/api/admin/users` | ADMIN | Lista todos os usuários |
| `POST` | `/api/admin/users` | ADMIN | Cria/convida usuário |
| `GET` | `/api/admin/premissas` | MODERADOR+ | Lista premissas financeiras |
| `POST` | `/api/admin/premissas` | MODERADOR+ | Atualiza premissa |
| `GET,POST` | `/api/auth/[...nextauth]` | Público | Handlers NextAuth |

---

## Contrato de Cada Endpoint

### `POST /api/projects` — Criar projeto

**Body:**
```json
{
  "inputs": {
    "nome": "Expansão Linha B",
    "depto": "Engenharia",
    "resp": "João Silva",
    "tma": 14.7,
    "ir": 15.3,
    "pisCofins": 9.15,
    "vidaUtil": 10,
    "anoIRPJ": 2034,
    "aplicarIRPJ": false,
    "capex": 15000000,
    "dataInvest": "2025-01-01",
    "vidaFiscal": 5,
    "manutencao": 1.5,
    "creditoPis": false,
    "rampupTipo": "gradual",
    "rampupAnos": 3,
    "rampupCustom": [],
    "produtos": [
      { "nome": "Açúcar VHP", "volume": 50000, "preco": 1850, "margem": 0, "unidade": "ton" }
    ],
    "opex": [
      { "nome": "Matéria-prima cana", "valor": 4500000, "tipo": "fixo", "indice": 1.05 }
    ],
    "rh": [
      { "cargo": "Operador", "qtd": 5, "salario": 3500, "encargos": 72 }
    ]
  }
}
```

**Resposta 200:**
```json
{ "ok": true, "projectId": "clxyz..." }
```

> Se o usuário for `MODERADOR` ou `ADMIN_APP`, `results` será calculado e salvo. Caso contrário, o projeto é salvo como `DRAFT`.

---

### `PUT /api/projects/[id]` — Editar projeto

**Body:** Mesmo formato que `POST /api/projects`

**Resposta 200:**
```json
{ "ok": true, "version": 2 }
```

---

### `POST /api/admin/permissions` — Conceder acesso

**Body:**
```json
{
  "userId": "clxyz...",
  "appSlug": "viabilidade-economica",
  "appRole": "ANALISTA"
}
```

**appRole válidos:** `VISUALIZADOR` | `ANALISTA` | `MODERADOR` | `ADMIN_APP`

**Resposta 200:**
```json
{ "ok": true }
```

---

### `DELETE /api/admin/permissions` — Revogar acesso

**Body:**
```json
{
  "userId": "clxyz...",
  "appSlug": "viabilidade-economica"
}
```

**Resposta 200:**
```json
{ "ok": true }
```

> Soft delete: define `isActive = false`, preserva histórico.

---

### `POST /api/admin/users` — Convidar usuário

**Body:**
```json
{
  "email": "novo@uisa.com.br",
  "name": "Maria Santos",
  "globalRole": "USER",
  "permissions": [
    { "appSlug": "viabilidade-economica", "appRole": "ANALISTA" }
  ]
}
```

**Resposta 200:**
```json
{ "ok": true, "userId": "clxyz..." }
```

---

## Serviço de E-mail

### Configuração

O envio de e-mail usa **Nodemailer** (SMTP) em produção.

```
EMAIL_SERVER_HOST=smtp.uisa.com.br
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=noreply@uisa.com.br
EMAIL_SERVER_PASS=senha-smtp
EMAIL_FROM=noreply@uisa.com.br
```

### Modo desenvolvimento (sem SMTP)

Quando `NODE_ENV !== 'production'` ou quando a URL do banco começa com `file:` (SQLite), o e-mail **NÃO é enviado** — o magic link aparece no terminal:

```
=============================================
🚀 MAGIC LINK PARA LOGIN LOCAL:
http://localhost:3000/api/auth/callback/email?...
=============================================
```

### Template de e-mail

HTML inline com identidade visual UISA:
- Fundo escuro `#07140a`
- Botão verde `#007960`
- Validade: **24 horas**

### Falhas de e-mail

| Situação | Comportamento |
|----------|--------------|
| SMTP fora do ar | NextAuth lança erro 500 na tela de login |
| Domínio não autorizado | `sendVerificationRequest` lança erro antes de tentar enviar |
| Token expirado | Usuário vê tela de login com `?error=Verification` |

---

## IA — Anthropic (v2)

> ⚠️ Funcionalidade **planejada**, não implementada na v1.

A dependência `@anthropic-ai/sdk` está instalada para uso futuro de análise qualitativa via LLM.

**Variável necessária:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

**Uso planejado:**
- Gerar análise qualitativa em texto sobre os resultados do projeto
- Identificar riscos e oportunidades baseados nos indicadores
- Registrar uso em `AiUsageLog` (modelo já existe no banco)

**Permissão necessária:** `GENERATE_AI_ANALYSIS` (apenas `MODERADOR` e `ADMIN_APP`)

---

## Tratamento de Falhas

### Padrões implementados

| Situação | Tratamento |
|----------|-----------|
| Usuário sem sessão | Middleware redireciona para `/login` |
| Usuário sem permissão no app | Layout do app redireciona para `/viabilidade` ou `/` |
| Erro de validação de body | Zod retorna `400` com detalhes |
| App não encontrado no banco | `404` |
| Erro de cálculo (`calcularFluxo`) | Capturado com try/catch, projeto salvo como DRAFT sem results |
| Usuário inativo tentando login | `signIn()` retorna false → tela de login com erro |

### Circuit breaker (não implementado)

Para produção futura, recomenda-se implementar:
- Retry com backoff exponencial para chamadas SMTP
- Fallback para DRAFT quando cálculo falha (já parcialmente implementado)
- Alertas de erro no banco via `AuditLog`

---

## Padrão de Resposta de Erro

Todos os Route Handlers seguem o padrão:

```json
// Sucesso
{ "ok": true, ... }

// Erro
{ "error": "Mensagem de erro legível" }
```

**Códigos de status usados:**

| Código | Quando |
|--------|--------|
| `200` | Sucesso |
| `400` | Body inválido / validação Zod falhou |
| `401` | Sem sessão (não autenticado) |
| `403` | Autenticado mas sem permissão |
| `404` | Recurso não encontrado |
| `500` | Erro interno (log no servidor) |
