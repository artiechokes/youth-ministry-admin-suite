'use client';

import Link from 'next/link';

type FormDefinition = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  category?: string;
  validForValue: number | null;
  validForUnit: string | null;
  validUntil: string | null;
  fields: { id: string }[];
};

type Props = {
  forms: FormDefinition[];
  canEdit: boolean;
  canManage: boolean;
};

export function FormsList({ forms, canEdit, canManage }: Props) {
  return (
    <section className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2>Current Forms</h2>
          <p className="muted">View, edit, assign, or archive forms.</p>
        </div>
        {canEdit && (
          <Link href="/admin/forms/new">
            <button>Create Form</button>
          </Link>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Form</th>
              <th>Type</th>
              <th>Status</th>
              <th>Validity</th>
              <th>Fields</th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form.id}>
                <td>
                  <strong>{form.name}</strong>
                  <div className="muted">{form.description || 'No description'}</div>
                </td>
                <td>{formatCategory(form.category)}</td>
                <td>{form.status === 'ARCHIVED' ? 'Archived' : 'Active'}</td>
                <td>{formatValidity(form)}</td>
                <td>{form.fields.length}</td>
                <td>
                  <Link className="secondary" href={`/admin/forms/${form.id}`}>
                    View
                  </Link>
                </td>
                <td>
                  {canEdit ? (
                    <Link className="secondary" href={`/admin/forms/${form.id}?mode=edit`}>
                      Edit
                    </Link>
                  ) : null}
                </td>
                <td>
                  {canEdit ? (
                    <Link className="secondary" href={`/admin/forms/${form.id}/assign`}>
                      Assign
                    </Link>
                  ) : null}
                </td>
                <td>
                  {canManage ? <ArchiveButton formId={form.id} /> : null}
                </td>
              </tr>
            ))}
            {!forms.length && (
              <tr>
                <td colSpan={9} className="muted">
                  No forms created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatValidity(form: FormDefinition) {
  if (form.validUntil) {
    return `Until ${new Date(form.validUntil).toLocaleDateString()}`;
  }
  if (form.validForValue) {
    const unit = form.validForUnit?.toLowerCase() ?? 'days';
    return `For ${form.validForValue} ${unit}`;
  }
  return 'No expiration';
}

function formatCategory(value?: string) {
  switch (value) {
    case 'RELEASE':
      return 'Release';
    case 'EVENT':
      return 'Event';
    case 'MEDICAL':
      return 'Medical';
    default:
      return 'General';
  }
}

function ArchiveButton({ formId }: { formId: string }) {
  const archive = async () => {
    if (!confirm('Archive this form? It will no longer be assignable.')) return;
    await fetch(`/api/forms/${formId}`, { method: 'DELETE' });
    window.location.reload();
  };

  return (
    <button type="button" className="btn-archive" onClick={archive}>
      Archive
    </button>
  );
}
