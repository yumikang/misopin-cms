import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = db
}

// 타입 안전성을 위한 데이터베이스 헬퍼 함수들
export const dbHelpers = {
  // 안전한 findUnique 헬퍼
  findUniqueOrThrow: async <T extends keyof PrismaClient>(
    model: T,
    args: Parameters<PrismaClient[T]['findUnique']>[0]
  ) => {
    const result = await (db[model] as PrismaClient[T]).findUnique(args)
    if (!result) {
      throw new Error(`${String(model)} not found`)
    }
    return result
  },

  // 페이지네이션 헬퍼
  paginate: (page: number, limit: number = 10) => ({
    skip: (page - 1) * limit,
    take: limit
  })
}