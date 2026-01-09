import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { StaffArchiveActions } from './ArchiveActions';

// Read-only staff roster page.
export default async function StaffRosterPage() {
  const session = await requirePermission('staff_view');

  const users = await prisma.user.findMany({
    where: { archivedAt: null },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }]
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
          <h1>Staff Roster</h1>
          <p className="muted">Directory of admin and staff accounts.</p>
        </div>
      </section>

      <section className="card">
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/staff">
            <button className="secondary">Back to Staff Management</button>
          </Link>
          <Link href="/admin/staff/roster/archived">
            <button className="secondary">Archived Staff</button>
          </Link>
        </div>
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Title</th>
              <th>Email</th>
              <th>Phone</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={user.role === 'ADMIN' ? 'staff-admin' : undefined}>
                <td>{getDisplayName(user)}</td>
                <td>{user.role}</td>
                <td>{user.title || '—'}</td>
                <td>{user.email || '—'}</td>
                <td>{user.phone || '—'}</td>
                <td>
                  {canManage && (
                    <StaffArchiveActions staffId={user.id} staffName={getDisplayName(user)} archived={Boolean(user.archivedAt)} />
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
                <td colSpan={7} className="muted">
                  No staff users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
