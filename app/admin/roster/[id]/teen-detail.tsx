'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type TeenFormData = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  teenEmail: string;
  teenPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  parish: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentRelationship: string;
  registrationStatus: string;
  registrationDataJson: string;
};

type Props = { teen: TeenFormData; canEdit: boolean };

const statusOptions = [
  { value: 'PENDING_PARENT_VERIFICATION', label: 'Pending parent verification' },
  { value: 'PENDING_ADDITIONAL_INFO', label: 'Pending additional info' },
  { value: 'COMPLETE', label: 'Complete' }
];

// Client form posts updates to the admin API route.
export function TeenDetailForm({ teen, canEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialValues = useMemo(() => teen, [teen]);
  const [formValues, setFormValues] = useState<TeenFormData>(initialValues);

  useEffect(() => {
    setFormValues(initialValues);
    setStatus('idle');
    setMessage('');
    setIsEditing(false);
  }, [initialValues]);

  const buildPayload = (values: TeenFormData) => {
    let registrationDataJson: unknown | null = null;
    if (values.registrationDataJson.trim().length) {
      registrationDataJson = JSON.parse(values.registrationDataJson);
    }

    return {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      dob: values.dob.trim(),
      teenEmail: values.teenEmail.trim(),
      teenPhone: values.teenPhone.trim(),
      addressLine1: values.addressLine1.trim(),
      addressLine2: values.addressLine2.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      postalCode: values.postalCode.trim(),
      parish: values.parish.trim(),
      emergencyContactName: values.emergencyContactName.trim(),
      emergencyContactPhone: values.emergencyContactPhone.trim(),
      parentName: values.parentName.trim(),
      parentEmail: values.parentEmail.trim(),
      parentPhone: values.parentPhone.trim(),
      parentRelationship: values.parentRelationship.trim(),
      registrationStatus: values.registrationStatus.trim(),
      registrationDataJson
    };
  };

  const saveChanges = async (values: TeenFormData, { silent }: { silent: boolean }) => {
    if (!silent) {
      setStatus('saving');
      setMessage('');
    }

    try {
      let payload: ReturnType<typeof buildPayload>;
      try {
        payload = buildPayload(values);
      } catch {
        setStatus('error');
        setMessage('Additional info must be valid JSON.');
        return;
      }

      const response = await fetch(`/api/teens/${teen.id}`, {
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

      if (!silent) {
        setStatus('success');
        setMessage('Saved changes.');
      } else {
        setStatus('idle');
        setMessage('');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to save changes.');
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveChanges(formValues, { silent: false });
  };

  const scheduleAutosave = (nextValues: TeenFormData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveChanges(nextValues, { silent: true });
    }, 800);
  };

  const handleChange = (field: keyof TeenFormData, value: string) => {
    const nextValues = { ...formValues, [field]: value };
    setFormValues(nextValues);
    if (isEditing) {
      scheduleAutosave(nextValues);
    }
  };

  if (!isEditing) {
    const addressLine = [formValues.addressLine1, formValues.addressLine2].filter(Boolean).join(', ') || '-';
    const cityState = [formValues.city, formValues.state].filter(Boolean).join(', ') || '-';
    const emergencyContact = formValues.emergencyContactName
      ? `${formValues.emergencyContactName}${formValues.emergencyContactPhone ? ` (${formValues.emergencyContactPhone})` : ''}`
      : '-';
    const parentContact = formValues.parentName
      ? `${formValues.parentName}${formValues.parentRelationship ? ` (${formValues.parentRelationship})` : ''}`
      : '-';

    return (
      <section className="grid" style={{ gap: 16, marginTop: 16 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2>Student Overview</h2>
            <p className="muted">Record status: {formValues.registrationStatus.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
          {canEdit && (
            <button type="button" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          )}
        </div>
        <div className="grid two">
          <div className="card">
            <h3>Teen</h3>
            <p>
              <strong>Name:</strong> {formValues.firstName} {formValues.lastName}
            </p>
            <p>
              <strong>Date of Birth:</strong> {formValues.dob}
            </p>
            <p>
              <strong>Email:</strong> {formValues.teenEmail || '-'}
            </p>
            <p>
              <strong>Phone:</strong> {formValues.teenPhone || '-'}
            </p>
            <p>
              <strong>Parish:</strong> {formValues.parish || '-'}
            </p>
          </div>
          <div className="card">
            <h3>Address</h3>
            <p>
              <strong>Street:</strong> {addressLine}
            </p>
            <p>
              <strong>City/State:</strong> {cityState}
            </p>
            <p>
              <strong>Postal Code:</strong> {formValues.postalCode || '-'}
            </p>
          </div>
        </div>
        <div className="grid two">
          <div className="card">
            <h3>Parent/Guardian</h3>
            <p>
              <strong>Name:</strong> {parentContact}
            </p>
            <p>
              <strong>Email:</strong> {formValues.parentEmail || '-'}
            </p>
            <p>
              <strong>Phone:</strong> {formValues.parentPhone || '-'}
            </p>
          </div>
          <div className="card">
            <h3>Emergency Contact</h3>
            <p>
              <strong>Contact:</strong> {emergencyContact}
            </p>
          </div>
        </div>
        <div className="card">
          <h3>Additional Info</h3>
          {formValues.registrationDataJson ? (
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{formValues.registrationDataJson}</pre>
          ) : (
            <p className="muted">No extra fields captured yet.</p>
          )}
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
      <div>
        <label>Date of Birth</label>
        <input
          name="dob"
          type="date"
          value={formValues.dob}
          onChange={(event) => handleChange('dob', event.target.value)}
          required
        />
      </div>
      <div className="grid two">
        <div>
          <label>Teen Email</label>
          <input
            name="teenEmail"
            type="email"
            value={formValues.teenEmail}
            onChange={(event) => handleChange('teenEmail', event.target.value)}
          />
        </div>
        <div>
          <label>Teen Phone</label>
          <input
            name="teenPhone"
            type="tel"
            value={formValues.teenPhone}
            onChange={(event) => handleChange('teenPhone', event.target.value)}
          />
        </div>
      </div>
      <div>
        <label>Address Line 1</label>
        <input
          name="addressLine1"
          value={formValues.addressLine1}
          onChange={(event) => handleChange('addressLine1', event.target.value)}
        />
      </div>
      <div>
        <label>Address Line 2</label>
        <input
          name="addressLine2"
          value={formValues.addressLine2}
          onChange={(event) => handleChange('addressLine2', event.target.value)}
        />
      </div>
      <div className="grid two">
        <div>
          <label>City</label>
          <input name="city" value={formValues.city} onChange={(event) => handleChange('city', event.target.value)} />
        </div>
        <div>
          <label>State</label>
          <input name="state" value={formValues.state} onChange={(event) => handleChange('state', event.target.value)} />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Postal Code</label>
          <input
            name="postalCode"
            value={formValues.postalCode}
            onChange={(event) => handleChange('postalCode', event.target.value)}
          />
        </div>
        <div>
          <label>Parish</label>
          <input
            name="parish"
            value={formValues.parish}
            onChange={(event) => handleChange('parish', event.target.value)}
          />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Emergency Contact Name</label>
          <input
            name="emergencyContactName"
            value={formValues.emergencyContactName}
            onChange={(event) => handleChange('emergencyContactName', event.target.value)}
          />
        </div>
        <div>
          <label>Emergency Contact Phone</label>
          <input
            name="emergencyContactPhone"
            type="tel"
            value={formValues.emergencyContactPhone}
            onChange={(event) => handleChange('emergencyContactPhone', event.target.value)}
          />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Parent/Guardian Name</label>
          <input
            name="parentName"
            value={formValues.parentName}
            onChange={(event) => handleChange('parentName', event.target.value)}
          />
        </div>
        <div>
          <label>Relationship</label>
          <input
            name="parentRelationship"
            value={formValues.parentRelationship}
            onChange={(event) => handleChange('parentRelationship', event.target.value)}
          />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Parent Email</label>
          <input
            name="parentEmail"
            type="email"
            value={formValues.parentEmail}
            onChange={(event) => handleChange('parentEmail', event.target.value)}
          />
        </div>
        <div>
          <label>Parent Phone</label>
          <input
            name="parentPhone"
            type="tel"
            value={formValues.parentPhone}
            onChange={(event) => handleChange('parentPhone', event.target.value)}
          />
        </div>
      </div>
      <div>
        <label>Registration Status</label>
        <select
          name="registrationStatus"
          value={formValues.registrationStatus}
          onChange={(event) => handleChange('registrationStatus', event.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Additional Info JSON (optional)</label>
        <textarea
          name="registrationDataJson"
          rows={6}
          value={formValues.registrationDataJson}
          onChange={(event) => handleChange('registrationDataJson', event.target.value)}
        />
        <p className="muted">Use this for extra fields until the form builder is ready.</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" className="secondary" onClick={() => setIsEditing(false)}>
          Done
        </button>
      </div>
      {status === 'success' && <p style={{ color: 'var(--success)' }}>{message}</p>}
      {status === 'error' && <p style={{ color: 'var(--danger)' }}>{message}</p>}
    </form>
  );
}
