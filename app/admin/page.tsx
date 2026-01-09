import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

// Admin landing page. We gate it server-side so only staff can see it.
export default async function AdminDashboard() {
  await requireAdmin();

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p className="muted">
            Start with the youth roster. We will add kiosk, forms, events, and weekly challenges next.
          </p>
        </div>
      </section>
      <section className="grid two">
        <article className="card">
          <h2>Youth Roster</h2>
          <p className="muted">Search and edit teen records, plus flag pending info.</p>
          <Link href="/admin/roster">
            <button style={{ marginTop: 12 }}>Open Roster</button>
          </Link>
        </article>
        <article className="card">
          <h2>Attendance Kiosk</h2>
          <p className="muted">Touch-friendly check-in and check-out for events.</p>
          <Link href="/admin/kiosk">
            <button style={{ marginTop: 12 }}>Open Kiosk</button>
          </Link>
        </article>
        <article className="card">
          <h2>Staff Accounts</h2>
          <p className="muted">Create staff logins and control permissions.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Link href="/admin/staff">
              <button>Manage Staff</button>
            </Link>
            <Link href="/admin/staff/roster">
              <button className="secondary">Staff Roster</button>
            </Link>
          </div>
        </article>
        <article className="card">
          <h2>My Profile</h2>
          <p className="muted">Update your contact info and staff bio.</p>
          <Link href="/admin/profile">
            <button style={{ marginTop: 12 }}>Edit Profile</button>
          </Link>
        </article>
        <article className="card">
          <h2>Upcoming Features</h2>
          <p className="muted">Forms, events, and weekly challenges will live here.</p>
        </article>
      </section>
    </div>
  );
}
