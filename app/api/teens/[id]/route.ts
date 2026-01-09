import { NextRequest, NextResponse } from 'next/server';
import { RegistrationStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireStaffPermission } from '@/lib/permissions-guard';

const toOptional = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('roster_view');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const teen = await prisma.teen.findUnique({ where: { id: params.id } });
  if (!teen) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(teen);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('roster_edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const teenId = resolvedParams?.id;
  if (!teenId) {
    return NextResponse.json({ error: 'Missing teen id' }, { status: 400 });
  }

  const body = await req.json();
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const dobValue = typeof body.dob === 'string' ? body.dob.trim() : '';

  if (!firstName || !lastName || !dobValue) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const dob = new Date(dobValue);
  if (Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
  }

  const existing = await prisma.teen.findUnique({ where: { id: teenId } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const status = Object.values(RegistrationStatus).includes(body.registrationStatus)
    ? (body.registrationStatus as RegistrationStatus)
    : existing.registrationStatus;

  const data = {
    firstName,
    lastName,
    dob,
    email: toOptional(body.teenEmail),
    phone: toOptional(body.teenPhone),
    addressLine1: toOptional(body.addressLine1),
    addressLine2: toOptional(body.addressLine2),
    city: toOptional(body.city),
    state: toOptional(body.state),
    postalCode: toOptional(body.postalCode),
    parish: toOptional(body.parish),
    emergencyContactName: toOptional(body.emergencyContactName),
    emergencyContactPhone: toOptional(body.emergencyContactPhone),
    parentName: toOptional(body.parentName),
    parentEmail: toOptional(body.parentEmail),
    parentPhone: toOptional(body.parentPhone),
    parentRelationship: toOptional(body.parentRelationship),
    registrationStatus: status,
    registrationDataJson: body.registrationDataJson ?? null
  };

  const updated = await prisma.teen.update({
    where: { id: teenId },
    data
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Teen',
      entityId: teenId,
      beforeJson: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        dob: existing.dob,
        email: existing.email,
        phone: existing.phone,
        addressLine1: existing.addressLine1,
        addressLine2: existing.addressLine2,
        city: existing.city,
        state: existing.state,
        postalCode: existing.postalCode,
        parish: existing.parish,
        emergencyContactName: existing.emergencyContactName,
        emergencyContactPhone: existing.emergencyContactPhone,
        parentName: existing.parentName,
        parentEmail: existing.parentEmail,
        parentPhone: existing.parentPhone,
        parentRelationship: existing.parentRelationship,
        registrationStatus: existing.registrationStatus,
        registrationDataJson: existing.registrationDataJson
      },
      afterJson: {
        ...data,
        dob: data.dob.toISOString()
      }
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireStaffPermission('roster_manage');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const teenId = resolvedParams?.id;
  if (!teenId) {
    return NextResponse.json({ error: 'Missing teen id' }, { status: 400 });
  }

  const existing = await prisma.teen.findUnique({ where: { id: teenId } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.teen.delete({ where: { id: teenId } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'DELETE',
      entityType: 'Teen',
      entityId: teenId,
      beforeJson: existing
    }
  });

  return NextResponse.json({ ok: true });
}
