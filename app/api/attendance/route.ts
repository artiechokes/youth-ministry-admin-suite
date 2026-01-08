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

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET returns today's attendance records grouped by teen.
export async function GET() {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { start, end } = getTodayRange();

  const records = await prisma.attendanceRecord.findMany({
    where: {
      checkInAt: { gte: start, lte: end }
    },
    orderBy: { checkInAt: 'asc' }
  });

  return NextResponse.json(records);
}

// POST handles check-in or check-out for selected teens.
export async function POST(req: NextRequest) {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const teenIds = Array.isArray(body.teenIds) ? body.teenIds.filter(Boolean) : [];
  const action = body.action === 'checkout' ? 'checkout' : 'checkin';

  if (!teenIds.length) {
    return NextResponse.json({ error: 'No teens selected' }, { status: 400 });
  }

  const now = new Date();
  const { start, end } = getTodayRange();

  if (action === 'checkin') {
    const existingOpen = await prisma.attendanceRecord.findMany({
      where: {
        teenId: { in: teenIds },
        checkInAt: { gte: start, lte: end },
        checkOutAt: null
      }
    });

    const openIds = new Set(existingOpen.map((record) => record.teenId));
    const toCreate = teenIds.filter((id: string) => !openIds.has(id));

    await prisma.attendanceRecord.createMany({
      data: toCreate.map((id: string) => ({
        teenId: id,
        checkInAt: now
      }))
    });

    return NextResponse.json({ ok: true, created: toCreate.length });
  }

  await prisma.attendanceRecord.updateMany({
    where: {
      teenId: { in: teenIds },
      checkInAt: { gte: start, lte: end },
      checkOutAt: null
    },
    data: { checkOutAt: now }
  });

  return NextResponse.json({ ok: true });
}
