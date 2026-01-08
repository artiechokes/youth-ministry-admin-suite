'use client';

import { FormEvent, useState } from 'react';

type Props = {
  onSuccess?: () => void;
};

// Shared teen registration form for the public page and kiosk modal.
export function TeenRegistrationForm({ onSuccess }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const getRequired = (key: string) => {
      const value = formData.get(key);
      return typeof value === 'string' ? value.trim() : '';
    };
    const getOptional = (key: string) => {
      const value = getRequired(key);
      return value.length ? value : undefined;
    };

    const payload = {
      firstName: getRequired('firstName'),
      lastName: getRequired('lastName'),
      dob: getRequired('dob'),
      teenEmail: getRequired('teenEmail'),
      teenPhone: getOptional('teenPhone'),
      addressLine1: getRequired('addressLine1'),
      addressLine2: getOptional('addressLine2'),
      city: getRequired('city'),
      state: getRequired('state'),
      postalCode: getRequired('postalCode'),
      parish: getOptional('parish'),
      emergencyContactName: getOptional('emergencyContactName'),
      emergencyContactPhone: getOptional('emergencyContactPhone'),
      parentName: getRequired('parentName'),
      parentEmail: getRequired('parentEmail'),
      parentPhone: getRequired('parentPhone'),
      parentRelationship: getRequired('parentRelationship')
    };

    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus('error');
        setMessage(data?.error ?? 'Registration failed. Please try again.');
        return;
      }

      formEl.reset();
      setStatus('success');
      setMessage('Registration received. We will contact the parent to verify.');
      onSuccess?.();
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid" style={{ gap: 16, marginTop: 16 }}>
      <div className="grid two">
        <div>
          <label>First Name</label>
          <input name="firstName" required />
        </div>
        <div>
          <label>Last Name</label>
          <input name="lastName" required />
        </div>
      </div>
      <div>
        <label>Date of Birth</label>
        <input name="dob" type="date" required />
      </div>
      <div className="grid two">
        <div>
          <label>Teen Email</label>
          <input name="teenEmail" type="email" required />
        </div>
        <div>
          <label>Teen Phone (optional)</label>
          <input name="teenPhone" type="tel" />
        </div>
      </div>
      <div>
        <label>Address Line 1</label>
        <input name="addressLine1" required />
      </div>
      <div>
        <label>Address Line 2 (optional)</label>
        <input name="addressLine2" />
      </div>
      <div className="grid two">
        <div>
          <label>City</label>
          <input name="city" required />
        </div>
        <div>
          <label>State</label>
          <input name="state" required />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Postal Code</label>
          <input name="postalCode" required />
        </div>
        <div>
          <label>Parish (optional)</label>
          <input name="parish" />
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        <h2>Parent/Guardian Info</h2>
        <p className="muted">Required so we can confirm registration details.</p>
      </div>
      <div className="grid two">
        <div>
          <label>Parent/Guardian Name</label>
          <input name="parentName" required />
        </div>
        <div>
          <label>Relationship</label>
          <input name="parentRelationship" required />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Parent Email</label>
          <input name="parentEmail" type="email" required />
        </div>
        <div>
          <label>Parent Phone</label>
          <input name="parentPhone" type="tel" required />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Emergency Contact Name (optional)</label>
          <input name="emergencyContactName" />
        </div>
        <div>
          <label>Emergency Contact Phone (optional)</label>
          <input name="emergencyContactPhone" type="tel" />
        </div>
      </div>
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting...' : 'Submit Registration'}
      </button>
      {status === 'success' && <p style={{ color: 'var(--success)' }}>{message}</p>}
      {status === 'error' && <p style={{ color: 'var(--danger)' }}>{message}</p>}
    </form>
  );
}
