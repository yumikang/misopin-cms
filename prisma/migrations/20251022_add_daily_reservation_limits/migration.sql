-- CreateTable
CREATE TABLE "public"."daily_reservation_limits" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "hardLimit" INTEGER NOT NULL DEFAULT 10,
    "softLimit" INTEGER NOT NULL DEFAULT 8,
    "currentReservations" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "daily_reservation_limits_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."reservations" ADD COLUMN "dailyLimitSnapshot" INTEGER;
ALTER TABLE "public"."reservations" ADD COLUMN "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."reservations" ADD COLUMN "statusChangedBy" TEXT;

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'NO_SHOW';
ALTER TYPE "ReservationStatus" ADD VALUE 'REJECTED';

-- CreateIndex
CREATE UNIQUE INDEX "daily_reservation_limits_date_serviceType_key" ON "public"."daily_reservation_limits"("date", "serviceType");

-- CreateIndex
CREATE INDEX "daily_reservation_limits_date_serviceType_isActive_idx" ON "public"."daily_reservation_limits"("date", "serviceType", "isActive");

-- CreateIndex
CREATE INDEX "daily_reservation_limits_date_idx" ON "public"."daily_reservation_limits"("date");

-- CreateIndex
CREATE INDEX "reservations_preferredDate_service_status_idx" ON "public"."reservations"("preferredDate", "service", "status");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "public"."reservations"("status");
