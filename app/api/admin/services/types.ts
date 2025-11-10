/**
 * TypeScript types for Service Management API
 */

import { services, service_reservation_limits, Prisma } from '@prisma/client';

/**
 * Service with computed fields and relations
 */
export interface Service extends services {
  totalMinutes: number;
  _count?: {
    reservations: number;
    clinic_time_slots: number;
    manual_time_closures: number;
  };
  service_reservation_limits?: {
    id: string;
    dailyLimitMinutes: number | null;
    isActive: boolean;
  } | null;
}

/**
 * Cascade effects from service changes
 */
export interface CascadeEffects {
  maxBookingsChanged?: {
    before: number;
    after: number;
  };
  affectedDates?: number;
  warnings?: string[];
}

/**
 * Change tracking for updates
 */
export interface ServiceChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
}

export interface ServiceListResponse extends ApiResponse<Service[]> {
  count: number;
}

export interface ServiceMutationResponse extends ApiResponse<Service> {
  changes?: ServiceChange[];
  cascadeEffects?: CascadeEffects;
}

export interface ServiceDeleteResponse extends ApiResponse<Service | null> {
  reasons?: string[];
}

export interface ServiceReorderResponse extends ApiResponse<null> {
  count: number;
}

/**
 * Prisma select types for optimized queries
 */
export const serviceWithRelations = Prisma.validator<Prisma.servicesDefaultArgs>()({
  include: {
    _count: {
      select: {
        reservations: true,
        clinic_time_slots: true,
        manual_time_closures: true
      }
    },
    service_reservation_limits: {
      select: {
        id: true,
        dailyLimitMinutes: true,
        isActive: true
      }
    }
  }
});

export type ServiceWithRelations = Prisma.servicesGetPayload<typeof serviceWithRelations>;
