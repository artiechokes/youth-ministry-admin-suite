import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { StaffArchiveActions } from '../ArchiveActions';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { StaffDetailForm } from './staff-detail';

// Server component fetches staff info then renders the editable form.
export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePermission('staff_view');

  const resolvedParams = await Promise.resolve(params);
  const staffId = resolvedParams?.id;

  if (!staffId) {
    return (
      <div className="card">
        <h1>Staff not found</h1>
        <p className="muted">The roster link is missing an ID.</p>
        <Link className="secondary" href="/admin/staff/roster">
          Back to Staff Roster
        </Link>
      </div>
    );
  }

  const staff = await prisma.user.findUnique({ where: { id: staffId } });

  if (!staff) {
    notFound();
  }

  const staffData = {
    id: staff.id,
    firstName: staff.firstName ?? '',
    lastName: staff.lastName ?? '',
    displayName: staff.displayName ?? '',
    title: staff.title ?? '',
    phone: staff.phone ?? '',
    email: staff.email ?? '',
    bio: staff.bio ?? '',
    role: staff.role
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

  const canEdit = session.role === 'ADMIN' || (permissions ? hasPermission(permissions, 'staff_edit') : false);
  const canManage = session.role === 'ADMIN' || (permissions ? hasPermission(permissions, 'staff_manage') : false);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>{`${staffData.firstName} ${staffData.lastName}`.trim() || 'Staff Profile'}</h1>
          <p className="muted">{staffData.email || staffData.role}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && (
            <StaffArchiveActions
              staffId={staffData.id}
              staffName={`${staffData.firstName} ${staffData.lastName}`.trim() || 'Staff Profile'}
              archived={Boolean(staff.archivedAt)}
            />
          )}
          <Link className="secondary" href="/admin/staff/roster">
            Back to Staff Roster
          </Link>
        </div>
      </div>
      <StaffDetailForm staff={staffData} canEdit={canEdit} />
    </div>
  );
}
