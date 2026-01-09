import Link from 'next/link';
import { requirePermission } from '@/lib/auth';
import { FormCreate } from '../form-create';

export default async function CreateFormPage() {
  await requirePermission('forms_edit');

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Create Form</h1>
          <p className="muted">Define the form details first. Add fields on the edit screen.</p>
        </div>
        <Link className="secondary" href="/admin/forms">
          Back to Forms
        </Link>
      </section>
      <FormCreate />
    </div>
  );
}
