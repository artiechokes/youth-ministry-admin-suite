'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const FIELD_TYPES = [
  { value: 'SECTION', label: 'Section' },
  { value: 'SHORT_TEXT', label: 'Short text' },
  { value: 'LONG_TEXT', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'SELECT', label: 'Select' },
  { value: 'MULTI_SELECT', label: 'Multi-select' },
  { value: 'SIGNATURE', label: 'Signature' }
];

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  helpText: string | null;
  optionsJson: unknown;
  order: number;
};

type FormDefinition = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  category: string;
  validForValue: number | null;
  validForUnit: string | null;
  validUntil: string | null;
  fields: FormField[];
};

type EditableField = {
  id?: string;
  clientId: string;
  label: string;
  type: string;
  required: boolean;
  helpText: string;
  options: string;
  allowOther: boolean;
};

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'RELEASE', label: 'Release' },
  { value: 'EVENT', label: 'Event' },
  { value: 'MEDICAL', label: 'Medical' }
] as const;

const VARIABLE_DEFS = [
  { token: '$parentName', label: 'Parent Name', description: 'Parent/guardian full name from registration.' },
  { token: '$parentEmail', label: 'Parent Email', description: 'Parent/guardian email from registration.' },
  { token: '$parentPhone', label: 'Parent Phone', description: 'Parent/guardian phone from registration.' },
  { token: '$parentRelationship', label: 'Parent Relationship', description: 'Relationship to student.' },
  { token: '$studentName', label: 'Student Name', description: 'Student full name.' },
  { token: '$studentFirstName', label: 'Student First Name', description: 'Student first name.' },
  { token: '$studentLastName', label: 'Student Last Name', description: 'Student last name.' },
  { token: '$studentEmail', label: 'Student Email', description: 'Student email from registration.' },
  { token: '$studentPhone', label: 'Student Phone', description: 'Student phone from registration.' },
  { token: '$dob', label: 'Date of Birth', description: 'Student date of birth.' },
  { token: '$addressLine1', label: 'Address Line 1', description: 'Student address line 1.' },
  { token: '$addressLine2', label: 'Address Line 2', description: 'Student address line 2.' },
  { token: '$city', label: 'City', description: 'Student city.' },
  { token: '$state', label: 'State', description: 'Student state.' },
  { token: '$postalCode', label: 'Postal Code', description: 'Student postal code.' },
  { token: '$parish', label: 'Parish', description: 'Student parish.' },
  { token: '$emergencyContactName', label: 'Emergency Contact Name', description: 'Emergency contact name.' },
  { token: '$emergencyContactPhone', label: 'Emergency Contact Phone', description: 'Emergency contact phone.' },
  { token: '$eventName', label: 'Event Name', description: 'Event name (when events are connected).' },
  { token: '$eventDate', label: 'Event Date', description: 'Event date (when events are connected).' },
  { token: '$eventLocation', label: 'Event Location', description: 'Event location (when events are connected).' }
];

type ValidityMode = 'none' | 'for' | 'until';

type EditableValidity = {
  mode: ValidityMode;
  value: string;
  unit: string;
  until: string;
};

type Props = {
  form: FormDefinition;
  canEdit: boolean;
  canManage: boolean;
  initialMode: 'view' | 'edit';
};

export function FormDetail({ form, canEdit, canManage, initialMode }: Props) {
  const [currentForm, setCurrentForm] = useState(form);
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const [removedFieldIds, setRemovedFieldIds] = useState<string[]>([]);
  const [draft, setDraft] = useState(() => toEditable(form));

  const orderedFields = useMemo(
    () => [...currentForm.fields].sort((a, b) => a.order - b.order),
    [currentForm.fields]
  );

  const resetDraft = () => {
    setDraft(toEditable(currentForm));
    setRemovedFieldIds([]);
    setStatus('idle');
    setMessage('');
  };

  const addField = () => {
    setDraft((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          clientId: `temp-${Date.now()}`,
          label: '',
          type: 'SHORT_TEXT',
          required: false,
          helpText: '',
          options: '',
          allowOther: false
        }
      ]
    }));
  };

  const removeField = (clientId: string) => {
    setDraft((prev) => {
      const field = prev.fields.find((item) => item.clientId === clientId);
      if (field?.id) {
        setRemovedFieldIds((ids) => [...ids, field.id!]);
      }
      return { ...prev, fields: prev.fields.filter((item) => item.clientId !== clientId) };
    });
  };

  const updateField = (clientId: string, key: keyof EditableField, value: string | boolean) => {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.clientId === clientId ? { ...field, [key]: value } : field
      )
    }));
  };

  const appendVariable = (clientId: string, key: keyof EditableField, token: string) => {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => {
        if (field.clientId !== clientId) return field;
        const current = typeof field[key] === 'string' ? (field[key] as string) : '';
        return { ...field, [key]: current ? `${current} ${token}` : token };
      })
    }));
  };

  const saveChanges = async () => {
    if (!canEdit) return;

    setStatus('saving');
    setMessage('');

    const payload = {
      name: draft.name,
      description: draft.description || null,
      status: draft.status,
      validForValue: draft.validity.mode === 'for' ? Number.parseInt(draft.validity.value, 10) || null : null,
      validForUnit: draft.validity.mode === 'for' ? draft.validity.unit : null,
      validUntil: draft.validity.mode === 'until' ? draft.validity.until || null : null,
      category: draft.category,
      fields: draft.fields.map((field, index) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        helpText: field.helpText,
        options: field.options,
        allowOther: field.allowOther,
        order: index
      })),
      removedFieldIds
    };

    try {
      const response = await fetch(`/api/forms/${currentForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(data?.error ?? 'Unable to save changes.');
        return;
      }

      setStatus('success');
      setMessage('Saved changes.');
      setRemovedFieldIds([]);
      const updated = data as FormDefinition;
      setCurrentForm(updated);
      setDraft(toEditable(updated));
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to save changes.');
    }
  };

  const archiveForm = async () => {
    if (!canManage) return;
    if (!confirm('Archive this form? It will no longer be assignable.')) return;

    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch(`/api/forms/${currentForm.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(data?.error ?? 'Unable to archive form.');
        return;
      }
      setStatus('success');
      setMessage('Form archived.');
      setCurrentForm((prev) => ({ ...prev, status: 'ARCHIVED' }));
      setDraft((prev) => ({ ...prev, status: 'ARCHIVED' }));
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to archive form.');
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>{currentForm.name}</h1>
          <p className="muted">{formatValidity(currentForm)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link className="secondary" href={`/admin/forms/${currentForm.id}/assign`}>
            Assign
          </Link>
          {canEdit && (
            <button type="button" className="secondary" onClick={() => setIsEditing((prev) => !prev)}>
              {isEditing ? 'Close' : 'Edit'}
            </button>
          )}
          {canManage && (
            <button type="button" className="btn-archive" onClick={archiveForm}>
              Archive
            </button>
          )}
        </div>
      </section>

      {!isEditing && (
        <section className="card">
          <h2>Form Details</h2>
          <p>{currentForm.description || 'No description provided.'}</p>
          <div style={{ marginTop: 16 }}>
            <h3>Fields</h3>
            <ul>
              {orderedFields.map((field) => (
                <li key={field.id}>
                  <strong>{field.label}</strong> · {field.type}
                  {field.required ? ' (required)' : ' (optional)'}
                </li>
              ))}
              {!orderedFields.length && <li className="muted">No fields added yet.</li>}
            </ul>
          </div>
        </section>
      )}

      {isEditing && (
        <section className="card">
          <h2>Edit Form</h2>
          <div className="grid" style={{ gap: 16, marginTop: 12 }}>
            <div className="grid two">
              <div>
                <label>Name</label>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <label>Status</label>
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label>Form Type</label>
              <select
                value={draft.category}
                onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Description</label>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div>
              <label>Validity</label>
              <div className="grid" style={{ gap: 8 }}>
                <select
                  value={draft.validity.mode}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      validity: { ...prev.validity, mode: event.target.value as ValidityMode }
                    }))
                  }
                >
                  <option value="none">No expiration</option>
                  <option value="for">Valid for</option>
                  <option value="until">Valid until</option>
                </select>
                {draft.validity.mode === 'for' && (
                  <div className="grid two">
                    <input
                      type="number"
                      min={1}
                      value={draft.validity.value}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          validity: { ...prev.validity, value: event.target.value }
                        }))
                      }
                    />
                    <select
                      value={draft.validity.unit}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          validity: { ...prev.validity, unit: event.target.value }
                        }))
                      }
                    >
                      <option value="DAYS">Days</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years</option>
                    </select>
                  </div>
                )}
                {draft.validity.mode === 'until' && (
                  <input
                    type="date"
                    value={draft.validity.until}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        validity: { ...prev.validity, until: event.target.value }
                      }))
                    }
                  />
                )}
              </div>
            </div>

            <div className="grid" style={{ gap: 12 }}>
              <h3>Questions</h3>
              <div className="card" style={{ padding: 12 }}>
                <strong>Variables</strong>
                <p className="muted">Use these tokens in titles or descriptions. They auto-fill and can be overridden per submission.</p>
                <div className="grid two" style={{ gap: 8, marginTop: 8 }}>
                  {VARIABLE_DEFS.map((variable) => (
                    <div key={variable.token}>
                      <strong>{variable.token}</strong>
                      <div className="muted">{variable.label}</div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>{variable.description}</div>
                    </div>
                  ))}
                </div>
              </div>
              {draft.fields.map((field, index) => (
                <div key={field.clientId} className="card" style={{ padding: 16, borderLeft: '4px solid var(--accent)' }}>
                  <div className="grid" style={{ gap: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <label>{field.type === 'SECTION' ? 'Section Title' : 'Question'}</label>
                        <input
                          placeholder="Untitled question"
                          value={field.label}
                          onChange={(event) => updateField(field.clientId, 'label', event.target.value)}
                        />
                        <VariablePicker
                          label="Insert variable"
                          onSelect={(token) => appendVariable(field.clientId, 'label', token)}
                        />
                      </div>
                      <div style={{ minWidth: 180 }}>
                        <label>Type</label>
                        <select
                          value={field.type}
                          onChange={(event) => updateField(field.clientId, 'type', event.target.value)}
                        >
                          {FIELD_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label>{field.type === 'SECTION' ? 'Section Body' : 'Description'}</label>
                      <textarea
                        rows={field.type === 'SECTION' ? 4 : 2}
                        placeholder="Optional help text"
                        value={field.helpText}
                        onChange={(event) => updateField(field.clientId, 'helpText', event.target.value)}
                      />
                      <VariablePicker
                        label="Insert variable"
                        onSelect={(token) => appendVariable(field.clientId, 'helpText', token)}
                      />
                    </div>
                    {(field.type === 'SELECT' || field.type === 'MULTI_SELECT' || field.type === 'CHECKBOX') && (
                      <div>
                        <label>Options (one per line)</label>
                        <textarea
                          rows={4}
                          value={field.options}
                          onChange={(event) => updateField(field.clientId, 'options', event.target.value)}
                        />
                      </div>
                    )}
                    {(field.type === 'SELECT' || field.type === 'MULTI_SELECT' || field.type === 'CHECKBOX') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={field.allowOther}
                          onChange={(event) => updateField(field.clientId, 'allowOther', event.target.checked)}
                        />
                        Allow “Other” response
                      </label>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {field.type !== 'SECTION' ? (
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(event) => updateField(field.clientId, 'required', event.target.checked)}
                          />
                          Required
                        </label>
                      ) : (
                        <span className="muted">Display-only section</span>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="muted">Question {index + 1}</span>
                        <button type="button" className="secondary" onClick={() => removeField(field.clientId)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="secondary" onClick={addField}>
                + Add question
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={saveChanges} disabled={!canEdit || status === 'saving'}>
                {status === 'saving' ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" className="secondary" onClick={resetDraft}>
                Reset
              </button>
            </div>
            {message && <p className={status === 'error' ? 'muted' : ''}>{message}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function toEditable(form: FormDefinition) {
  const validity: EditableValidity = form.validUntil
    ? { mode: 'until', value: '', unit: 'DAYS', until: form.validUntil.slice(0, 10) }
    : form.validForValue
      ? {
          mode: 'for',
          value: String(form.validForValue),
          unit: form.validForUnit ?? 'DAYS',
          until: ''
        }
      : { mode: 'none', value: '', unit: 'DAYS', until: '' };

  return {
    name: form.name,
    description: form.description ?? '',
    status: form.status,
    category: form.category ?? 'GENERAL',
    validity,
    fields: form.fields.map((field) => ({
      id: field.id,
      clientId: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      helpText: field.helpText ?? '',
      options: parseOptions(field.optionsJson).options.join('\n'),
      allowOther: parseOptions(field.optionsJson).allowOther
    }))
  };
}

function parseOptions(value: unknown) {
  if (Array.isArray(value)) {
    return { options: value.map(String), allowOther: false };
  }
  if (value && typeof value === 'object') {
    const record = value as { options?: unknown; allowOther?: unknown };
    const options = Array.isArray(record.options) ? record.options.map(String) : [];
    const allowOther = record.allowOther === true;
    return { options, allowOther };
  }
  return { options: [], allowOther: false };
}

function VariablePicker({ label, onSelect }: { label: string; onSelect: (token: string) => void }) {
  return (
    <div style={{ marginTop: 6 }}>
      <label className="muted">{label}</label>
      <select
        defaultValue=""
        onChange={(event) => {
          const token = event.target.value;
          if (!token) return;
          onSelect(token);
          event.currentTarget.value = '';
        }}
      >
        <option value="">Select a variable</option>
        {VARIABLE_DEFS.map((variable) => (
          <option key={variable.token} value={variable.token}>
            {variable.label} ({variable.token})
          </option>
        ))}
      </select>
    </div>
  );
}

function formatValidity(form: FormDefinition) {
  if (form.validUntil) {
    return `Valid until ${new Date(form.validUntil).toLocaleDateString()}`;
  }
  if (form.validForValue) {
    const unit = form.validForUnit?.toLowerCase() ?? 'days';
    return `Valid for ${form.validForValue} ${unit}`;
  }
  return 'No expiration';
}
