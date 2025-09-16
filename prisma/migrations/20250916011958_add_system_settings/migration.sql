-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."PopupType" AS ENUM ('MODAL', 'BANNER', 'SLIDE_IN');

-- CreateEnum
CREATE TYPE "public"."BoardType" AS ENUM ('NOTICE', 'EVENT');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "public"."TreatmentType" AS ENUM ('FIRST_VISIT', 'FOLLOW_UP');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reservations" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "public"."Gender" NOT NULL,
    "treatmentType" "public"."TreatmentType" NOT NULL,
    "service" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."popups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "position" JSONB NOT NULL,
    "showOnPages" TEXT[],
    "displayType" "public"."PopupType" NOT NULL DEFAULT 'MODAL',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."board_posts" (
    "id" TEXT NOT NULL,
    "boardType" "public"."BoardType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "author" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "board_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "public"."pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");
