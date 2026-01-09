'use client';

import { signOut } from 'next-auth/react';

type Props = {
  label?: string;
};

// Simple logout button for admin/staff pages.
export function AdminLogoutButton({ label = 'Log out' }: Props) {
  return (
    <button type="button" className="secondary" onClick={() => signOut({ callbackUrl: '/admin/login' })}>
      {label}
    </button>
  );
}
