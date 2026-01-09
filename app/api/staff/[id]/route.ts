import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizePermissions, type Permission } from '@/lib/permissions';
import { requireStaffPermission } from '@/lib/permissions-guard';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const staffId = resolvedParams?.id;
  if (!staffId) return NextResponse.json({ error: 'Missing staff id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const permissions = normalizePermissions(body.permissions);
  const updates: {
    permissionsJson?: Permission[];
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    title?: string | null;
    phone?: string | null;
    bio?: string | null;
  } = {};

  const existing = await prisma.user.findUnique({ where: { id: staffId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const toNullable = (value: unknown) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  const profileFields: Array<keyof typeof updates> = [
    'firstName',
    'lastName',
    'displayName',
    'title',
    'phone',
    'bio'
  ];

  const hasPermissionsUpdate = Array.isArray(body.permissions);
  const hasProfileUpdate = profileFields.some((field) => field in body);

  if (hasPermissionsUpdate) {
    const user = await requireStaffPermission('staff_manage');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (existing.role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot edit admin permissions' }, { status: 400 });
    }
    updates.permissionsJson = permissions;
  }

  if (hasProfileUpdate) {
    const user = await requireStaffPermission('staff_edit');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  profileFields.forEach((field) => {
    if (field in body) {
      const nextValue = toNullable(body[field as keyof typeof body]);
      if (nextValue !== undefined) {
        updates[field] = nextValue;
      }
    }
  });

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: staffId },
    data: updates
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('staff_manage');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await Promise.resolve(params);
  const staffId = resolvedParams?.id;
  if (!staffId) return NextResponse.json({ error: 'Missing staff id' }, { status: 400 });

  if (staffId === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: staffId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (existing.role === 'ADMIN') {
    return NextResponse.json({ error: 'Cannot delete admin accounts' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: staffId } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'DELETE',
      entityType: 'Staff',
      entityId: staffId,
      beforeJson: existing
    }
  });

  return NextResponse.json({ ok: true });
}
