import { db } from '@/lib/db'

export type AppRole    = 'VISUALIZADOR' | 'ANALISTA' | 'MODERADOR' | 'ADMIN_APP'
export type GlobalRole = 'USER' | 'ADMIN'

// ── Nível 1: Verificar acesso ao app ─────────────────────────

export async function getUserAppPermission(
  userId: string,
  appSlug: string
): Promise<{ appRole: AppRole } | null> {
  // Admin global tem acesso a tudo automaticamente
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { globalRole: true, isActive: true },
  })
  if (!user || !user.isActive) return null
  if (user.globalRole === 'ADMIN') {
    return { appRole: 'ADMIN_APP' }
  }

  const app = await db.app.findUnique({ where: { slug: appSlug } })
  if (!app || !app.ativo) return null

  const permission = await db.appPermission.findUnique({
    where:   { userId_appId: { userId, appId: app.id } },
    select:  { appRole: true, isActive: true, expiresAt: true },
  })
  if (!permission || !permission.isActive) return null
  if (permission.expiresAt && permission.expiresAt < new Date()) return null

  return { appRole: permission.appRole as AppRole }
}

// ── Nível 2: Verificar ação dentro do app ────────────────────

export function canDoAction(appRole: AppRole, action: AppAction): boolean {
  const matrix: Record<AppAction, AppRole[]> = {
    // Leitura
    VIEW_PROJECTS:        ['VISUALIZADOR','ANALISTA','MODERADOR','ADMIN_APP'],
    // Edição própria
    CREATE_PROJECT:       ['ANALISTA','MODERADOR','ADMIN_APP'],
    EDIT_OWN_PROJECT:     ['ANALISTA','MODERADOR','ADMIN_APP'],
    DELETE_OWN_PROJECT:   ['ANALISTA','MODERADOR','ADMIN_APP'],
    EXPORT_PROJECT:       ['ANALISTA','MODERADOR','ADMIN_APP'],
    // Moderador
    VIEW_ALL_PROJECTS:    ['MODERADOR','ADMIN_APP'],
    EDIT_ANY_PROJECT:     ['MODERADOR','ADMIN_APP'],
    DELETE_ANY_PROJECT:   ['MODERADOR','ADMIN_APP'],
    EDIT_PREMISES:        ['MODERADOR','ADMIN_APP'],
    ACCESS_ADV_SENSITIVITY:['MODERADOR','ADMIN_APP'],
    GENERATE_AI_ANALYSIS: ['MODERADOR','ADMIN_APP'],
    CALCULATE_PROJECT:    ['MODERADOR','ADMIN_APP'],   // ← nova regra
    // Admin app
    MANAGE_APP_USERS:     ['ADMIN_APP'],
  }
  return matrix[action]?.includes(appRole) ?? false
}

export type AppAction =
  | 'VIEW_PROJECTS'
  | 'CREATE_PROJECT'
  | 'EDIT_OWN_PROJECT'
  | 'DELETE_OWN_PROJECT'
  | 'EXPORT_PROJECT'
  | 'VIEW_ALL_PROJECTS'
  | 'EDIT_ANY_PROJECT'
  | 'DELETE_ANY_PROJECT'
  | 'EDIT_PREMISES'
  | 'ACCESS_ADV_SENSITIVITY'
  | 'GENERATE_AI_ANALYSIS'
  | 'CALCULATE_PROJECT'
  | 'MANAGE_APP_USERS'

// ── Helpers de verificação de role ───────────────────────────

export const isModerador  = (r: AppRole) => ['MODERADOR','ADMIN_APP'].includes(r)
export const isAdminApp   = (r: AppRole) => r === 'ADMIN_APP'
export const isAdminGlobal = (r: GlobalRole) => r === 'ADMIN'

// ── Carregar todos os apps com status para o portal ──────────

export async function getAppsWithStatus(userId: string) {
  const [apps, permissions, user] = await Promise.all([
    db.app.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }),
    db.appPermission.findMany({
      where:  { userId, isActive: true },
      select: { appId: true, appRole: true, expiresAt: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { globalRole: true } }),
  ])

  const isGlobalAdmin = user?.globalRole === 'ADMIN'
  const permMap = new Map(permissions.map(p => [p.appId, p]))

  return apps.map(app => {
    if (isGlobalAdmin) {
      return { ...app, hasAccess: true, appRole: 'ADMIN_APP' as AppRole }
    }
    const perm = permMap.get(app.id)
    const expired = perm?.expiresAt && perm.expiresAt < new Date()
    const hasAccess = !!perm && !expired
    return { ...app, hasAccess, appRole: perm?.appRole ?? null }
  })
}
