import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('staff_manage');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await Promise.resolve(params);
  const staffId = resolvedParams?.id;
  if (!staffId) return NextResponse.json({ error: 'Missing staff id' }, { status: 400 });

  if (staffId === user.id) {
    return NextResponse.json({ error: 'Cannot archive your own account' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' && body.reason.trim().length ? body.reason.trim() : 'Manual archive';

  const existing = await prisma.user.findUnique({ where: { id: staffId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (existing.role === 'ADMIN') {
    return NextResponse.json({ error: 'Cannot archive admin accounts' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: staffId },
    data: { archivedAt: new Date(), archivedReason: reason }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'ARCHIVE',
      entityType: 'Staff',
      entityId: staffId,
      beforeJson: { archivedAt: existing.archivedAt, archivedReason: existing.archivedReason },
      afterJson: { archivedAt: updated.archivedAt, archivedReason: updated.archivedReason }
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('staff_manage');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await Promise.resolve(params);
  const staffId = resolvedParams?.id;
  if (!staffId) return NextResponse.json({ error: 'Missing staff id' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { id: staffId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (existing.role === 'ADMIN') {
    return NextResponse.json({ error: 'Cannot restore admin accounts' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: staffId },
    data: { archivedAt: null, archivedReason: null }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'RESTORE',
      entityType: 'Staff',
      entityId: staffId,
      beforeJson: { archivedAt: existing.archivedAt, archivedReason: existing.archivedReason },
      afterJson: { archivedAt: updated.archivedAt, archivedReason: updated.archivedReason }
    }
  });

  return NextResponse.json(updated);
}
