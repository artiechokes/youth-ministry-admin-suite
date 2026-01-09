'use client';

import { FormEvent, useState } from 'react';

type Props = {
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    title: string;
    phone: string;
    bio: string;
  };
};

// Client form for updating staff profile details.
export function ProfileForm({ profile }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      displayName: String(formData.get('displayName') ?? '').trim(),
      title: String(formData.get('title') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      bio: String(formData.get('bio') ?? '').trim()
    };

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(data?.error ?? 'Unable to save profile.');
        return;
      }

      setStatus('success');
      setMessage('Profile updated.');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Unable to save profile.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid" style={{ gap: 12, marginTop: 16 }}>
      <div className="grid two">
        <div>
          <label>First Name</label>
          <input name="firstName" defaultValue={profile.firstName} />
        </div>
        <div>
          <label>Last Name</label>
          <input name="lastName" defaultValue={profile.lastName} />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Display Name</label>
          <input name="displayName" defaultValue={profile.displayName} />
        </div>
        <div>
          <label>Title</label>
          <input name="title" defaultValue={profile.title} />
        </div>
      </div>
      <div className="grid two">
        <div>
          <label>Phone</label>
          <input name="phone" defaultValue={profile.phone} />
        </div>
      </div>
      <div>
        <label>Bio</label>
        <textarea name="bio" rows={4} defaultValue={profile.bio} />
      </div>
      <button type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving...' : 'Save Profile'}
      </button>
      {status === 'success' && <p style={{ color: 'var(--success)' }}>{message}</p>}
      {status === 'error' && <p style={{ color: 'var(--danger)' }}>{message}</p>}
    </form>
  );
}
