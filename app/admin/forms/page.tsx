import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { FormsList } from './forms-list';

export default async function FormsPage() {
  const session = await requirePermission('forms_view');

  const forms = await prisma.form.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fields: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' }
      }
    }
  });

  const serializedForms = forms.map((form) => ({
    ...form,
    validUntil: form.validUntil ? form.validUntil.toISOString() : null
  }));

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

  const canEdit = session.role === 'ADMIN' || (permissions ? hasPermission(permissions, 'forms_edit') : false);
  const canManage = session.role === 'ADMIN' || (permissions ? hasPermission(permissions, 'forms_manage') : false);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Forms</h1>
          <p className="muted">Create custom forms, assign them to teens, and track expirations.</p>
        </div>
        <Link className="secondary" href="/admin">
          Back to Admin
        </Link>
      </section>
      <FormsList forms={serializedForms} canEdit={canEdit} canManage={canManage} />
    </div>
  );
}
