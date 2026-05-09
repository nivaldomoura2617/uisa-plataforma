# Runbook — Deploy, Rollback, Backup e Incidentes

## Índice
- [Checklist Pré-Deploy](#checklist-pré-deploy)
- [Deploy (Produção)](#deploy-produção)
- [Rollback](#rollback)
- [Backup e Restore](#backup-e-restore)
- [Logs — Onde Olhar e Como Filtrar](#logs--onde-olhar-e-como-filtrar)
- [Monitoramento e Saúde](#monitoramento-e-saúde)
- [Playbooks de Incidentes](#playbooks-de-incidentes)
- [Variáveis de Ambiente — Checklist](#variáveis-de-ambiente--checklist)

---

## Checklist Pré-Deploy

Antes de qualquer deploy em produção:

- [ ] `npm run typecheck` — zero erros TypeScript
- [ ] `npm run lint` — zero erros de lint
- [ ] `npm run build` — build concluído com **Exit code: 0**
- [ ] Variáveis de ambiente conferidas no servidor de produção
- [ ] Backup do banco de dados realizado
- [ ] Migração de banco planejada (se houver mudança no schema)
- [ ] Testado localmente com os novos dados de seed

---

## Deploy (Produção)

### Opção A — Deploy na Vercel (recomendado)

A Vercel é a plataforma nativa do Next.js.

```bash
# 1. Instale a CLI Vercel (uma vez só)
npm install -g vercel

# 2. Faça login
vercel login

# 3. Vincule o projeto (primeira vez)
vercel link

# 4. Configure as variáveis de ambiente na Vercel
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add ALLOWED_EMAIL_DOMAIN
vercel env add EMAIL_SERVER_HOST
vercel env add EMAIL_SERVER_PORT
vercel env add EMAIL_SERVER_USER
vercel env add EMAIL_SERVER_PASS
vercel env add EMAIL_FROM

# 5. Deploy
vercel --prod
```

**Banco de dados na Vercel:**
- Use **Vercel Postgres** (Neon) ou **PlanetScale** como banco PostgreSQL gerenciado
- Atualize `DATABASE_URL` e `schema.prisma` para `postgresql`

### Opção B — Servidor próprio (VPS/Ubuntu)

```bash
# Pré-requisito: Node.js 18+, pm2, nginx

# 1. Clonar o repositório
git clone <repo-url> /var/www/uisa-plataforma
cd /var/www/uisa-plataforma

# 2. Instalar dependências
npm install --production

# 3. Configurar .env
cp .env.example .env
nano .env  # preencher todas as variáveis

# 4. Aplicar migrações
npx prisma migrate deploy
npx prisma generate

# 5. Popular banco (apenas primeira vez)
npm run db:seed

# 6. Build
npm run build

# 7. Iniciar com PM2
pm2 start npm --name "uisa-plataforma" -- start
pm2 save
pm2 startup

# 8. Nginx como proxy reverso
# /etc/nginx/sites-available/uisa-plataforma
server {
    listen 80;
    server_name plataforma.uisa.com.br;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 9. Habilitar site
ln -s /etc/nginx/sites-available/uisa-plataforma /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Atualização de versão (deploy contínuo)

```bash
cd /var/www/uisa-plataforma

# 1. Backup do banco
pg_dump -U user -d uisa_plataforma > backup_$(date +%Y%m%d_%H%M).sql

# 2. Pull das mudanças
git pull origin main

# 3. Instalar novas dependências (se houver)
npm install

# 4. Aplicar migrações
npx prisma migrate deploy
npx prisma generate

# 5. Rebuild
npm run build

# 6. Reiniciar (zero-downtime com PM2)
pm2 reload uisa-plataforma
```

---

## Rollback

### Vercel

```bash
# Listar deployments anteriores
vercel ls

# Promover deployment anterior para produção
vercel alias <deployment-url> plataforma.uisa.com.br
```

### Servidor próprio

```bash
# 1. Voltar para o commit anterior
git log --oneline -10   # identificar o commit alvo
git checkout <commit-hash>

# 2. Rebuild da versão anterior
npm install
npm run build

# 3. Restaurar banco se necessário
psql -U user -d uisa_plataforma < backup_YYYYMMDD_HHMM.sql

# 4. Reiniciar
pm2 reload uisa-plataforma

# 5. Voltar para main depois de resolver
git checkout main
```

---

## Backup e Restore

### SQLite (Desenvolvimento)

```bash
# Backup
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d)

# Restore
cp prisma/dev.db.backup.YYYYMMDD prisma/dev.db
```

### PostgreSQL (Produção)

```bash
# Backup completo
pg_dump -U postgres -d uisa_plataforma -F c -f backup_$(date +%Y%m%d_%H%M).dump

# Backup somente dados (sem schema)
pg_dump -U postgres -d uisa_plataforma --data-only -f data_$(date +%Y%m%d).sql

# Restore
pg_restore -U postgres -d uisa_plataforma backup_YYYYMMDD.dump

# Agendamento automático (crontab)
# 0 2 * * * pg_dump -U postgres uisa_plataforma > /backups/uisa_$(date +\%Y\%m\%d).sql
```

---

## Logs — Onde Olhar e Como Filtrar

### Onde ficam os logs

| Ambiente | Onde estão os logs |
|----------|--------------------|
| **Desenvolvimento** | Terminal do `npm run dev` (stdout/stderr) |
| **Servidor VPS (PM2)** | `pm2 logs uisa-plataforma` ou `~/.pm2/logs/` |
| **Vercel** | Dashboard → Projeto → Deployments → Functions Logs |
| **Pasta local (dev)** | `./logs/` — criada manualmente, ignorada pelo Git |

### Formato dos logs (JSON)

Todos os logs são escritos como **JSON por linha** (NDJSON) no `stdout`/`stderr`.

Exemplo de log bem-sucedido:
```json
{
  "timestamp": "2025-05-09T15:30:12.451Z",
  "level": "INFO",
  "service": "uisa-plataforma",
  "environment": "production",
  "message": "Projeto criado e calculado",
  "requestId": "a3f7c2b1",
  "method": "POST",
  "route": "/api/projects",
  "durationMs": 312,
  "userId": "clxyz123abc",
  "appRole": "MODERADOR",
  "projectId": "clxyz456def",
  "status": "CALCULATED"
}
```

Exemplo de log de erro:
```json
{
  "timestamp": "2025-05-09T15:31:00.000Z",
  "level": "ERROR",
  "service": "uisa-plataforma",
  "environment": "production",
  "message": "Falha no cálculo de viabilidade",
  "requestId": "b9d1e3f5",
  "route": "/api/projects",
  "userId": "clxyz123abc",
  "error": "Cannot read properties of undefined (reading 'split')",
  "stack": "TypeError: Cannot read..."
}
```

### Níveis de log

| Nível | Quando ocorre | Onde sai |
|-------|--------------|----------|
| `DEBUG` | Detalhe interno (cálculos, SQL) | stdout (somente em dev) |
| `INFO`  | Operações bem-sucedidas (login, criação, permissões) | stdout |
| `WARN`  | Tentativas bloqueadas (sem permissão, domínio inválido) | stderr |
| `ERROR` | Falhas inesperadas (erros de cálculo, exceções) | stderr |

**Controle de nível:**
```env
# .env
LOG_LEVEL=DEBUG   # dev: tudo
LOG_LEVEL=INFO    # prod: operações normais
LOG_LEVEL=WARN    # prod restrito: só problemas
```

### Como filtrar logs (terminal ou arquivo)

```bash
# Filtrar por nível ERROR
pm2 logs uisa-plataforma --raw | grep '"level":"ERROR"'

# Filtrar por requestId (rastrear uma requisição específica)
pm2 logs uisa-plataforma --raw | grep '"requestId":"a3f7c2"'

# Filtrar por userId
pm2 logs uisa-plataforma --raw | grep '"userId":"clxyz123"'

# Filtrar logins bloqueados
pm2 logs uisa-plataforma --raw | grep 'bloqueado'

# Salvar em arquivo local (dev)
npm run dev 2>&1 | tee logs/dev.log
```

### Mensagens chave por incidente

| Mensagem no log | O que significa |
|-----------------|-----------------|
| `Login bem-sucedido` | Usuário autenticado com sucesso |
| `Login bloqueado — domínio não autorizado` | Tentativa de login fora do domínio |
| `Login bloqueado — usuário inativo` | Conta desativada tentou login |
| `sem permissão CREATE_PROJECT` | Analista bloqueado ou sem permissão |
| `Permissão concedida` | Admin liberou acesso a um app |
| `Permissão revogada` | Admin removeu acesso |
| `Falha no cálculo de viabilidade` | Erro no motor financeiro |
| `Projeto criado e calculado` | Fluxo completo bem-sucedido |
| `Projeto criado como rascunho` | Analista salvou sem calcular |

### Segurança nos logs — o que NUNCA logar

O `lib/logger.ts` aplica automaticamente:

- **Mascaramento de e-mail**: `jo***@uisa.com.br`
- **Redact de campos sensíveis**: `password`, `token`, `secret`, `api_key`, `access_token`, `refresh_token` → `[REDACTED]`
- **Stack trace**: apenas em `ERROR`, nunca com dados do usuário

> ❌ Nunca adicione ao logger: senhas, tokens JWT, chaves de API, payloads completos de integrações, CPF ou dados pessoais completos.

### Centralização em produção (recomendado)

O logger escreve em `stdout`/`stderr` — padrão 12-factor. Integ com:

| Plataforma | Como integrar |
|------------|---------------|
| **Vercel** | Logs disponíveis nativamente no dashboard |
| **Datadog** | Instalar agente, apontar para stdout do PM2 |
| **Grafana Loki** | Usar `promtail` lendo logs do PM2 |
| **CloudWatch (AWS)** | Usar `awslogs` driver no Docker |
| **ELK Stack** | Filebeat lendo `~/.pm2/logs/*.log` |

---

## Monitoramento e Saúde

### Verificação rápida de saúde

```bash
# Verificar se o servidor responde
curl -I https://plataforma.uisa.com.br

# Verificar status do PM2
pm2 status
pm2 logs uisa-plataforma --lines 50

# Verificar banco
npx prisma db execute --url $DATABASE_URL --stdin <<< "SELECT COUNT(*) FROM users;"
```

### Sinais de alerta

| Sintoma | Provável causa |
|---------|---------------|
| Login retorna erro 500 | Banco fora do ar ou `NEXTAUTH_SECRET` errado |
| Magic link não chega | Configuração SMTP incorreta |
| "Sem acesso" após login | Usuário não existe no banco / `isActive = false` |
| Build falha com erro de tipos | Schema Prisma desatualizado (rodar `db:generate`) |
| Página em branco / 500 | Ver logs do PM2 ou Vercel |

---

## Playbooks de Incidentes

### 🚨 Usuário não consegue fazer login

```
1. Verificar se o e-mail termina em @uisa.com.br
2. Verificar se o usuário existe: SELECT * FROM users WHERE email = '...';
3. Verificar se isActive = true
4. Em dev: verificar se o magic link está aparecendo no terminal
5. Em prod: verificar logs do servidor para erros SMTP
6. Se o usuário não existe: npm run db:seed OU criar via /admin/usuarios
```

### 🚨 Usuário perdeu acesso a um app

```
1. Acessar /admin/usuarios como ADMIN
2. Encontrar o usuário e expandir o painel de acessos
3. Verificar se o AppRole está como "Sem acesso"
4. Selecionar o papel correto no dropdown → salva automaticamente
5. Pedir para o usuário recarregar a página
```

### 🚨 Cálculo de viabilidade não está executando

```
1. Verificar o perfil do usuário — ANALISTA não pode calcular
2. Se for Moderador: verificar no console do browser se há erro na chamada API
3. Verificar no banco se o projeto foi salvo como DRAFT (sem results)
4. Acessar /api/projects com GET e verificar se a rota responde
5. Verificar logs do servidor para erros em calcularFluxo()
```

### 🚨 Banco de dados inacessível

```
1. Verificar a string DATABASE_URL no .env
2. SQLite (dev): verificar se prisma/dev.db existe — se não, rodar db:push + db:seed
3. PostgreSQL (prod): verificar se o serviço está ativo: pg_isready -h host -p 5432
4. Verificar se as credenciais no .env estão corretas
5. Rodar: npx prisma migrate deploy (pode haver migração pendente)
```

### 🚨 Deploy falhou — como reverter rapidamente

```
Vercel:
  vercel ls → copiar URL do deployment anterior → vercel alias <url> <domínio>

Servidor próprio:
  git stash → git checkout <último-commit-ok> → npm run build → pm2 reload
```

---

## Variáveis de Ambiente — Checklist

Use esta lista antes de qualquer deploy para confirmar que tudo está configurado:

```
✅ DATABASE_URL          → URL do banco (não pode ser file: em produção)
✅ NEXTAUTH_SECRET       → String aleatória longa (min 32 chars)
✅ NEXTAUTH_URL          → URL completa do servidor (https://...)
✅ ALLOWED_EMAIL_DOMAIN  → Domínio corporativo (ex: uisa.com.br)
✅ EMAIL_SERVER_HOST     → Servidor SMTP
✅ EMAIL_SERVER_PORT     → 587 (TLS) ou 465 (SSL)
✅ EMAIL_SERVER_USER     → Usuário SMTP
✅ EMAIL_SERVER_PASS     → Senha SMTP
✅ EMAIL_FROM            → Ex: noreply@uisa.com.br

Logs:
✅ LOG_LEVEL             → INFO (prod) | DEBUG (dev)

Opcionais:
⚪ ANTHROPIC_API_KEY     → Apenas quando análise via IA for implementada
⚪ NEXT_PUBLIC_ALLOWED_DOMAIN → Só se quiser exibir o domínio na tela de login
```

### Gerar NEXTAUTH_SECRET

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
