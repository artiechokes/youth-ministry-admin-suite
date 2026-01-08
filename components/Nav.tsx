import Link from 'next/link';

// Simple shared navigation so visitors can find registration and admin areas.
export function Nav() {
  return (
    <header className="nav">
      <div className="nav__brand">Sacred Heart Youth Group</div>
      <nav className="nav__links">
        <Link href="/">Home</Link>
        <Link href="/register">Teen Registration</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </header>
  );
}
