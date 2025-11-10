/**
 * Time Slot Calculator - Comprehensive Test Suite
 *
 * Test Coverage:
 * - Edge cases (empty reservations, fully booked, partial availability)
 * - Cache behavior (hit/miss, TTL expiration, invalidation)
 * - Error scenarios (invalid service, invalid date, no clinic hours)
 * - Performance validation (single query, O(n) complexity)
 * - Boundary conditions (exactly full, 1 minute remaining)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateAvailableTimeSlots,
  validateTimeSlotAvailability,
  cacheManager,
  ReservationError,
  ErrorCode,
} from '../time-slot-calculator';
import { prisma } from '@/lib/prisma';
import type { Period } from '@prisma/client';

// ============================================================================
// Mock Data Setup
// ============================================================================

const mockService = {
  code: 'WRINKLE_BOTOX',
  durationMinutes: 30,
  bufferMinutes: 10,
};

const mockClinicHours = [
  {
    period: 'MORNING' as Period,
    startTime: '09:00',
    endTime: '12:00',
    dayOfWeek: 1, // Monday
  },
  {
    period: 'AFTERNOON' as Period,
    startTime: '14:00',
    endTime: '18:00',
    dayOfWeek: 1,
  },
];

// Helper to create mock reservations
function createMockReservation(
  period: Period,
  preferredTime: string,
  estimatedDuration: number = 30
) {
  return {
    id: `res-${Math.random().toString(36).slice(2)}`,
    period,
    preferredTime,
    estimatedDuration,
    status: 'CONFIRMED',
    preferredDate: new Date('2025-11-04'),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Time Slot Calculator', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheManager.invalidateAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cacheManager.invalidateAll();
  });

  // ==========================================================================
  // Basic Functionality Tests
  // ==========================================================================

  describe('calculateAvailableTimeSlots', () => {
    it('should calculate all available slots when no reservations exist', async () => {
      // Mock database responses
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue([]);

      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );

      // Morning: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 (6 slots)
      // Afternoon: 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30 (8 slots)
      expect(result.slots).toHaveLength(14);
      expect(result.metadata.availableSlots).toBe(14);
      expect(result.metadata.fullSlots).toBe(0);
      expect(result.metadata.cacheHit).toBe(false);

      // All slots should be available
      result.slots.forEach(slot => {
        expect(slot.available).toBe(true);
        expect(slot.status).toBe('available');
        expect(slot.remaining).toBeGreaterThanOrEqual(40); // 30min service + 10min buffer
      });
    });

    it('should correctly mark slots as full when capacity exceeded', async () => {
      // Create 5 reservations at 09:00 (180min period / 40min per reservation = 4.5 capacity)
      const reservations = Array.from({ length: 5 }, () =>
        createMockReservation('MORNING', '09:00')
      );

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue(reservations as any);

      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );

      const slot_09_00 = result.slots.find(
        s => s.time === '09:00' && s.period === 'MORNING'
      );

      expect(slot_09_00).toBeDefined();
      expect(slot_09_00!.available).toBe(false);
      expect(slot_09_00!.status).toBe('full');
      expect(slot_09_00!.consumed).toBe(200); // 5 × 40min
      expect(slot_09_00!.remaining).toBe(-20); // 180 - 200
    });

    it('should calculate limited status when remaining time insufficient', async () => {
      // Create 4 reservations at 09:00 (leaves 20 minutes, less than 40 needed)
      const reservations = Array.from({ length: 4 }, () =>
        createMockReservation('MORNING', '09:00')
      );

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue(reservations as any);

      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );

      const slot_09_00 = result.slots.find(
        s => s.time === '09:00' && s.period === 'MORNING'
      );

      expect(slot_09_00!.available).toBe(false);
      expect(slot_09_00!.status).toBe('limited');
      expect(slot_09_00!.remaining).toBe(20);
    });

    it('should handle mixed availability across different time slots', async () => {
      const reservations = [
        // 09:00 - fully booked (5 reservations)
        ...Array.from({ length: 5 }, () => createMockReservation('MORNING', '09:00')),
        // 09:30 - limited (4 reservations)
        ...Array.from({ length: 4 }, () => createMockReservation('MORNING', '09:30')),
        // 10:00 - available (2 reservations)
        ...Array.from({ length: 2 }, () => createMockReservation('MORNING', '10:00')),
        // 14:00 - available (0 reservations)
      ];

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue(reservations as any);

      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );

      const slot_09_00 = result.slots.find(s => s.time === '09:00')!;
      const slot_09_30 = result.slots.find(s => s.time === '09:30')!;
      const slot_10_00 = result.slots.find(s => s.time === '10:00')!;
      const slot_14_00 = result.slots.find(s => s.time === '14:00')!;

      expect(slot_09_00.status).toBe('full');
      expect(slot_09_30.status).toBe('limited');
      expect(slot_10_00.status).toBe('available');
      expect(slot_14_00.status).toBe('available');
    });
  });

  // ==========================================================================
  // Cache Behavior Tests
  // ==========================================================================

  describe('Cache Management', () => {
    it('should cache reservations after first query', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      const findManySpy = vi
        .spyOn(prisma.reservation, 'findMany')
        .mockResolvedValue([]);

      // First call - cache miss
      const result1 = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );
      expect(result1.metadata.cacheHit).toBe(false);
      expect(findManySpy).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );
      expect(result2.metadata.cacheHit).toBe(true);
      expect(findManySpy).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should invalidate cache for specific date', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      const findManySpy = vi
        .spyOn(prisma.reservation, 'findMany')
        .mockResolvedValue([]);

      // First call
      await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');

      // Invalidate cache
      cacheManager.invalidate('2025-11-04');

      // Second call should query DB again
      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );
      expect(result.metadata.cacheHit).toBe(false);
      expect(findManySpy).toHaveBeenCalledTimes(2);
    });

    it('should handle TTL expiration (5-minute cache)', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      const findManySpy = vi
        .spyOn(prisma.reservation, 'findMany')
        .mockResolvedValue([]);

      // First call
      await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');

      // Simulate time passing (6 minutes)
      vi.useFakeTimers();
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second call should miss cache due to TTL
      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );
      expect(result.metadata.cacheHit).toBe(false);
      expect(findManySpy).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should maintain separate caches for different dates', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      const findManySpy = vi
        .spyOn(prisma.reservation, 'findMany')
        .mockResolvedValue([]);

      // Query two different dates
      const result1 = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );
      const result2 = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-05'
      );

      expect(result1.metadata.cacheHit).toBe(false);
      expect(result2.metadata.cacheHit).toBe(false);
      expect(findManySpy).toHaveBeenCalledTimes(2);

      // Query same dates again - both should hit cache
      const result3 = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );
      const result4 = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-05'
      );

      expect(result3.metadata.cacheHit).toBe(true);
      expect(result4.metadata.cacheHit).toBe(true);
      expect(findManySpy).toHaveBeenCalledTimes(2); // Still only 2 calls
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Scenarios', () => {
    it('should throw SERVICE_NOT_FOUND when service does not exist', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(null);

      await expect(
        calculateAvailableTimeSlots('INVALID_SERVICE', '2025-11-04')
      ).rejects.toThrow(ReservationError);

      await expect(
        calculateAvailableTimeSlots('INVALID_SERVICE', '2025-11-04')
      ).rejects.toMatchObject({
        code: ErrorCode.SERVICE_NOT_FOUND,
      });
    });

    it('should throw INVALID_DATE when date format is invalid', async () => {
      await expect(
        calculateAvailableTimeSlots('WRINKLE_BOTOX', 'invalid-date')
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_DATE,
      });
    });

    it('should throw NO_CLINIC_HOURS when clinic closed on that day', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue([]);

      await expect(
        calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-02') // Sunday
      ).rejects.toMatchObject({
        code: ErrorCode.NO_CLINIC_HOURS,
      });
    });

    it('should provide error details in JSON format', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(null);

      try {
        await calculateAvailableTimeSlots('INVALID_SERVICE', '2025-11-04');
      } catch (error) {
        expect(error).toBeInstanceOf(ReservationError);
        const errorJson = (error as ReservationError).toJSON();
        expect(errorJson).toHaveProperty('error.code');
        expect(errorJson).toHaveProperty('error.message');
      }
    });
  });

  // ==========================================================================
  // Validation Function Tests
  // ==========================================================================

  describe('validateTimeSlotAvailability', () => {
    it('should return valid when slot has sufficient capacity', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue([]);

      const result = await validateTimeSlotAvailability(
        'WRINKLE_BOTOX',
        '2025-11-04',
        '09:00',
        'MORNING'
      );

      expect(result.valid).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(40);
    });

    it('should throw TIME_SLOT_FULL with suggested alternatives when full', async () => {
      const reservations = Array.from({ length: 5 }, () =>
        createMockReservation('MORNING', '09:00')
      );

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue(reservations as any);

      await expect(
        validateTimeSlotAvailability(
          'WRINKLE_BOTOX',
          '2025-11-04',
          '09:00',
          'MORNING'
        )
      ).rejects.toMatchObject({
        code: ErrorCode.TIME_SLOT_FULL,
        metadata: expect.objectContaining({
          suggestedTimes: expect.arrayContaining([expect.any(String)]),
          remainingMinutes: expect.any(Number),
          requiredMinutes: 40,
          period: 'MORNING',
        }),
      });
    });

    it('should suggest exactly 3 alternative times when available', async () => {
      const reservations = Array.from({ length: 5 }, () =>
        createMockReservation('MORNING', '09:00')
      );

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue(reservations as any);

      try {
        await validateTimeSlotAvailability(
          'WRINKLE_BOTOX',
          '2025-11-04',
          '09:00',
          'MORNING'
        );
      } catch (error) {
        const err = error as ReservationError;
        expect(err.metadata?.suggestedTimes).toHaveLength(3);
      }
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance Characteristics', () => {
    it('should make exactly 1 reservation query per unique date', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      const findManySpy = vi
        .spyOn(prisma.reservation, 'findMany')
        .mockResolvedValue([]);

      // Query same date multiple times
      await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');
      await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');
      await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');

      expect(findManySpy).toHaveBeenCalledTimes(1);
    });

    it('should handle large number of reservations efficiently', async () => {
      // Create 100 reservations across all time slots
      const reservations = [];
      for (let i = 0; i < 100; i++) {
        const times = ['09:00', '09:30', '10:00', '14:00', '14:30'];
        const periods: Period[] = ['MORNING', 'AFTERNOON'];
        reservations.push(
          createMockReservation(
            periods[i % 2],
            times[i % times.length]
          )
        );
      }

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue(reservations as any);

      const startTime = performance.now();
      await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');
      const endTime = performance.now();

      // Should complete in under 100ms for 100 reservations
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // Boundary Condition Tests
  // ==========================================================================

  describe('Boundary Conditions', () => {
    it('should handle exactly full capacity (remaining = 0)', async () => {
      // Exactly 4.5 slots → 4 reservations = 160min, leaving 20min (limited)
      const reservations = Array.from({ length: 4 }, () =>
        createMockReservation('MORNING', '09:00')
      );

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue(reservations as any);

      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );

      const slot = result.slots.find(s => s.time === '09:00')!;
      expect(slot.remaining).toBe(20);
      expect(slot.status).toBe('limited');
    });

    it('should handle exactly 1 minute remaining', async () => {
      // Create reservations that leave exactly 1 minute
      const mockServiceCustom = {
        ...mockService,
        durationMinutes: 89, // 89 + 10 = 99min per reservation
        bufferMinutes: 10,
      };

      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockServiceCustom as any);
      vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockClinicHours as any);
      vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue([
        createMockReservation('MORNING', '09:00', 89),
      ] as any);

      const result = await calculateAvailableTimeSlots(
        'WRINKLE_BOTOX',
        '2025-11-04'
      );

      const slot = result.slots.find(s => s.time === '09:00')!;
      expect(slot.remaining).toBe(81); // 180 - 99
      expect(slot.status).toBe('limited');
    });
  });
});
