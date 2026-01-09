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

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  await seedStaff(passwordHash);
  await seedTeens();

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
