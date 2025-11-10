"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ServicesPage from "@/app/admin/services/page";

export default function ReservationSettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/reservations")}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              예약 관리로 돌아가기
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">시술 관리</h1>
              <p className="text-sm text-gray-600">의료 시술 항목을 관리합니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <ServicesPage />
      </div>
    </div>
  );
}
