'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

// Simple admin login page for credentials-based auth.
export default function AdminLogin() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setStatus('error');
      setMessage('Login failed. Check your email and password.');
      return;
    }

    window.location.href = '/admin';
  };

  return (
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1>Admin Login</h1>
      <form onSubmit={onSubmit} className="grid" style={{ gap: 12, marginTop: 16 }}>
        <div>
          <label>Email or Username</label>
          <input name="email" required />
        </div>
        <div>
          <label>Password</label>
          <input name="password" type="password" required />
        </div>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in...' : 'Sign In'}
        </button>
        {status === 'error' && <p style={{ color: 'var(--danger)' }}>{message}</p>}
      </form>
    </div>
  );
}
