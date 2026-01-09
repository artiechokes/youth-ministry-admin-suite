import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';

export async function POST(req: NextRequest) {
  const user = await requireStaffPermission('forms_edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const teenId = typeof body.teenId === 'string' ? body.teenId.trim() : '';
  const formId = typeof body.formId === 'string' ? body.formId.trim() : '';
  const dueAtValue = typeof body.dueAt === 'string' ? body.dueAt.trim() : '';
  const required = body.required === false ? false : true;
  const allowReassign = body.allowReassign === true;

  if (!teenId || !formId) {
    return NextResponse.json({ error: 'Missing teen or form id.' }, { status: 400 });
  }

  const [teen, form] = await Promise.all([
    prisma.teen.findUnique({ where: { id: teenId } }),
    prisma.form.findUnique({ where: { id: formId } })
  ]);

  if (!teen || !form) {
    return NextResponse.json({ error: 'Invalid teen or form.' }, { status: 404 });
  }

  let dueAt: Date | null = null;
  if (dueAtValue) {
    const parsed = new Date(dueAtValue);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
    }
    dueAt = parsed;
  }

  const existingAssignment = await prisma.formAssignment.findFirst({
    where: { formId: form.id, teenId: teen.id, archivedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      form: {
        include: {
          fields: { where: { archivedAt: null }, orderBy: { order: 'asc' } }
        }
      },
      submissions: { orderBy: { submittedAt: 'desc' }, take: 1 }
    }
  });

  if (existingAssignment) {
    const latest = existingAssignment.submissions[0];
    const expiresAt = latest?.expiresAt ? new Date(latest.expiresAt).getTime() : null;
    const isExpired = latest ? (expiresAt ? expiresAt <= Date.now() : false) : false;

    if (!isExpired && !allowReassign) {
      return NextResponse.json({ error: 'This form is already assigned.' }, { status: 409 });
    }

    await prisma.formAssignment.update({
      where: { id: existingAssignment.id },
      data: { archivedAt: new Date() }
    });
  }

  const assignment = await prisma.formAssignment.create({
    data: {
      formId: form.id,
      teenId: teen.id,
      assignedById: user.id,
      dueAt,
      required
    },
    include: {
      form: {
        include: {
          fields: { where: { archivedAt: null }, orderBy: { order: 'asc' } }
        }
      }
    }
  });

  return NextResponse.json(assignment);
}
