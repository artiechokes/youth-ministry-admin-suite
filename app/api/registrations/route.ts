import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePublicId } from '@/lib/public-id';
import { formatUsPhone, isValidEmail } from '@/lib/formatters';

// Teen-initiated registration creates a pending record we can expand later.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const parentEmail = typeof body.parentEmail === 'string' ? body.parentEmail.trim() : '';
  const teenEmail = typeof body.teenEmail === 'string' ? body.teenEmail.trim() : '';
  const addressLine1 = typeof body.addressLine1 === 'string' ? body.addressLine1.trim() : '';
  const parentName = typeof body.parentName === 'string' ? body.parentName.trim() : '';
  const parentPhone = typeof body.parentPhone === 'string' ? body.parentPhone.trim() : '';
  const parentRelationship = typeof body.parentRelationship === 'string' ? body.parentRelationship.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const state = typeof body.state === 'string' ? body.state.trim() : '';
  const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
  const dobValue = typeof body.dob === 'string' ? body.dob.trim() : '';

  if (
    !firstName ||
    !lastName ||
    !parentEmail ||
    !teenEmail ||
    !addressLine1 ||
    !parentName ||
    !parentPhone ||
    !parentRelationship ||
    !dobValue ||
    !city ||
    !state ||
    !postalCode
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!isValidEmail(teenEmail) || !isValidEmail(parentEmail)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const dob = new Date(dobValue);
  if (Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
  }

  const toOptional = (value: unknown) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const toPhoneOptional = (value: unknown, label: string) => {
    const trimmed = toOptional(value);
    if (!trimmed) return undefined;
    const formatted = formatUsPhone(trimmed);
    if (!formatted) {
      throw new Error(`${label} must be a 10-digit phone number.`);
    }
    return formatted;
  };

  const toPhoneRequired = (value: unknown, label: string) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
      throw new Error(`${label} is required.`);
    }
    const formatted = formatUsPhone(trimmed);
    if (!formatted) {
      throw new Error(`${label} must be a 10-digit phone number.`);
    }
    return formatted;
  };

  let teenPhone: string | undefined;
  let emergencyContactPhone: string | undefined;
  let parentPhoneFormatted: string;
  try {
    teenPhone = toPhoneOptional(body.teenPhone, 'Teen phone');
    emergencyContactPhone = toPhoneOptional(body.emergencyContactPhone, 'Emergency contact phone');
    parentPhoneFormatted = toPhoneRequired(body.parentPhone, 'Parent phone');
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Invalid phone number.' }, { status: 400 });
  }

  let teen = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicId = generatePublicId('T');
    try {
      teen = await prisma.teen.create({
        data: {
          publicId,
          firstName,
          lastName,
          dob,
          email: teenEmail,
          phone: teenPhone,
          addressLine1,
          addressLine2: toOptional(body.addressLine2),
          city,
          state,
          postalCode,
          parish: toOptional(body.parish),
          emergencyContactName: toOptional(body.emergencyContactName),
          emergencyContactPhone,
          parentName,
          parentEmail,
          parentPhone: parentPhoneFormatted,
          parentRelationship,
          registrationDataJson: body.registrationDataJson ?? undefined
        }
      });
      break;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        continue;
      }
      throw error;
    }
  }

  if (!teen) {
    return NextResponse.json({ error: 'Unable to create registration.' }, { status: 500 });
  }

  // TODO: send parent verification email when email provider is configured.

  return NextResponse.json({ teenId: teen.id });
}
