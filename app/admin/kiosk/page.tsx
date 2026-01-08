import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { autoArchiveAdults } from '@/lib/teen';
import { KioskClient } from './kiosk-client';

// Kiosk page for touch-friendly attendance check-in/out.
export default async function KioskPage() {
  await requireAdmin();
  await autoArchiveAdults(prisma);

  const teens = await prisma.teen.findMany({
    where: { archivedAt: null },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      checkInAt: { gte: today, lt: tomorrow }
    }
  });

  return <KioskClient teens={teens} attendance={attendance} />;
}
