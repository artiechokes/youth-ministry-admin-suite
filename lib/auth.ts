import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth-options';
import { prisma } from './db';
import { Permission, hasPermission, normalizePermissions } from './permissions';

// Pull the current session user for server-side checks.
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

// Basic guard for admin/staff-only pages.
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.role || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    redirect('/admin/login');
  }
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await getSessionUser();
  if (!user?.role || !user.id) {
    redirect('/admin/login');
  }

  if (user.role === 'ADMIN') {
    return user;
  }

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  const permissions = normalizePermissions(record?.permissionsJson);

  if (!hasPermission(permissions, permission)) {
    redirect('/admin/login');
  }

  return user;
}
