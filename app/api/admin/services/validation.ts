/**
 * Validation schemas for service CRUD operations
 * Using Zod for runtime validation
 */

import { z } from 'zod';

/**
 * Service creation validation schema
 */
export const ServiceCreateSchema = z.object({
  code: z.string()
    .min(2, "코드는 최소 2자 이상이어야 합니다")
    .max(50, "코드는 최대 50자까지 가능합니다")
    .regex(/^[A-Z_]+$/, "코드는 대문자와 언더스코어만 사용 가능합니다"),

  name: z.string()
    .min(2, "시술명은 최소 2자 이상이어야 합니다")
    .max(100, "시술명은 최대 100자까지 가능합니다"),

  description: z.string()
    .max(500, "설명은 최대 500자까지 가능합니다")
    .optional()
    .nullable(),

  category: z.string()
    .max(50, "카테고리는 최대 50자까지 가능합니다")
    .optional()
    .nullable(),

  durationMinutes: z.number()
    .int("시술 시간은 정수여야 합니다")
    .min(10, "최소 시술 시간은 10분입니다")
    .max(480, "최대 시술 시간은 8시간(480분)입니다"),

  bufferMinutes: z.number()
    .int("준비 시간은 정수여야 합니다")
    .min(0, "준비 시간은 0분 이상이어야 합니다")
    .max(60, "준비 시간은 최대 60분까지 가능합니다")
    .default(10),

  isActive: z.boolean().default(true),

  displayOrder: z.number()
    .int("표시 순서는 정수여야 합니다")
    .min(0, "표시 순서는 0 이상이어야 합니다")
    .optional()
});

/**
 * Service update validation schema
 * All fields are optional, code cannot be changed
 */
export const ServiceUpdateSchema = z.object({
  name: z.string()
    .min(2, "시술명은 최소 2자 이상이어야 합니다")
    .max(100, "시술명은 최대 100자까지 가능합니다")
    .optional(),

  description: z.string()
    .max(500, "설명은 최대 500자까지 가능합니다")
    .optional()
    .nullable(),

  category: z.string()
    .max(50, "카테고리는 최대 50자까지 가능합니다")
    .optional()
    .nullable(),

  durationMinutes: z.number()
    .int("시술 시간은 정수여야 합니다")
    .min(10, "최소 시술 시간은 10분입니다")
    .max(480, "최대 시술 시간은 8시간(480분)입니다")
    .optional(),

  bufferMinutes: z.number()
    .int("준비 시간은 정수여야 합니다")
    .min(0, "준비 시간은 0분 이상이어야 합니다")
    .max(60, "준비 시간은 최대 60분까지 가능합니다")
    .optional(),

  isActive: z.boolean().optional(),

  displayOrder: z.number()
    .int("표시 순서는 정수여야 합니다")
    .min(0, "표시 순서는 0 이상이어야 합니다")
    .optional()
});

/**
 * Service filter/query validation schema
 */
export const ServiceFilterSchema = z.object({
  active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'displayOrder', 'createdAt', 'durationMinutes']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

/**
 * Service reorder validation schema
 */
export const ServiceReorderSchema = z.object({
  services: z.array(
    z.object({
      id: z.string(),
      displayOrder: z.number().int().min(0)
    })
  ).min(1, "최소 1개 이상의 시술이 필요합니다")
});

/**
 * TypeScript type inference from schemas
 */
export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>;
export type ServiceFilterInput = z.infer<typeof ServiceFilterSchema>;
export type ServiceReorderInput = z.infer<typeof ServiceReorderSchema>;
