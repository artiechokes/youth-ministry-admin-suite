'use client';

import { FormEvent, type ChangeEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  helpText: string | null;
  optionsJson: unknown;
};

type FormDefinition = {
  id: string;
  name: string;
  description: string | null;
  validForValue: number | null;
  validForUnit: string | null;
  validUntil: string | null;
  status: string;
  fields: FormField[];
};

type FormSubmission = {
  id: string;
  submittedAt: string;
  expiresAt: string | null;
  dataJson: Record<string, unknown> | null;
};

type FormAssignment = {
  id: string;
  formId: string;
  dueAt: string | null;
  required: boolean;
  createdAt: string;
  completedAt: string | null;
  teen: TeenInfo;
  form: FormDefinition;
  submissions: FormSubmission[];
};

type TeenInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  dob: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  parish: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  parentRelationship: string | null;
};

type Props = {
  teenId: string;
  canView: boolean;
  canEdit: boolean;
};

export function TeenFormsPanel({ teenId, canView, canEdit }: Props) {
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [assignFormId, setAssignFormId] = useState('');
  const [assignDueAt, setAssignDueAt] = useState('');
  const [assignRequired, setAssignRequired] = useState(true);

  const loadData = async () => {
    if (!canView) return;
    setStatus('loading');
    setMessage('');

    try {
      const [assignmentsRes, formsRes] = await Promise.all([
        fetch(`/api/teens/${teenId}/forms`),
        fetch('/api/forms')
      ]);

      if (!assignmentsRes.ok) throw new Error('Unable to load assignments');
      if (!formsRes.ok) throw new Error('Unable to load forms');

      const assignmentsData = await assignmentsRes.json();
      const formsData = await formsRes.json();

      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setForms(Array.isArray(formsData) ? formsData : []);
      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to load forms.');
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teenId]);

  const activeForms = useMemo(() => forms.filter((form) => form.status === 'ACTIVE'), [forms]);

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !assignFormId) return;

    try {
      const response = await fetch('/api/forms/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teenId,
          formId: assignFormId,
          dueAt: assignDueAt || null,
          required: assignRequired
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error ?? 'Unable to assign form.');
        return;
      }

      await loadData();
      setAssignFormId('');
      setAssignDueAt('');
      setAssignRequired(true);
      setMessage('Form assigned.');
    } catch (error) {
      console.error(error);
      setMessage('Unable to assign form.');
    }
  };

  if (!canView) {
    return (
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Forms & Registrations</h2>
        <p className="muted">You do not have permission to view forms.</p>
      </section>
    );
  }

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h2>Forms & Registrations</h2>
      <p className="muted">Assign custom forms, track submissions, and renew expired paperwork.</p>

      {canEdit && (
        <form className="grid" style={{ gap: 12, marginTop: 16 }} onSubmit={handleAssign}>
          <div className="grid two">
            <div>
              <label>Assign form</label>
              <select value={assignFormId} onChange={(event) => setAssignFormId(event.target.value)}>
                <option value="">Select a form</option>
                {activeForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Due date</label>
              <input type="date" value={assignDueAt} onChange={(event) => setAssignDueAt(event.target.value)} />
            </div>
          </div>
          <div>
            <label>Required</label>
            <select value={assignRequired ? 'required' : 'optional'} onChange={(event) => setAssignRequired(event.target.value === 'required')}>
              <option value="required">Required</option>
              <option value="optional">Optional</option>
            </select>
          </div>
          <button type="submit">Assign form</button>
        </form>
      )}

      {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
      {status === 'loading' && <p className="muted" style={{ marginTop: 8 }}>Loading forms...</p>}
      {status === 'error' && <p className="muted" style={{ marginTop: 8 }}>Unable to load forms.</p>}

      <div className="grid" style={{ gap: 12, marginTop: 16 }}>
        {assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            canEdit={canEdit}
            onRemoved={(id) => setAssignments((prev) => prev.filter((item) => item.id !== id))}
            onUpdated={() => loadData()}
          />
        ))}
        {!assignments.length && status !== 'loading' && (
          <p className="muted">No forms assigned yet.</p>
        )}
      </div>
    </section>
  );
}

function AssignmentCard({
  assignment,
  canEdit,
  onRemoved,
  onUpdated
}: {
  assignment: FormAssignment;
  canEdit: boolean;
  onRemoved: (id: string) => void;
  onUpdated: () => void;
}) {
  const latest = assignment.submissions[0];
  const now = new Date();
  const dueAt = assignment.dueAt ? new Date(assignment.dueAt) : null;
  const expiresAt = latest?.expiresAt ? new Date(latest.expiresAt) : null;
  const completedAt = assignment.completedAt ? new Date(assignment.completedAt) : null;
  const hasSubmission = Boolean(latest);

  const status = (() => {
    if (latest) {
      if (expiresAt && expiresAt.getTime() < now.getTime()) return 'Expired';
      return 'Completed';
    }
    if (dueAt && dueAt.getTime() < now.getTime()) return 'Overdue';
    if (dueAt && dueAt.getTime() - now.getTime() < 7 * 86400000) return 'Due Soon';
    return 'Missing';
  })();

  const removeAssignment = async () => {
    if (!canEdit) return;
    if (!confirm('Unassign this form?')) return;
    const response = await fetch(`/api/forms/assignments/${assignment.id}`, { method: 'DELETE' });
    if (response.ok) {
      onRemoved(assignment.id);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h3>{assignment.form.name}</h3>
          <p className="muted">
            {status}
            {assignment.required ? ' · Required' : ' · Optional'}
            {formatValidity(assignment.form)}
          </p>
        </div>
        {canEdit && !hasSubmission && !completedAt && (
          <button type="button" className="secondary" onClick={removeAssignment}>
            Unassign
          </button>
        )}
      </div>
      {assignment.form.description && <p style={{ marginTop: 8 }}>{assignment.form.description}</p>}
      <div className="grid two" style={{ gap: 12, marginTop: 12 }}>
        <div>
          <strong>Due</strong>
          <p className="muted">{dueAt ? dueAt.toLocaleDateString() : 'No due date'}</p>
        </div>
        <div>
          <strong>Latest submission</strong>
          <p className="muted">
            {latest ? new Date(latest.submittedAt).toLocaleDateString() : 'Not submitted'}
            {completedAt ? ` · Completed ${completedAt.toLocaleDateString()}` : ''}
            {expiresAt ? ` · Expires ${expiresAt.toLocaleDateString()}` : ''}
          </p>
        </div>
      </div>
      {latest && (
        <SubmissionViewer assignment={assignment} submission={latest} />
      )}
      <SubmissionEditor assignment={assignment} canEdit={canEdit} onSubmitted={onUpdated} />
    </div>
  );
}

function SubmissionViewer({
  assignment,
  submission
}: {
  assignment: FormAssignment;
  submission: FormSubmission;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const variables = useMemo(() => buildVariableMap(assignment.teen), [assignment.teen]);

  const onPrint = () => {
    const printable = buildPrintableHtml(assignment, submission, variables);
    const printWindow = window.open('', 'print');
    if (!printWindow) return;
    printWindow.document.write(printable);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="secondary" onClick={() => setIsOpen((prev) => !prev)}>
          {isOpen ? 'Hide submission' : 'View submission'}
        </button>
        <button type="button" className="secondary" onClick={onPrint}>
          Print
        </button>
      </div>
      {isOpen && (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <h4>Submission Details</h4>
          <div className="grid two" style={{ gap: 8, marginTop: 8 }}>
            {assignment.form.fields.map((field) => (
              <div key={field.id}>
                <strong>{resolveVariables(field.label ?? '', variables, submission.dataJson ?? {})}</strong>
                <div className="muted">
                  {formatSubmissionValueForField(field, submission.dataJson ?? {}, variables)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionEditor({
  assignment,
  canEdit,
  onSubmitted
}: {
  assignment: FormAssignment;
  canEdit: boolean;
  onSubmitted: () => void;
}) {
  const latest = assignment.submissions[0];
  const completed = Boolean(latest);
  const variables = useMemo(() => buildVariableMap(assignment.teen), [assignment.teen]);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const [values, setValues] = useState<Record<string, any>>(() => normalizeSubmission(latest?.dataJson));

  useEffect(() => {
    setValues(normalizeSubmission(latest?.dataJson));
  }, [assignment.id, latest?.id]);

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const submit = async () => {
    if (!canEdit) return;
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/forms/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          dataJson: values
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(data?.error ?? 'Unable to save submission.');
        return;
      }

      setStatus('success');
      setMessage('Submission saved.');
      onSubmitted();
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to save submission.');
    }
  };

  if (!canEdit || completed) {
    return null;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" className="secondary" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? 'Close form' : latest ? 'Update submission' : 'Fill out form'}
      </button>
      {isOpen && (
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {assignment.form.fields.map((field) => (
            <div key={field.id}>
              {field.type === 'SECTION' ? (
                <div className="card" style={{ padding: 12, borderLeft: '4px solid var(--accent)' }}>
                  <strong>
                    <VariableText text={field.label} variables={variables} values={values} onChange={handleChange} />
                  </strong>
                  {field.helpText && (
                    <p className="muted" style={{ marginTop: 6 }}>
                      <VariableText text={field.helpText} variables={variables} values={values} onChange={handleChange} />
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <label>
                    <VariableText text={field.label} variables={variables} values={values} onChange={handleChange} />
                  </label>
                  {field.helpText && (
                    <p className="muted">
                      <VariableText text={field.helpText} variables={variables} values={values} onChange={handleChange} />
                    </p>
                  )}
                  {renderField(field, values, handleChange)}
                </>
              )}
            </div>
          ))}
          <button type="button" onClick={submit} disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Save submission'}
          </button>
          {message && <p className={status === 'error' ? 'muted' : ''}>{message}</p>}
        </div>
      )}
    </div>
  );
}

function normalizeSubmission(data: unknown) {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, any>;
  }
  return {};
}

function formatSubmissionValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.join(', ') || '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatSubmissionValueForField(field: FormField, data: Record<string, any>, variables: Record<string, string>) {
  const raw = data[field.id];
  if (field.type === 'SIGNATURE' && raw && typeof raw === 'object') {
    const mode = raw?.mode;
    if (mode === 'type') return raw.value || '-';
    if (mode === 'draw') return 'Signature (drawn)';
  }
  if (field.type === 'SECTION') {
    const body = field.helpText ? resolveVariables(field.helpText, variables, data) : '';
    const title = field.label ? resolveVariables(field.label, variables, data) : '';
    return `${title}${body ? ` — ${body}` : ''}`.trim();
  }
  if ((field.type === 'SELECT' || field.type === 'MULTI_SELECT' || field.type === 'CHECKBOX') && raw) {
    const { allowOther } = getFieldOptions(field);
    if (allowOther) {
      const otherKey = `${field.id}__other`;
      const otherValue = data[otherKey];
      if (Array.isArray(raw) && raw.includes('__other__')) {
        return [...raw.filter((item) => item !== '__other__'), otherValue].filter(Boolean).join(', ') || '-';
      }
      if (raw === '__other__') {
        return otherValue || '-';
      }
    }
  }
  return formatSubmissionValue(raw);
}

function buildPrintableHtml(
  assignment: FormAssignment,
  submission: FormSubmission,
  variables: Record<string, string>
) {
  const rows = assignment.form.fields
    .map((field) => {
      if (field.type === 'SECTION') {
        const title = escapeHtml(resolveVariables(field.label ?? '', variables, submission.dataJson ?? {}));
        const body = escapeHtml(resolveVariables(field.helpText ?? '', variables, submission.dataJson ?? {}));
        return `<tr><td colspan="2"><strong>${title}</strong><div style="margin-top:4px;">${body}</div></td></tr>`;
      }
      const value = getPrintableValue(field, submission.dataJson ?? {}, variables);
      const label = escapeHtml(resolveVariables(field.label ?? '', variables, submission.dataJson ?? {}));
      return `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(assignment.form.name)} Submission</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1f1d19; }
      h1 { margin-bottom: 4px; }
      p { margin-top: 0; color: #6b6560; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      td { border-bottom: 1px solid #e5e1da; padding: 8px 0; vertical-align: top; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(assignment.form.name)}</h1>
    <p>Submitted ${escapeHtml(new Date(submission.submittedAt).toLocaleDateString())}</p>
    <table>${rows}</table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getPrintableValue(field: FormField, data: Record<string, any>, variables: Record<string, string>) {
  if (field.type === 'SIGNATURE') {
    const raw = data[field.id];
    if (raw?.mode === 'draw' && raw.dataUrl) {
      return `<img src="${raw.dataUrl}" alt="Signature" style="max-width:240px;max-height:140px;" />`;
    }
  }
  return escapeHtml(formatSubmissionValueForField(field, data, variables));
}

function formatValidity(form: FormDefinition) {
  if (form.validUntil) {
    return ` · Valid until ${new Date(form.validUntil).toLocaleDateString()}`;
  }
  if (form.validForValue) {
    const unit = form.validForUnit?.toLowerCase() ?? 'days';
    return ` · Valid ${form.validForValue} ${unit}`;
  }
  return '';
}

function buildVariableMap(teen: TeenInfo) {
  const name = [teen.firstName, teen.lastName].filter(Boolean).join(' ');
  return {
    parentName: teen.parentName ?? '',
    parentEmail: teen.parentEmail ?? '',
    parentPhone: teen.parentPhone ?? '',
    parentRelationship: teen.parentRelationship ?? '',
    studentName: name,
    studentFirstName: teen.firstName ?? '',
    studentLastName: teen.lastName ?? '',
    studentEmail: teen.email ?? '',
    studentPhone: teen.phone ?? '',
    dob: teen.dob ? new Date(teen.dob).toLocaleDateString() : '',
    addressLine1: teen.addressLine1 ?? '',
    addressLine2: teen.addressLine2 ?? '',
    city: teen.city ?? '',
    state: teen.state ?? '',
    postalCode: teen.postalCode ?? '',
    parish: teen.parish ?? '',
    emergencyContactName: teen.emergencyContactName ?? '',
    emergencyContactPhone: teen.emergencyContactPhone ?? '',
    eventName: '',
    eventDate: '',
    eventLocation: ''
  };
}

function resolveVariables(text: string, variables: Record<string, string>, data: Record<string, any>) {
  return text.replace(/\$([a-zA-Z][\w]*)/g, (_, key: string) => {
    const overrides = data.__vars__ ?? {};
    const overrideValue = overrides[key];
    if (typeof overrideValue === 'string' && overrideValue.length) return overrideValue;
    return variables[key] ?? '';
  });
}

function VariableText({
  text,
  variables,
  values,
  onChange
}: {
  text: string;
  variables: Record<string, string>;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const tokens = text.split(/(\$[a-zA-Z][\w]*)/g).filter(Boolean);
  const overrides = (values.__vars__ ?? {}) as Record<string, string>;

  const setOverride = (key: string, value: string) => {
    onChange('__vars__', { ...overrides, [key]: value });
  };

  return (
    <>
      {tokens.map((token, index) => {
        if (!token.startsWith('$')) return <span key={index}>{token}</span>;
        const key = token.slice(1);
        const resolved = overrides[key] || variables[key] || '';
        return (
          <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <strong>{resolved || `(${key})`}</strong>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const next = prompt(`Override ${key}`, resolved);
                if (next !== null) setOverride(key, next);
              }}
            >
              Edit
            </button>
          </span>
        );
      })}
    </>
  );
}

function renderField(
  field: FormField,
  values: Record<string, any>,
  onChange: (key: string, value: any) => void
) {
  if (field.type === 'SECTION') {
    return null;
  }
  const value = values[field.id];
  const commonProps = {
    value: value ?? '',
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(field.id, event.target.value)
  };

  switch (field.type) {
    case 'LONG_TEXT':
      return <textarea rows={4} {...commonProps} />;
    case 'NUMBER':
      return <input type="number" {...commonProps} />;
    case 'DATE':
      return <input type="date" {...commonProps} />;
    case 'EMAIL':
      return <input type="email" {...commonProps} />;
    case 'PHONE':
      return <input type="tel" inputMode="numeric" placeholder="5551234567" {...commonProps} />;
    case 'CHECKBOX':
      return renderCheckboxGroup(field, values, onChange);
    case 'SELECT':
      return renderSelect(field, values, onChange);
    case 'MULTI_SELECT':
      return renderCheckboxGroup(field, values, onChange);
    case 'SIGNATURE':
      return renderSignature(field, values, onChange);
    default:
      return <input type="text" {...commonProps} />;
  }
}

function getFieldOptions(field: FormField) {
  if (Array.isArray(field.optionsJson)) {
    return { options: field.optionsJson.map(String), allowOther: false };
  }
  if (field.optionsJson && typeof field.optionsJson === 'object') {
    const record = field.optionsJson as { options?: unknown; allowOther?: unknown };
    return {
      options: Array.isArray(record.options) ? record.options.map(String) : [],
      allowOther: record.allowOther === true
    };
  }
  return { options: [], allowOther: false };
}

function renderSelect(field: FormField, values: Record<string, any>, onChange: (key: string, value: any) => void) {
  const { options, allowOther } = getFieldOptions(field);
  const value = values[field.id] ?? '';
  const otherKey = `${field.id}__other`;
  const otherValue = values[otherKey] ?? '';

  const handleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    onChange(field.id, next);
    if (next !== '__other__') {
      onChange(otherKey, '');
    }
  };

  return (
    <div className="grid" style={{ gap: 8 }}>
      <select value={value} onChange={handleSelect}>
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {allowOther && <option value="__other__">Other</option>}
      </select>
      {allowOther && value === '__other__' && (
        <input
          placeholder="Other..."
          value={otherValue}
          onChange={(event) => onChange(otherKey, event.target.value)}
        />
      )}
    </div>
  );
}

function renderCheckboxGroup(
  field: FormField,
  values: Record<string, any>,
  onChange: (key: string, value: any) => void
) {
  const { options, allowOther } = getFieldOptions(field);
  if (!options.length) {
    const checked = Boolean(values[field.id]);
    return (
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 8 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(field.id, event.target.checked)}
        />
        <span>Yes</span>
      </label>
    );
  }

  const selected = Array.isArray(values[field.id]) ? values[field.id] : [];
  const otherKey = `${field.id}__other`;
  const otherValue = values[otherKey] ?? '';
  const toggleOption = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((value: string) => value !== option)
      : [...selected, option];
    onChange(field.id, next);
    if (!next.includes('__other__')) {
      onChange(otherKey, '');
    }
  };

  return (
    <div className="grid" style={{ gap: 6 }}>
      {options.map((option) => (
        <label key={option} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 8 }}>
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => toggleOption(option)}
          />
          <span>{option}</span>
        </label>
      ))}
      {allowOther && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 8 }}>
          <input
            type="checkbox"
            checked={selected.includes('__other__')}
            onChange={() => toggleOption('__other__')}
          />
          <span>Other</span>
        </label>
      )}
      {allowOther && selected.includes('__other__') && (
        <div style={{ paddingLeft: 24 }}>
          <input
            placeholder="Other..."
            value={otherValue}
            onChange={(event) => onChange(otherKey, event.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function renderSignature(
  field: FormField,
  values: Record<string, any>,
  onChange: (key: string, value: any) => void
) {
  const current = values[field.id];
  const mode = current?.mode === 'draw' ? 'draw' : 'type';
  const typedValue = current?.mode === 'type' ? current.value : '';
  const drawnValue = current?.mode === 'draw' ? current.dataUrl : '';

  return (
    <div className="grid" style={{ gap: 8 }}>
      <select
        value={mode}
        onChange={(event) => {
          const nextMode = event.target.value;
          if (nextMode === 'draw') {
            onChange(field.id, { mode: 'draw', dataUrl: drawnValue || '' });
          } else {
            onChange(field.id, { mode: 'type', value: typedValue || '' });
          }
        }}
      >
        <option value="type">Type signature</option>
        <option value="draw">Draw signature</option>
      </select>
      {mode === 'type' ? (
        <input
          type="text"
          value={typedValue}
          onChange={(event) => onChange(field.id, { mode: 'type', value: event.target.value })}
          placeholder="Type full name"
        />
      ) : (
        <SignaturePad
          value={drawnValue}
          onChange={(dataUrl) => onChange(field.id, { mode: 'draw', dataUrl })}
        />
      )}
    </div>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1f1d19';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    setIsDrawing(true);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  };

  const end = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="grid" style={{ gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={360}
        height={140}
        style={{ border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button type="button" className="secondary" onClick={clear}>
        Clear signature
      </button>
      {value ? <img src={value} alt="Signature preview" style={{ maxWidth: 240 }} /> : null}
    </div>
  );
}
