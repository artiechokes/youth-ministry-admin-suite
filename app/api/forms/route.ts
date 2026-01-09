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

export async function GET() {
  const user = await requireStaffPermission('forms_view');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const forms = await prisma.form.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fields: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' }
      }
    }
  });

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const user = await requireStaffPermission('forms_edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const status = Object.values(FormStatus).includes(body.status) ? (body.status as FormStatus) : FormStatus.ACTIVE;
  const category = Object.values(FormCategory).includes(body.category) ? (body.category as FormCategory) : FormCategory.GENERAL;
  const validForDays =
    Number.isFinite(body.validForDays) && body.validForDays > 0 ? Math.floor(body.validForDays) : null;
  const validForValue =
    Number.isFinite(body.validForValue) && body.validForValue > 0 ? Math.floor(body.validForValue) : null;
  const validForUnit = Object.values(FormValidityUnit).includes(body.validForUnit)
    ? (body.validForUnit as FormValidityUnit)
    : null;
  const validUntilRaw = typeof body.validUntil === 'string' ? body.validUntil.trim() : '';
  const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;

  if (!name) {
    return NextResponse.json({ error: 'Form name is required.' }, { status: 400 });
  }
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: 'Invalid valid-until date.' }, { status: 400 });
  }

  const rawFields = Array.isArray(body.fields) ? (body.fields as IncomingField[]) : [];
  const fields = rawFields
    .map((field, index) => {
      const label = typeof field.label === 'string' ? field.label.trim() : '';
      if (!label) return null;
      const type = Object.values(FormFieldType).includes(field.type as FormFieldType)
        ? (field.type as FormFieldType)
        : FormFieldType.SHORT_TEXT;
      const options = normalizeOptions(field.options);
      return {
        label,
        type,
        required: Boolean(field.required),
        helpText: typeof field.helpText === 'string' && field.helpText.trim().length ? field.helpText.trim() : null,
        optionsJson: buildOptionsJson(options, field.allowOther),
        order: Number.isFinite(field.order) ? Math.floor(field.order ?? index) : index
      };
    })
    .filter(Boolean) as Array<{
    label: string;
    type: FormFieldType;
    required: boolean;
    helpText: string | null;
    optionsJson: string[] | null;
    order: number;
  }>;

  const created = await prisma.form.create({
    data: {
      name,
      description,
      status,
      category,
      validForValue: validForValue ?? validForDays,
      validForUnit: validForValue ? validForUnit ?? FormValidityUnit.DAYS : validForDays ? FormValidityUnit.DAYS : null,
      validUntil,
      createdById: user.id,
      fields: fields.length ? { create: fields } : undefined
    },
    include: {
      fields: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' }
      }
    }
  });

  return NextResponse.json(created);
}
