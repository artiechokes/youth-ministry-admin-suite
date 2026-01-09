import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ProfileForm } from './profile-form';

// Staff profile page for updating contact info and bio.
export default async function ProfilePage() {
  const session = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: session.id } });

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1>My Profile</h1>
      <p className="muted">Keep your contact info and bio current for staff references.</p>
      <ProfileForm
        profile={{
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          displayName: user?.displayName ?? '',
          title: user?.title ?? '',
          phone: user?.phone ?? '',
          bio: user?.bio ?? ''
        }}
      />
    </div>
  );
}
