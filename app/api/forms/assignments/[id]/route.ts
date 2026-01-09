import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('forms_edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const assignmentId = resolvedParams?.id;
  if (!assignmentId) {
    return NextResponse.json({ error: 'Missing assignment id' }, { status: 400 });
  }

  const assignment = await prisma.formAssignment.findUnique({
    where: { id: assignmentId },
    include: { submissions: { orderBy: { submittedAt: 'desc' }, take: 1 } }
  });
  if (!assignment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const latest = assignment.submissions[0];
  if (latest) {
    return NextResponse.json({ error: 'Completed forms cannot be unassigned.' }, { status: 409 });
  }

  const updated = await prisma.formAssignment.update({
    where: { id: assignment.id },
    data: { archivedAt: new Date() }
  });

  return NextResponse.json(updated);
}
