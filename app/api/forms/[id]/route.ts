import { NextRequest, NextResponse } from 'next/server';
import { FormCategory, FormFieldType, FormStatus, FormValidityUnit } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';

type IncomingField = {
  id?: string;
  label?: string;
  type?: string;
  required?: boolean;
  helpText?: string;
  options?: string[] | string;
  allowOther?: boolean;
  order?: number;
};

const normalizeOptions = (value: IncomingField['options']) => {
  if (Array.isArray(value)) {
    return value.map((option) => option.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((option) => option.trim())
      .filter(Boolean);
  }
  return [];
};

const buildOptionsJson = (options: string[], allowOther?: boolean) => {
  if (!options.length && !allowOther) return null;
  return { options, allowOther: Boolean(allowOther) };
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('forms_view');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const formId = resolvedParams?.id;
  if (!formId) {
    return NextResponse.json({ error: 'Missing form id' }, { status: 400 });
  }

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      fields: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!form) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(form);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('forms_edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const formId = resolvedParams?.id;
  if (!formId) {
    return NextResponse.json({ error: 'Missing form id' }, { status: 400 });
  }

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: { fields: true }
  });

  if (!form) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : null;
  const description =
    typeof body.description === 'string' ? body.description.trim() : body.description === null ? null : undefined;
  const status = Object.values(FormStatus).includes(body.status) ? (body.status as FormStatus) : null;
  const category = Object.values(FormCategory).includes(body.category)
    ? (body.category as FormCategory)
    : body.category === null
      ? null
      : undefined;
  const validForDays =
    body.validForDays === null
      ? null
      : Number.isFinite(body.validForDays) && body.validForDays > 0
        ? Math.floor(body.validForDays)
        : undefined;
  const validForValue =
    body.validForValue === null
      ? null
      : Number.isFinite(body.validForValue) && body.validForValue > 0
        ? Math.floor(body.validForValue)
        : undefined;
  const validForUnit = Object.values(FormValidityUnit).includes(body.validForUnit)
    ? (body.validForUnit as FormValidityUnit)
    : body.validForUnit === null
      ? null
      : undefined;
  const validUntilRaw =
    typeof body.validUntil === 'string' ? body.validUntil.trim() : body.validUntil === null ? null : undefined;
  const validUntil =
    validUntilRaw === null
      ? null
      : typeof validUntilRaw === 'string' && validUntilRaw.length
        ? new Date(validUntilRaw)
        : undefined;

  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: 'Invalid valid-until date.' }, { status: 400 });
  }

  const rawFields = Array.isArray(body.fields) ? (body.fields as IncomingField[]) : [];
  const removedFieldIds = Array.isArray(body.removedFieldIds) ? (body.removedFieldIds as string[]) : [];

  const updates = rawFields
    .map((field, index) => {
      const label = typeof field.label === 'string' ? field.label.trim() : '';
      if (!label) return null;
      const type = Object.values(FormFieldType).includes(field.type as FormFieldType)
        ? (field.type as FormFieldType)
        : FormFieldType.SHORT_TEXT;
      const options = normalizeOptions(field.options);
      return {
        id: field.id,
        data: {
          label,
          type,
          required: Boolean(field.required),
          helpText: typeof field.helpText === 'string' && field.helpText.trim().length ? field.helpText.trim() : null,
          optionsJson: buildOptionsJson(options, field.allowOther),
          order: Number.isFinite(field.order) ? Math.floor(field.order ?? index) : index,
          archivedAt: null
        }
      };
    })
    .filter(Boolean) as Array<{ id?: string; data: Record<string, unknown> }>;

  const fieldIds = new Set(form.fields.map((field) => field.id));

  await prisma.$transaction(async (tx) => {
    await tx.form.update({
      where: { id: form.id },
      data: {
        ...(name !== null ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        status: status ?? form.status,
        ...(category !== undefined ? { category: category ?? form.category } : {}),
        ...(validForValue !== undefined ||
        validForUnit !== undefined ||
        validUntil !== undefined ||
        validForDays !== undefined
          ? {
              validForValue: validForValue ?? validForDays ?? null,
              validForUnit:
                validForValue !== undefined || validForUnit !== undefined || validForDays !== undefined
                  ? (validForValue
                      ? (validForUnit ?? form.validForUnit ?? FormValidityUnit.DAYS)
                      : validForDays
                        ? FormValidityUnit.DAYS
                        : null)
                  : form.validForUnit,
              validUntil: validUntil ?? null
            }
          : {})
      }
    });

    for (const update of updates) {
      if (update.id) {
        if (!fieldIds.has(update.id)) continue;
        await tx.formField.update({
          where: { id: update.id },
          data: update.data
        });
      } else {
        await tx.formField.create({
          data: {
            formId: form.id,
            ...(update.data as {
              label: string;
              type: FormFieldType;
              required: boolean;
              helpText: string | null;
              optionsJson: string[] | null;
              order: number;
              archivedAt: null;
            })
          }
        });
      }
    }

    if (removedFieldIds.length) {
      await tx.formField.updateMany({
        where: { id: { in: removedFieldIds }, formId: form.id },
        data: { archivedAt: new Date() }
      });
    }
  });

  const updated = await prisma.form.findUnique({
    where: { id: form.id },
    include: {
      fields: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' }
      }
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('forms_manage');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const formId = resolvedParams?.id;
  if (!formId) {
    return NextResponse.json({ error: 'Missing form id' }, { status: 400 });
  }

  const existing = await prisma.form.findUnique({ where: { id: formId } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.form.update({
    where: { id: existing.id },
    data: { status: FormStatus.ARCHIVED }
  });

  return NextResponse.json(updated);
}
