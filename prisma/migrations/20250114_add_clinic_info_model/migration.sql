-- CreateTable
CREATE TABLE "public"."clinic_info" (
    "id" TEXT NOT NULL,
    "phonePrimary" TEXT NOT NULL,
    "phoneSecondary" TEXT,
    "addressFull" TEXT NOT NULL,
    "addressFloor" TEXT,
    "hoursWeekday" TEXT NOT NULL,
    "hoursSaturday" TEXT NOT NULL,
    "hoursSunday" TEXT NOT NULL,
    "hoursLunch" TEXT,
    "hoursSpecialNote" TEXT,
    "snsInstagram" TEXT,
    "snsKakao" TEXT,
    "snsNaverBlog" TEXT,
    "snsFacebook" TEXT,
    "snsYoutube" TEXT,
    "businessRegistration" TEXT NOT NULL,
    "representativeName" TEXT NOT NULL,
    "medicalLicense" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_info_isActive_idx" ON "public"."clinic_info"("isActive");
