import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { StaffManager } from './staff-manager';

// Staff management page with permission toggles.
export default async function StaffPage() {
  await requirePermission('staff_manage');

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const staff = users.map((user) => ({
    id: user.id,
    email: user.email ?? '',
    username: user.username ?? '',
    role: user.role,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    title: user.title ?? '',
    phone: user.phone ?? '',
    permissions: Array.isArray(user.permissionsJson) ? user.permissionsJson : []
  }));

  return <StaffManager users={staff} />;
}
