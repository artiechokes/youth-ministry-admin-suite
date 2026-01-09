import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { StaffArchiveActions } from '../ArchiveActions';

// Archived staff roster.
export default async function ArchivedStaffRoster() {
  const session = await requirePermission('staff_view');

  const users = await prisma.user.findMany({
    where: { archivedAt: { not: null } },
    orderBy: [{ archivedAt: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }]
  });

  const getDisplayName = (user: typeof users[number]) => {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || user.username || 'Unnamed';
  };

  const permissions =
    session.role === 'ADMIN'
      ? null
      : normalizePermissions(
          (
            await prisma.user.findUnique({
              where: { id: session.id },
              select: { permissionsJson: true }
            })
          )?.permissionsJson
        );

  const canManage = session.role === 'ADMIN' || (permissions ? hasPermission(permissions, 'staff_manage') : false);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Archived Staff</h1>
          <p className="muted">Staff accounts that have been archived.</p>
        </div>
      </section>

      <section className="card">
        <Link href="/admin/staff/roster">
          <button className="secondary">Back to Staff Roster</button>
        </Link>
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Archived</th>
              <th>Reason</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={user.role === 'ADMIN' ? 'staff-admin' : undefined}>
                <td>{getDisplayName(user)}</td>
                <td>{user.role}</td>
                <td>{user.archivedAt ? new Date(user.archivedAt).toLocaleDateString() : '-'}</td>
                <td>{user.archivedReason ?? '-'}</td>
                <td>
                  {canManage && (
                    <StaffArchiveActions staffId={user.id} staffName={getDisplayName(user)} archived />
                  )}
                </td>
                <td>
                  <Link className="secondary" href={`/admin/staff/roster/${user.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={6} className="muted">
                  No archived staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
