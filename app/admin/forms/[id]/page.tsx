import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { FormDetail } from '../form-detail';

export default async function FormDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { mode?: string };
}) {
  const session = await requirePermission('forms_view');

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const formId = resolvedParams?.id;
  if (!formId) {
    notFound();
  }

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      fields: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!form) {
    notFound();
  }

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

  const serializedForm = {
    ...form,
    validUntil: form.validUntil ? form.validUntil.toISOString() : null
  };

  const mode = resolvedSearchParams?.mode === 'edit' ? 'edit' : 'view';

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Form Details</h1>
          <p className="muted">Review the form definition or update fields.</p>
        </div>
        <Link className="secondary" href="/admin/forms">
          Back to Forms
        </Link>
      </section>
      <FormDetail form={serializedForm} canEdit={canEdit} canManage={canManage} initialMode={mode} />
    </div>
  );
}
