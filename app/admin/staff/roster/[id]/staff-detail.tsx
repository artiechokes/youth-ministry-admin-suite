'use client';

import { FormEvent, useMemo, useState } from 'react';

type StaffProfile = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  title: string;
  phone: string;
  email: string;
  bio: string;
  role: string;
};

type Props = {
  staff: StaffProfile;
  canEdit: boolean;
};

// Client form for viewing and editing staff profile details.
export function StaffDetailForm({ staff, canEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const initialValues = useMemo(() => staff, [staff]);
  const [formValues, setFormValues] = useState<StaffProfile>(initialValues);

  const handleChange = (field: keyof StaffProfile, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const payload = {
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      displayName: formValues.displayName.trim(),
      title: formValues.title.trim(),
      phone: formValues.phone.trim(),
      bio: formValues.bio.trim()
    };

    try {
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus('error');
        setMessage(data?.error ?? 'Unable to save changes.');
        return;
      }

      setStatus('success');
      setMessage('Saved changes.');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to save changes.');
    }
  };

  if (!isEditing) {
    const fullName = `${formValues.firstName} ${formValues.lastName}`.trim() || 'Staff Member';
    return (
      <section className="grid" style={{ gap: 16, marginTop: 16 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2>{fullName}</h2>
            <p className="muted">{formValues.role} account</p>
          </div>
          {canEdit && (
            <button type="button" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          )}
        </div>
        <div className="grid two">
          <div className="card">
            <h3>Profile</h3>
            <p>
              <strong>Display Name:</strong> {formValues.displayName || '-'}
            </p>
            <p>
              <strong>Title:</strong> {formValues.title || '-'}
            </p>
            <p>
              <strong>Email:</strong> {formValues.email || '-'}
            </p>
            <p>
              <strong>Phone:</strong> {formValues.phone || '-'}
            </p>
          </div>
          <div className="card">
            <h3>Bio</h3>
            {formValues.bio ? <p>{formValues.bio}</p> : <p className="muted">No bio added yet.</p>}
          </div>
        </div>
      </section>
    );
  }

  if (!canEdit) {
    return null;
  }

  return (
    <form onSubmit={onSubmit} className="grid" style={{ gap: 16, marginTop: 16 }}>
      <div className="grid two">
        <div>
          <label>First Name</label>
          <input
            name="firstName"
            value={formValues.firstName}
            onChange={(event) => handleChange('firstName', event.target.value)}
            required
          />
        </div>
        <div>
          <label>Last Name</label>
          <input
            name="lastName"
            value={formValues.lastName}
            onChange={(event) => handleChange('lastName', event.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Display Name</label>
          <input
            name="displayName"
            value={formValues.displayName}
            onChange={(event) => handleChange('displayName', event.target.value)}
          />
        </div>
        <div>
          <label>Title</label>
          <input name="title" value={formValues.title} onChange={(event) => handleChange('title', event.target.value)} />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Phone</label>
          <input name="phone" value={formValues.phone} onChange={(event) => handleChange('phone', event.target.value)} />
        </div>
      </div>
      <div>
        <label>Bio</label>
        <textarea
          name="bio"
          rows={5}
          value={formValues.bio}
          onChange={(event) => handleChange('bio', event.target.value)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" className="secondary" onClick={() => setIsEditing(false)}>
          Cancel
        </button>
      </div>
      {status === 'success' && <p style={{ color: 'var(--success)' }}>{message}</p>}
      {status === 'error' && <p style={{ color: 'var(--danger)' }}>{message}</p>}
    </form>
  );
}
