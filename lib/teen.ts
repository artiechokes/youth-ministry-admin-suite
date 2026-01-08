import { PrismaClient } from '@prisma/client';

// Auto-archive teens who are 18 or older whenever staff views admin lists.
export async function autoArchiveAdults(prisma: PrismaClient) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);

  await prisma.teen.updateMany({
    where: {
      archivedAt: null,
      dob: { lte: cutoff }
    },
    data: {
      archivedAt: new Date(),
      archivedReason: 'Auto-archived at 18'
    }
  });
}
