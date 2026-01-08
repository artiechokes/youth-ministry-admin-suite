import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Role } from '@prisma/client';

const allowedRoles = new Set([Role.ADMIN, Role.STAFF]);

async function requireStaff() {
  const user = await getSessionUser();
  if (!user?.role || !allowedRoles.has(user.role as Role)) {
    return null;
  }
  return user;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await Promise.resolve(params);
  const teenId = resolvedParams?.id;
  if (!teenId) return NextResponse.json({ error: 'Missing teen id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' && body.reason.trim().length ? body.reason.trim() : 'Manual archive';

  const existing = await prisma.teen.findUnique({ where: { id: teenId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.teen.update({
    where: { id: teenId },
    data: { archivedAt: new Date(), archivedReason: reason }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'ARCHIVE',
      entityType: 'Teen',
      entityId: teenId,
      beforeJson: { archivedAt: existing.archivedAt, archivedReason: existing.archivedReason },
      afterJson: { archivedAt: updated.archivedAt, archivedReason: updated.archivedReason }
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await Promise.resolve(params);
  const teenId = resolvedParams?.id;
  if (!teenId) return NextResponse.json({ error: 'Missing teen id' }, { status: 400 });

  const existing = await prisma.teen.findUnique({ where: { id: teenId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.teen.update({
    where: { id: teenId },
    data: { archivedAt: null, archivedReason: null }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'RESTORE',
      entityType: 'Teen',
      entityId: teenId,
      beforeJson: { archivedAt: existing.archivedAt, archivedReason: existing.archivedReason },
      afterJson: { archivedAt: updated.archivedAt, archivedReason: updated.archivedReason }
    }
  });

  return NextResponse.json(updated);
}
