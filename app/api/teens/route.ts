import { NextRequest, NextResponse } from 'next/server';
import { RegistrationStatus, Role, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const allowedRoles = new Set([Role.ADMIN, Role.STAFF]);

async function requireStaff() {
  const user = await getSessionUser();
  if (!user?.role || !allowedRoles.has(user.role as Role)) {
    return null;
  }
  return user;
}

// GET /api/teens?search=&status= for admin roster filtering.
export async function GET(req: NextRequest) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get('search')?.trim();
  const status = req.nextUrl.searchParams.get('status');
  const statusFilter = Object.values(RegistrationStatus).includes(status as RegistrationStatus)
    ? (status as RegistrationStatus)
    : undefined;

  const where: Prisma.TeenWhereInput = {};

  if (statusFilter) {
    where.registrationStatus = statusFilter;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { parentEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  const teens = await prisma.teen.findMany({
    where,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  });

  return NextResponse.json(teens);
}
