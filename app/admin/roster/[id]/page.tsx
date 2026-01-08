import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { TeenDetailForm } from './teen-detail';
import { ArchiveActions } from '../ArchiveActions';
import { autoArchiveAdults } from '@/lib/teen';

// Server component fetches teen info then renders the editable form.
export default async function TeenDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  await autoArchiveAdults(prisma);

  const resolvedParams = await Promise.resolve(params);
  const teenId = resolvedParams?.id;

  if (!teenId) {
    return (
      <div className="card">
        <h1>Teen not found</h1>
        <p className="muted">The roster link is missing an ID.</p>
        <Link className="secondary" href="/admin/roster">
          Back to Roster
        </Link>
      </div>
    );
  }

  const teen = await prisma.teen.findUnique({
    where: { id: teenId },
    include: {
      attendanceRecords: { orderBy: { checkInAt: 'desc' } }
    }
  });

  if (!teen) {
    return (
      <div className="card">
        <h1>Teen not found</h1>
        <p className="muted">We could not find this student in the database.</p>
        <Link className="secondary" href="/admin/roster">
          Back to Roster
        </Link>
      </div>
    );
  }

  const teenFormData = {
    id: teen.id,
    firstName: teen.firstName,
    lastName: teen.lastName,
    dob: teen.dob.toISOString().slice(0, 10),
    teenEmail: teen.email ?? '',
    teenPhone: teen.phone ?? '',
    addressLine1: teen.addressLine1 ?? '',
    addressLine2: teen.addressLine2 ?? '',
    city: teen.city ?? '',
    state: teen.state ?? '',
    postalCode: teen.postalCode ?? '',
    parish: teen.parish ?? '',
    emergencyContactName: teen.emergencyContactName ?? '',
    emergencyContactPhone: teen.emergencyContactPhone ?? '',
    parentName: teen.parentName ?? '',
    parentEmail: teen.parentEmail ?? '',
    parentPhone: teen.parentPhone ?? '',
    parentRelationship: teen.parentRelationship ?? '',
    registrationStatus: teen.registrationStatus,
    registrationDataJson: teen.registrationDataJson ? JSON.stringify(teen.registrationDataJson, null, 2) : ''
  };

  const attendanceRows = teen.attendanceRecords.map((record) => ({
    id: record.id,
    date: new Date(record.checkInAt).toLocaleDateString(),
    timeIn: new Date(record.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timeOut: record.checkOutAt
      ? new Date(record.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '-'
  }));

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>{`${teen.firstName} ${teen.lastName}`}</h1>
          <p className="muted">{teen.parentEmail ?? 'No parent email on file'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ArchiveActions teenId={teen.id} teenName={`${teen.firstName} ${teen.lastName}`} archived={Boolean(teen.archivedAt)} />
          <Link className="secondary" href="/admin/roster">
            Back to Roster
          </Link>
        </div>
      </div>
      <TeenDetailForm teen={teenFormData} />
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Attendance History</h2>
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.timeIn}</td>
                <td>{row.timeOut}</td>
              </tr>
            ))}
            {!attendanceRows.length && (
              <tr>
                <td colSpan={3} className="muted">
                  No attendance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
