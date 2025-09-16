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
import { Search, RefreshCcw } from "lucide-react";

export function PopupFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    active: searchParams.get("active") || "all",
  });

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.active && filters.active !== "all") params.set("active", filters.active);

    // 페이지를 1로 리셋
    params.set("page", "1");

    router.push(`/admin/popups?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      active: "all",
    });
    router.push("/admin/popups");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 검색어 */}
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="search">검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="팝업 제목, 내용 검색"
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>

          {/* 활성화 상태 필터 */}
          <div className="space-y-2">
            <Label htmlFor="active">상태</Label>
            <Select
              value={filters.active}
              onValueChange={(value) => setFilters({ ...filters, active: value })}
            >
              <SelectTrigger id="active">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="true">활성화</SelectItem>
                <SelectItem value="false">비활성화</SelectItem>
              </SelectContent>
            </Select>
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