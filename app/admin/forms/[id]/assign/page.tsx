import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { FormAssign } from '../../form-assign';

export default async function FormAssignPage({ params }: { params: { id: string } }) {
  await requirePermission('forms_edit');

  const resolvedParams = await Promise.resolve(params);
  const formId = resolvedParams?.id;
  if (!formId) {
    notFound();
  }

  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) {
    notFound();
  }

  const teens = await prisma.teen.findMany({
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true, parentEmail: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  });

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Assign {form.name}</h1>
          <p className="muted">Select one or more teens to assign this form.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="secondary" href={`/admin/forms/${form.id}`}>
            Back to Form
          </Link>
          <Link className="secondary" href="/admin/forms">
            Back to Forms
          </Link>
        </div>
      </section>
      <FormAssign formId={form.id} teens={teens} />
    </div>
  );
}
