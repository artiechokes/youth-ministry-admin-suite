import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { AdminLogoutButton } from './AdminLogoutButton';

// Simple shared navigation so visitors can find registration and admin areas.
export async function Nav() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, displayName: true, email: true, username: true }
      })
    : null;

  const fallbackName = () => {
    if (user?.firstName) {
      const lastInitial = user?.lastName?.trim().charAt(0);
      return lastInitial ? `${user.firstName} ${lastInitial}.` : user.firstName;
    }
    return user?.email || user?.username || '';
  };

  const name = user?.displayName || fallbackName();

  return (
    <header className="nav">
      <div className="nav__brand">Sacred Heart Youth Group</div>
      <nav className="nav__links">
        <Link href="/">Home</Link>
        <Link href="/register">Teen Registration</Link>
        <Link href="/admin">Admin</Link>
      </nav>
      <details className="nav__mobile">
        <summary aria-label="Open navigation">☰</summary>
        <div className="nav__mobile-menu">
          <Link href="/">Home</Link>
          <Link href="/register">Teen Registration</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </details>
      {session?.user && name ? (
        <details className="nav__user-menu">
          <summary>{name}</summary>
          <div className="nav__dropdown">
            <Link href="/admin/profile">My Profile</Link>
            <AdminLogoutButton label="Log out" />
          </div>
        </details>
      ) : null}
    </header>
  );
}
