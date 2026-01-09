import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { autoArchiveAdults } from '@/lib/teen';
import { ArchiveActions } from '../ArchiveActions';
import { Prisma } from '@prisma/client';

// Archived roster for adults or manually archived teens.
export default async function ArchivedRoster({ searchParams }: { searchParams?: { search?: string } }) {
  const session = await requirePermission('roster_view');
  await autoArchiveAdults(prisma);

  const resolvedParams = await Promise.resolve(searchParams);
  const search = resolvedParams?.search?.trim();

  const where: Prisma.TeenWhereInput = {
    archivedAt: { not: null }
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { parentEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  const teens = await prisma.teen.findMany({
    where,
    orderBy: [{ archivedAt: 'desc' }, { lastName: 'asc' }]
  });

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

  const canManage = session.role === 'ADMIN' || (permissions ? hasPermission(permissions, 'roster_manage') : false);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Archived Teens</h1>
          <p className="muted">Adults or manually archived records.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="secondary" href="/admin/roster">
            Back to Roster
          </Link>
        </div>
      </div>
      <form method="get" className="grid" style={{ gap: 12, marginTop: 16 }}>
        <div>
          <label>Search</label>
          <input name="search" placeholder="Name or email" defaultValue={search ?? ''} />
        </div>
        <button type="submit">Filter</button>
      </form>
      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Teen</th>
            <th>Parent Email</th>
            <th>Archived</th>
            <th>Reason</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {teens.map((teen) => (
            <tr key={teen.id}>
              <td>{`${teen.firstName} ${teen.lastName}`}</td>
              <td>{teen.parentEmail ?? '-'}</td>
              <td>{teen.archivedAt ? new Date(teen.archivedAt).toLocaleDateString() : '-'}</td>
              <td>{teen.archivedReason ?? '-'}</td>
              <td>
                {canManage && <ArchiveActions teenId={teen.id} teenName={`${teen.firstName} ${teen.lastName}`} archived />}
              </td>
              <td>
                <Link className="secondary" href={`/admin/roster/${teen.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
          {!teens.length && (
            <tr>
              <td colSpan={6} className="muted">
                No archived teens found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
