const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePublicId(prefix, length = 6) {
  const bytes = crypto.randomBytes(length);
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]);
  return `${prefix}-${chars.join('')}`;
}

async function backfill() {
  const teens = await prisma.teen.findMany({
    where: { publicId: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' }
  });

  for (const teen of teens) {
    let updated = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const publicId = generatePublicId('T');
      try {
        await prisma.teen.update({
          where: { id: teen.id },
          data: { publicId }
        });
        updated = true;
        break;
      } catch (error) {
        if (error?.code === 'P2002') continue;
        throw error;
      }
    }
    if (!updated) {
      throw new Error(`Unable to assign publicId for teen ${teen.id}`);
    }
  }
}

backfill()
  .then(() => {
    console.log('Backfill complete.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
