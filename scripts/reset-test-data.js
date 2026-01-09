const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const teenDelete = await prisma.teen.deleteMany({
    where: {
      OR: [{ email: { startsWith: 'test+teen-' } }, { parentEmail: { startsWith: 'test+parent-' } }]
    }
  });

  const staffDelete = await prisma.user.deleteMany({
    where: {
      email: { startsWith: 'test+staff-' },
      role: 'STAFF'
    }
  });

  console.log(`Removed ${staffDelete.count} staff and ${teenDelete.count} teens.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
