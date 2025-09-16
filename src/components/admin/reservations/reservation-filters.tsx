"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCcw, Calendar } from "lucide-react";

export function ReservationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "all",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
  });

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    // 페이지를 1로 리셋
    params.set("page", "1");

    router.push(`/admin/reservations?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      startDate: "",
      endDate: "",
    });
    router.push("/admin/reservations");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* 검색어 */}
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="search">검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="환자명, 연락처, 진료내용 검색"
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>

          {/* 상태 필터 */}
          <div className="space-y-2">
            <Label htmlFor="status">상태</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="PENDING">대기</SelectItem>
                <SelectItem value="CONFIRMED">확정</SelectItem>
                <SelectItem value="COMPLETED">완료</SelectItem>
                <SelectItem value="CANCELLED">취소</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 시작 날짜 */}
          <div className="space-y-2">
            <Label htmlFor="startDate">시작일</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="startDate"
                type="date"
                className="pl-10"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
          </div>

          {/* 종료 날짜 */}
          <div className="space-y-2">
            <Label htmlFor="endDate">종료일</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="endDate"
                type="date"
                className="pl-10"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex flex-col justify-end space-y-2">
            <Button onClick={applyFilters} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              검색
            </Button>
            <Button onClick={resetFilters} variant="outline" className="w-full">
              <RefreshCcw className="h-4 w-4 mr-2" />
              초기화
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}