import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth-options';

// Pull the current session user for server-side checks.
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

// Basic guard for admin/staff-only pages.
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.role || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    redirect('/admin/login');
  }
  return user;
}
