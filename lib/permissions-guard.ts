import { Role } from '@prisma/client';
import { prisma } from './db';
import { getSessionUser } from './auth';
import { hasPermission, normalizePermissions, type Permission } from './permissions';

const allowedRoles = new Set<Role>([Role.ADMIN, Role.STAFF]);

// Shared staff permission check for API routes.
export async function requireStaffPermission(permission: Permission) {
  const user = await getSessionUser();
  if (!user?.role || !user?.id || !allowedRoles.has(user.role as Role)) {
    return null;
  }
  if (user.role === Role.ADMIN) return user;

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  const permissions = normalizePermissions(record?.permissionsJson);
  if (!hasPermission(permissions, permission)) {
    return null;
  }
  return user;
}
