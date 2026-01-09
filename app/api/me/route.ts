import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Role } from '@prisma/client';

const allowedRoles = new Set<Role>([Role.ADMIN, Role.STAFF]);

async function requireStaffUser() {
  const user = await getSessionUser();
  if (!user?.id || !user.role || !allowedRoles.has(user.role as Role)) {
    return null;
  }
  return user;
}

export async function PATCH(req: NextRequest) {
  const user = await requireStaffUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: firstName || null,
      lastName: lastName || null,
      displayName: displayName || null,
      title: title || null,
      phone: phone || null,
      bio: bio || null
    }
  });

  return NextResponse.json({
    id: updated.id,
    firstName: updated.firstName ?? '',
    lastName: updated.lastName ?? '',
    displayName: updated.displayName ?? '',
    title: updated.title ?? '',
    phone: updated.phone ?? '',
    bio: updated.bio ?? ''
  });
}
