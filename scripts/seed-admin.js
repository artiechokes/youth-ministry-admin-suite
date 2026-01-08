const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Basic seed script to create the first admin user.
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const username =
    process.env.ADMIN_USERNAME || email.split('@')[0] || 'admin';

  // Hash the password so it matches our credentials auth.
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, username },
    create: {
      email,
      role: 'ADMIN',
      username,
      passwordHash
    }
  });

  console.log(`Seeded admin user: ${email} (${username})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
