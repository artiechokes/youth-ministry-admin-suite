import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizePermissions } from '@/lib/permissions';
import { requireStaffPermission } from '@/lib/permissions-guard';
import { hash } from 'bcryptjs';

export async function GET() {
  const user = await requireStaffPermission('staff_view');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staff = await prisma.user.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'asc' }
  });

  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const user = await requireStaffPermission('staff_manage');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  const role = body.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
  const permissions = normalizePermissions(body.permissions);

  if (!email || !username || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });

  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);

  const created = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash,
      permissionsJson: permissions,
      firstName,
      lastName
    }
  });

  return NextResponse.json({ id: created.id });
}
