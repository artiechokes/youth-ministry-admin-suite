const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const STAFF_COUNT = 8;
const TEEN_COUNT = 15;
const TEST_PASSWORD = 'test1234';

const firstNames = ['Ava', 'Liam', 'Noah', 'Mia', 'Elijah', 'Amelia', 'Lucas', 'Harper', 'Ethan', 'Grace'];
const lastNames = ['Carter', 'Lopez', 'Nguyen', 'Santos', 'Walker', 'Patel', 'Gomez', 'Miller', 'Kim', 'Reed'];

const pick = (list, index) => list[index % list.length];

const runStamp = Date.now().toString(36);

async function seedStaff(passwordHash) {
  const staffData = Array.from({ length: STAFF_COUNT }).map((_, index) => {
    const firstName = pick(firstNames, index);
    const lastName = pick(lastNames, index + 3);
    const email = `test+staff-${runStamp}-${index + 1}@example.com`;
    const username = `staff_${runStamp}_${index + 1}`;
    const permissions = index % 3 === 0
      ? ['roster_view', 'staff_view']
      : index % 3 === 1
        ? ['roster_edit', 'kiosk_edit', 'staff_view']
        : ['roster_manage', 'kiosk_manage', 'staff_manage'];

    return {
      email,
      username,
      role: 'STAFF',
      passwordHash,
      firstName,
      lastName,
      permissionsJson: permissions,
      title: index % 2 === 0 ? 'Volunteer' : 'Core Team'
    };
  });

  await prisma.user.createMany({ data: staffData, skipDuplicates: true });
}

async function seedTeens() {
  const now = new Date();
  const teensData = Array.from({ length: TEEN_COUNT }).map((_, index) => {
    const firstName = pick(firstNames, index + 2);
    const lastName = pick(lastNames, index + 5);
    const email = `test+teen-${runStamp}-${index + 1}@example.com`;
    const parentEmail = `test+parent-${runStamp}-${index + 1}@example.com`;
    const dob = new Date(now.getFullYear() - 15, index % 12, (index % 27) + 1);

    return {
      firstName,
      lastName,
      dob,
      email,
      phone: `555-010${index}`,
      addressLine1: `${100 + index} Main St`,
      city: 'Harrison',
      state: 'NY',
      postalCode: '10528',
      parentName: `Parent ${lastName}`,
      parentEmail,
      parentPhone: `555-020${index}`,
      parentRelationship: 'Parent',
      emergencyContactName: `Emergency ${lastName}`,
      emergencyContactPhone: `555-030${index}`
    };
  });

  await prisma.teen.createMany({ data: teensData, skipDuplicates: true });
}

async function seedForms() {
  const formsToCreate = [
    {
      name: 'General Release',
      description: 'Standard permission and photo release.',
      category: 'RELEASE',
      validForValue: 1,
      validForUnit: 'YEARS',
      fields: [
        {
          label: 'Release Statement',
          type: 'SECTION',
          helpText:
            'I, $parentName, give permission for $studentName to participate in Sacred Heart Youth Group activities.'
        },
        { label: 'Emergency Contact Phone', type: 'PHONE', required: true },
        { label: 'Photo Release', type: 'CHECKBOX', required: true, optionsJson: { options: ['Yes'], allowOther: false } },
        { label: 'Parent/Guardian Signature', type: 'SIGNATURE', required: true }
      ]
    },
    {
      name: 'Event Registration',
      description: 'Sign up for upcoming events.',
      category: 'EVENT',
      validForValue: 6,
      validForUnit: 'MONTHS',
      fields: [
        {
          label: '$eventName Registration',
          type: 'SECTION',
          helpText:
            'Confirm attendance for $eventName on $eventDate at $eventLocation.'
        },
        { label: 'Preferred Contact Email', type: 'EMAIL', required: true },
        {
          label: 'T-Shirt Size',
          type: 'SELECT',
          required: true,
          optionsJson: { options: ['S', 'M', 'L', 'XL'], allowOther: true }
        },
        {
          label: 'Chaperone Interests',
          type: 'MULTI_SELECT',
          required: false,
          optionsJson: { options: ['Drivers', 'Meals', 'Setup'], allowOther: true }
        }
      ]
    },
    {
      name: 'Medical Notes',
      description: 'Medical needs and medication info.',
      category: 'MEDICAL',
      validForValue: 1,
      validForUnit: 'YEARS',
      fields: [
        { label: 'Primary Physician', type: 'SHORT_TEXT', required: false },
        { label: 'Allergies', type: 'LONG_TEXT', required: false },
        { label: 'Medication Notes', type: 'LONG_TEXT', required: false },
        { label: 'Emergency Contact Name', type: 'SHORT_TEXT', required: true },
        { label: 'Emergency Contact Phone', type: 'PHONE', required: true }
      ]
    }
  ];

  const createdForms = [];
  for (const form of formsToCreate) {
    const created = await prisma.form.create({
      data: {
        name: form.name,
        description: form.description,
        category: form.category,
        validForValue: form.validForValue,
        validForUnit: form.validForUnit,
        fields: {
          create: form.fields.map((field, index) => ({
            label: field.label,
            type: field.type,
            required: Boolean(field.required),
            helpText: field.helpText ?? null,
            optionsJson: field.optionsJson ?? null,
            order: index
          }))
        }
      },
      include: { fields: true }
    });
    createdForms.push(created);
  }

  const teens = await prisma.teen.findMany({ take: Math.min(10, TEEN_COUNT) });
  for (const form of createdForms) {
    for (const teen of teens.slice(0, 5)) {
      const assignment = await prisma.formAssignment.create({
        data: {
          formId: form.id,
          teenId: teen.id,
          required: true,
          dueAt: new Date(Date.now() + 14 * 86400000)
        }
      });

      if (Math.random() > 0.4) {
        const dataJson = buildSubmissionData(form, teen);
        const submission = await prisma.formSubmission.create({
          data: {
            assignmentId: assignment.id,
            formId: form.id,
            teenId: teen.id,
            submittedById: null,
            dataJson,
            expiresAt: new Date(Date.now() + 180 * 86400000)
          }
        });

        await prisma.formAssignment.update({
          where: { id: assignment.id },
          data: { completedAt: submission.submittedAt }
        });
      }
    }
  }
}

function buildSubmissionData(form, teen) {
  const data = {};
  for (const field of form.fields) {
    const { options, allowOther } = parseOptions(field.optionsJson);
    switch (field.type) {
      case 'SECTION':
        break;
      case 'SHORT_TEXT':
        data[field.id] = 'Sample response';
        break;
      case 'LONG_TEXT':
        data[field.id] = 'Sample longer response text for testing.';
        break;
      case 'NUMBER':
        data[field.id] = '3';
        break;
      case 'DATE':
        data[field.id] = new Date().toISOString().slice(0, 10);
        break;
      case 'EMAIL':
        data[field.id] = teen.email || 'test@example.com';
        break;
      case 'PHONE':
        data[field.id] = teen.phone || '5551234567';
        break;
      case 'CHECKBOX':
        if (options.length) {
          data[field.id] = [options[0]];
        } else {
          data[field.id] = true;
        }
        break;
      case 'SELECT':
        if (options.length) {
          data[field.id] = options[0];
        } else {
          data[field.id] = 'Option 1';
        }
        break;
      case 'MULTI_SELECT':
        if (options.length) {
          data[field.id] = [options[0]];
        } else {
          data[field.id] = ['Option 1'];
        }
        break;
      case 'SIGNATURE':
        data[field.id] = { mode: 'type', value: teen.parentName || 'Parent/Guardian' };
        break;
      default:
        data[field.id] = '';
    }

    if (allowOther) {
      data[`${field.id}__other`] = 'Other value';
    }
  }
  return data;
}

function parseOptions(value) {
  if (Array.isArray(value)) {
    return { options: value.map(String), allowOther: false };
  }
  if (value && typeof value === 'object') {
    const options = Array.isArray(value.options) ? value.options.map(String) : [];
    return { options, allowOther: value.allowOther === true };
  }
  return { options: [], allowOther: false };
}

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  await seedStaff(passwordHash);
  await seedTeens();
  await seedForms();

  console.log(`Seeded ${STAFF_COUNT} staff + ${TEEN_COUNT} teens (password: ${TEST_PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
