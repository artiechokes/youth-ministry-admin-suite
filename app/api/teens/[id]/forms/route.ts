import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('forms_view');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const teenId = resolvedParams?.id;
  if (!teenId) {
    return NextResponse.json({ error: 'Missing teen id' }, { status: 400 });
  }
  const teen = await prisma.teen.findUnique({ where: { id: teenId } });
  if (!teen) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const assignments = await prisma.formAssignment.findMany({
    where: { teenId, archivedAt: null },
    include: {
      form: {
        include: {
          fields: {
            where: { archivedAt: null },
            orderBy: { order: 'asc' }
          }
        }
      },
      teen: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dob: true,
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          parish: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          parentName: true,
          parentEmail: true,
          parentPhone: true,
          parentRelationship: true
        }
      },
      submissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(assignments);
}
