'use client';

import { FormEvent, useMemo, useState } from 'react';

type Teen = {
  id: string;
  firstName: string;
  lastName: string;
  parentEmail: string | null;
};

type Props = {
  formId: string;
  teens: Teen[];
};

export function FormAssign({ formId, teens }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState('');
  const [required, setRequired] = useState(true);
  const [allowReassign, setAllowReassign] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');

  const sortedTeens = useMemo(() => {
    return [...teens].sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.trim();
      const nameB = `${b.lastName} ${b.firstName}`.trim();
      return nameA.localeCompare(nameB);
    });
  }, [teens]);

  const toggleSelected = (teenId: string) => {
    setSelectedIds((prev) =>
      prev.includes(teenId) ? prev.filter((id) => id !== teenId) : [...prev, teenId]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === sortedTeens.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedTeens.map((teen) => teen.id));
    }
  };

  const onAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIds.length) {
      setMessage('Select at least one teen to assign.');
      return;
    }

    setStatus('saving');
    setMessage('');

    try {
      for (const teenId of selectedIds) {
        const response = await fetch('/api/forms/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teenId,
            formId,
            dueAt: dueAt || null,
            required,
            allowReassign
          })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error ?? 'Unable to assign form.');
        }
      }

      setStatus('success');
      setMessage('Form assigned to selected teens.');
      setSelectedIds([]);
      setDueAt('');
      setRequired(true);
      setAllowReassign(false);
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error?.message ?? 'Unable to assign form.');
    }
  };

  return (
    <section className="card">
      <h2>Assign Form</h2>
      <form className="grid" style={{ gap: 12, marginTop: 12 }} onSubmit={onAssign}>
        <div className="grid two">
          <div>
            <label>Due date</label>
            <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </div>
          <div>
            <label>Required</label>
            <select value={required ? 'required' : 'optional'} onChange={(event) => setRequired(event.target.value === 'required')}>
              <option value="required">Required</option>
              <option value="optional">Optional</option>
            </select>
          </div>
        </div>
        <div>
          <label>Reassign</label>
          <select value={allowReassign ? 'yes' : 'no'} onChange={(event) => setAllowReassign(event.target.value === 'yes')}>
            <option value="no">Only if not currently assigned</option>
            <option value="yes">Reassign even if already assigned</option>
          </select>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Select teens</strong>
            <button type="button" className="secondary" onClick={toggleAll}>
              {selectedIds.length === sortedTeens.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="grid" style={{ gap: 8, marginTop: 12 }}>
            {sortedTeens.map((teen) => (
              <label key={teen.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(teen.id)}
                  onChange={() => toggleSelected(teen.id)}
                />
                <span>
                  {teen.firstName} {teen.lastName}
                  {teen.parentEmail ? ` · ${teen.parentEmail}` : ''}
                </span>
              </label>
            ))}
            {!sortedTeens.length && <p className="muted">No teens available.</p>}
          </div>
        </div>

        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Assigning...' : 'Assign Form'}
        </button>
        {message && <p className={status === 'error' ? 'muted' : ''}>{message}</p>}
      </form>
    </section>
  );
}
