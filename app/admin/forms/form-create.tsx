'use client';

import { FormEvent, useState } from 'react';

type ValidityMode = 'none' | 'for' | 'until';

type EditableValidity = {
  mode: ValidityMode;
  value: string;
  unit: string;
  until: string;
};

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'RELEASE', label: 'Release' },
  { value: 'EVENT', label: 'Event' },
  { value: 'MEDICAL', label: 'Medical' }
] as const;

export function FormCreate() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const [validity, setValidity] = useState<EditableValidity>({
    mode: 'none',
    value: '',
    unit: 'DAYS',
    until: ''
  });

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const name = String(formData.get('name') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const category = String(formData.get('category') ?? 'GENERAL');

    const validForValue = validity.mode === 'for' ? Number.parseInt(validity.value, 10) : null;
    const validForUnit = validity.mode === 'for' ? validity.unit : null;
    const validUntil = validity.mode === 'until' ? validity.until : null;

    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description.length ? description : null,
          category,
          validForValue: Number.isFinite(validForValue) ? validForValue : null,
          validForUnit,
          validUntil
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(data?.error ?? 'Unable to create form.');
        return;
      }

      setStatus('success');
      setMessage('Form created.');
      formEl.reset();
      setValidity({ mode: 'none', value: '', unit: 'DAYS', until: '' });
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to create form.');
    }
  };

  return (
    <div className="card">
      <h2>Create Form</h2>
      <form className="grid" style={{ gap: 12, marginTop: 12 }} onSubmit={onCreate}>
        <div>
          <label>Name</label>
          <input name="name" required placeholder="Field Trip Release" />
        </div>
        <div>
          <label>Description</label>
          <textarea name="description" rows={3} placeholder="Optional notes for staff." />
        </div>
        <div>
          <label>Form Type</label>
          <select name="category" defaultValue="GENERAL">
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Validity</label>
          <div className="grid" style={{ gap: 8 }}>
            <select
              value={validity.mode}
              onChange={(event) => setValidity((prev) => ({ ...prev, mode: event.target.value as ValidityMode }))}
            >
              <option value="none">No expiration</option>
              <option value="for">Valid for</option>
              <option value="until">Valid until</option>
            </select>
            {validity.mode === 'for' && (
              <div className="grid two">
                <input
                  type="number"
                  min={1}
                  value={validity.value}
                  onChange={(event) => setValidity((prev) => ({ ...prev, value: event.target.value }))}
                  placeholder="Number"
                />
                <select
                  value={validity.unit}
                  onChange={(event) => setValidity((prev) => ({ ...prev, unit: event.target.value }))}
                >
                  <option value="DAYS">Days</option>
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
              </div>
            )}
            {validity.mode === 'until' && (
              <input
                type="date"
                value={validity.until}
                onChange={(event) => setValidity((prev) => ({ ...prev, until: event.target.value }))}
              />
            )}
          </div>
        </div>
        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Creating...' : 'Create Form'}
        </button>
        {message && <p className={status === 'error' ? 'muted' : ''}>{message}</p>}
      </form>
    </div>
  );
}
