/**
 * UISA Logger — Sistema de Logging Estruturado
 *
 * Formato: JSON linha por linha (NDJSON)
 * Campos padrão: timestamp, level, service, environment,
 *                requestId, userId, route, durationMs, message
 *
 * Uso:
 *   import { logger } from '@/lib/logger'
 *   logger.info('Projeto criado', { projectId, userId, route: '/api/projects' })
 *   logger.error('Falha no cálculo', { error: e.message, projectId })
 *
 * Segurança:
 *   - E-mails são mascarados automaticamente: jo***@uisa.com.br
 *   - Campos sensíveis (token, password, secret) são omitidos
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogContext {
  requestId?:    string
  userId?:       string
  route?:        string
  method?:       string
  statusCode?:   number
  durationMs?:   number
  appSlug?:      string
  projectId?:    string
  resourceType?: string
  resourceId?:   string
  error?:        string
  stack?:        string
  [key: string]: unknown
}

// ── Campos que NUNCA devem aparecer nos logs ──────────────────
const REDACTED_KEYS = new Set([
  'password', 'senha', 'token', 'secret', 'authorization',
  'access_token', 'refresh_token', 'id_token', 'api_key',
  'apikey', 'NEXTAUTH_SECRET', 'EMAIL_SERVER_PASS',
])

// ── Mascaramento de dados sensíveis ───────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const masked = local.length <= 2
    ? '***'
    : local[0] + local[1] + '***'
  return `${masked}@${domain}`
}

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]'
    } else if (typeof val === 'string' && val.includes('@') && val.includes('.')) {
      // Provavelmente é e-mail — mascarar
      result[key] = maskEmail(val)
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = sanitize(val as Record<string, unknown>)
    } else {
      result[key] = val
    }
  }
  return result
}

// ── Níveis ativos por ambiente ────────────────────────────────

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
}

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toUpperCase() as LogLevel
  if (env && LEVEL_PRIORITY[env] !== undefined) return env
  return process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'
}

// ── Formatação ────────────────────────────────────────────────

function buildEntry(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): string {
  const { error: errMsg, stack, ...rest } = context
  const sanitized = sanitize(rest as Record<string, unknown>)

  const entry: Record<string, unknown> = {
    timestamp:   new Date().toISOString(),
    level,
    service:     'uisa-plataforma',
    environment: process.env.NODE_ENV ?? 'development',
    message,
    ...sanitized,
  }

  if (errMsg)  entry.error = errMsg
  if (stack && level === 'ERROR') entry.stack = stack

  return JSON.stringify(entry)
}

// ── Função de output ─────────────────────────────────────────

function emit(level: LogLevel, message: string, context: LogContext = {}) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[getMinLevel()]) return

  const line = buildEntry(level, message, context)

  if (level === 'ERROR' || level === 'WARN') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

// ── API pública ───────────────────────────────────────────────

export const logger = {
  debug: (message: string, ctx?: LogContext) => emit('DEBUG', message, ctx),
  info:  (message: string, ctx?: LogContext) => emit('INFO',  message, ctx),
  warn:  (message: string, ctx?: LogContext) => emit('WARN',  message, ctx),
  error: (message: string, ctx?: LogContext) => emit('ERROR', message, ctx),
}

// ── Utilitário para rotas de API ─────────────────────────────
// Uso: const { reqId, logReq } = initRequest(req)

export function initRequest(req: { method?: string; url?: string; headers?: Record<string, string | string[] | undefined> }) {
  const reqId = crypto.randomUUID().slice(0, 8)
  const route = req.url?.split('?')[0] ?? 'unknown'
  const start = Date.now()

  function logReq(
    level: LogLevel,
    message: string,
    extra: LogContext = {}
  ) {
    emit(level, message, {
      requestId: reqId,
      method:    req.method,
      route,
      durationMs: Date.now() - start,
      ...extra,
    })
  }

  return { reqId, logReq, route, start }
}

// ── Mascaramento de e-mail (exportado para uso externo) ──────
export { maskEmail }
