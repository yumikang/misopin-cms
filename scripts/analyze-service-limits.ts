import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== QUERY 1: Current Service Reservation Limits ===');
  const limits = await prisma.service_reservation_limits.findMany({
    include: {
      service: {
        select: {
          name: true,
          code: true,
          durationMinutes: true,
          bufferMinutes: true
        }
      }
    },
    orderBy: { serviceType: 'asc' }
  });
  
  console.table(limits.map(l => ({
    serviceType: l.serviceType,
    dailyLimit: l.dailyLimit,
    isActive: l.isActive,
    serviceName: l.service?.name || 'N/A',
    durationMin: l.service?.durationMinutes || 'N/A',
    bufferMin: l.service?.bufferMinutes || 'N/A',
    totalMin: l.service ? l.service.durationMinutes + l.service.bufferMinutes : 'N/A'
  })));

  console.log('\n=== QUERY 2: All Services ===');
  const services = await prisma.services.findMany({
    orderBy: { code: 'asc' }
  });
  
  console.table(services.map(s => ({
    code: s.code,
    name: s.name,
    durationMin: s.durationMinutes,
    bufferMin: s.bufferMinutes,
    totalMin: s.durationMinutes + s.bufferMinutes,
    isActive: s.isActive
  })));

  console.log('\n=== QUERY 3: Recent Reservations (Last 7 Days) ===');
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const reservations = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE("preferredDate") as date,
      "serviceId",
      s.name as service_name,
      COUNT(*)::int as count,
      SUM("estimatedDuration")::int as total_minutes
    FROM reservations r
    LEFT JOIN services s ON r."serviceId" = s.id
    WHERE status IN ('PENDING', 'CONFIRMED', 'COMPLETED')
      AND "preferredDate" >= ${weekAgo}
    GROUP BY DATE("preferredDate"), "serviceId", s.name
    ORDER BY date DESC, "serviceId"
  `;
  
  console.table(reservations);

  console.log('\n=== ANALYSIS: Equivalent Time-Based Limits ===');
  limits.forEach(limit => {
    if (limit.service) {
      const totalDuration = limit.service.durationMinutes + limit.service.bufferMinutes;
      const equivalentMinutes = limit.dailyLimit * totalDuration;
      console.log(`${limit.serviceType}: ${limit.dailyLimit}건 × ${totalDuration}분 = ${equivalentMinutes}분/일`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
