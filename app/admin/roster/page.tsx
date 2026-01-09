import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { RegistrationStatus, Prisma } from '@prisma/client';
import { ArchiveActions } from './ArchiveActions';
import { autoArchiveAdults } from '@/lib/teen';

type Props = {
  searchParams?: { search?: string; status?: string };
};

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: RegistrationStatus.PENDING_PARENT_VERIFICATION, label: 'Pending parent verification' },
  { value: RegistrationStatus.PENDING_ADDITIONAL_INFO, label: 'Pending additional info' },
  { value: RegistrationStatus.COMPLETE, label: 'Complete' }
];

// Server-rendered roster so staff can filter without client-side state.
export default async function AdminRoster({ searchParams }: Props) {
  const session = await requirePermission('roster_view');
  await autoArchiveAdults(prisma);

  const resolvedParams = await Promise.resolve(searchParams);
  const search = resolvedParams?.search?.trim();
  const status = resolvedParams?.status;
  const statusFilter = Object.values(RegistrationStatus).includes(status as RegistrationStatus)
    ? (status as RegistrationStatus)
    : undefined;

  const where: Prisma.TeenWhereInput = {};

  where.archivedAt = null;

  if (statusFilter) {
    where.registrationStatus = statusFilter;
  }

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
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
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
        <h1>Youth Roster</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="secondary" href="/admin/roster/archived">
            Archived
          </Link>
          <Link className="secondary" href="/admin">
            Back to Admin
          </Link>
        </div>
      </div>
      <form method="get" className="grid" style={{ gap: 12, marginTop: 16 }}>
        <div className="grid two">
          <div>
            <label>Search</label>
            <input name="search" placeholder="Name or email" defaultValue={search ?? ''} />
          </div>
          <div>
            <label>Status</label>
            <select name="status" defaultValue={statusFilter ?? ''}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit">Filter</button>
      </form>
      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Teen</th>
            <th>Parent Email</th>
            <th>Status</th>
            <th>Updated</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {teens.map((teen) => (
            <tr key={teen.id}>
              <td>{`${teen.firstName} ${teen.lastName}`}</td>
              <td>{teen.parentEmail ?? '-'}</td>
              <td>{teen.registrationStatus.replace(/_/g, ' ').toLowerCase()}</td>
              <td>{new Date(teen.updatedAt).toLocaleDateString()}</td>
              <td>{teen.archivedAt ? <span className="badge-archived">Archived</span> : null}</td>
              <td>
                {canManage && (
                  <ArchiveActions teenId={teen.id} teenName={`${teen.firstName} ${teen.lastName}`} archived={false} />
                )}
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
              <td colSpan={7} className="muted">
                No teens found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
