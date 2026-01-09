import { NextRequest, NextResponse } from 'next/server';
import { RegistrationStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';

// GET /api/teens?search=&status= for admin roster filtering.
export async function GET(req: NextRequest) {
  const user = await requireStaffPermission('roster_view');
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
