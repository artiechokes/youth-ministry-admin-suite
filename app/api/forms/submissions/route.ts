import { NextRequest, NextResponse } from 'next/server';
import { FormFieldType, FormValidityUnit } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';
import { formatUsPhone, isValidEmail } from '@/lib/formatters';

export async function POST(req: NextRequest) {
  const user = await requireStaffPermission('forms_edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : '';
  const dataJson = body.dataJson;

  if (!assignmentId) {
    return NextResponse.json({ error: 'Missing assignment id.' }, { status: 400 });
  }

  if (dataJson === null || typeof dataJson !== 'object') {
    return NextResponse.json({ error: 'Invalid submission payload.' }, { status: 400 });
  }

  const assignment = await prisma.formAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      form: { include: { fields: { where: { archivedAt: null }, orderBy: { order: 'asc' } } } },
      submissions: { orderBy: { submittedAt: 'desc' }, take: 1 }
    }
  });

  if (!assignment || assignment.archivedAt) {
    return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  const latest = assignment.submissions[0];
  if (latest) {
    return NextResponse.json({ error: 'Form already completed. Reassign to renew.' }, { status: 409 });
  }

  const formattedData = { ...dataJson } as Record<string, any>;

  for (const field of assignment.form.fields) {
    const value = formattedData[field.id];
    if (value === null || value === undefined || value === '') continue;
    if (field.type === FormFieldType.EMAIL && typeof value === 'string') {
      const trimmed = value.trim();
      if (!isValidEmail(trimmed)) {
        return NextResponse.json({ error: `Invalid email for ${field.label}.` }, { status: 400 });
      }
      formattedData[field.id] = trimmed;
    }
    if (field.type === FormFieldType.PHONE && typeof value === 'string') {
      const formatted = formatUsPhone(value);
      if (!formatted) {
        return NextResponse.json({ error: `Invalid phone number for ${field.label}.` }, { status: 400 });
      }
      formattedData[field.id] = formatted;
    }
  }

  const now = new Date();
  const expiresAt = resolveExpiration(now, assignment.form);

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.formSubmission.create({
      data: {
        assignmentId: assignment.id,
        formId: assignment.formId,
        teenId: assignment.teenId,
        submittedById: user.id,
        dataJson: formattedData,
        expiresAt
      }
    });

    await tx.formAssignment.update({
      where: { id: assignment.id },
      data: { completedAt: new Date() }
    });

    return created;
  });

  return NextResponse.json(submission);
}

function resolveExpiration(base: Date, form: { validForValue: number | null; validForUnit: FormValidityUnit | null; validUntil: Date | null }) {
  if (form.validUntil) return form.validUntil;
  if (!form.validForValue) return null;
  const next = new Date(base);
  switch (form.validForUnit ?? FormValidityUnit.DAYS) {
    case FormValidityUnit.MONTHS:
      next.setMonth(next.getMonth() + form.validForValue);
      return next;
    case FormValidityUnit.YEARS:
      next.setFullYear(next.getFullYear() + form.validForValue);
      return next;
    default:
      next.setDate(next.getDate() + form.validForValue);
      return next;
  }
}
