import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createCorsResponse } from '@/lib/cors';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {

  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return createCorsResponse(
        { error: 'Year and month parameters are required' },
        400
      );
    }

    // Calculate date range for the month
    const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of the month

    // Fetch reservations for the month
    const reservations = await prisma.reservation.findMany({
      where: {
        reservation_date: {
          gte: startDate.toISOString().split('T')[0],
          lte: endDate.toISOString().split('T')[0]
        },
        status: {
          not: 'CANCELLED'
        }
      },
      select: {
        reservation_date: true,
        reservation_time: true,
        status: true
      }
    });

    // Group reservations by date
    const reservationsByDate: Record<string, any[]> = {};
    reservations.forEach(reservation => {
      if (!reservationsByDate[reservation.reservation_date]) {
        reservationsByDate[reservation.reservation_date] = [];
      }
      reservationsByDate[reservation.reservation_date].push({
        time: reservation.reservation_time,
        status: reservation.status
      });
    });

    // Define available time slots
    const availableTimeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    // Calculate availability for each day
    const availability: Record<string, any> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayReservations = reservationsByDate[dateStr] || [];

      // Check if date is in the past
      if (d < today) {
        availability[dateStr] = {
          status: 'closed',
          availableSlots: [],
          totalSlots: 0,
          message: '예약종료'
        };
        continue;
      }

      // Calculate available slots
      const bookedTimes = dayReservations.map(r => r.time);
      const availableSlots = availableTimeSlots.filter(
        slot => !bookedTimes.includes(slot)
      );

      availability[dateStr] = {
        status: availableSlots.length > 0 ? 'available' : 'full',
        availableSlots: availableSlots,
        totalSlots: availableTimeSlots.length,
        bookedSlots: bookedTimes.length,
        message: availableSlots.length > 0 ? '예약가능' : '예약마감'
      };
    }

    return createCorsResponse({
      year,
      month,
      availability,
      summary: {
        totalDays: Object.keys(availability).length,
        availableDays: Object.values(availability).filter((a: any) => a.status === 'available').length,
        fullDays: Object.values(availability).filter((a: any) => a.status === 'full').length,
        closedDays: Object.values(availability).filter((a: any) => a.status === 'closed').length
      }
    });
  } catch (error) {
    console.error('Error fetching reservation status:', error);
    return createCorsResponse(
      { error: 'Failed to fetch reservation status' },
      500
    );
  }
}

// OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(null, 200);
}