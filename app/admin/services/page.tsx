"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, RefreshCw } from "lucide-react";
import { ServiceList } from "./components/ServiceList";
import { ServiceForm } from "./components/ServiceForm";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import { Service, ServiceListResponse } from "@/app/api/admin/services/types";
import { useToast } from "@/hooks/use-toast";

export default function ServicesPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'name' | 'duration' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "오류",
          description: "로그인이 필요합니다",
          variant: "destructive",
        });
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("active", statusFilter === "active" ? "true" : "false");
      }
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      const response = await fetch(`/api/admin/services?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("시술 목록을 불러오는데 실패했습니다");
      }

      const data: ServiceListResponse = await response.json();
      setServices(data.data || []);
    } catch (err) {
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "시술 목록 로드 실패",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingService(null);
    setFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormOpen(true);
  };

  const handleDelete = (service: Service) => {
    setDeletingService(service);
    setDeleteDialogOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingService(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchServices();
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setDeletingService(null);
    fetchServices();
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeletingService(null);
  };

  // Get unique categories from services
  const categories = Array.from(
    new Set(services.map((s) => s.category).filter((c): c is string => !!c))
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">시술 관리</h1>
          <p className="text-gray-600 mt-1">의료 시술 항목을 관리합니다</p>
        </div>
        <Button onClick={handleCreate} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />새 시술 추가
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="시술명 또는 코드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 카테고리</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="inactive">비활성</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as 'name' | 'duration' | 'createdAt')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">이름순</SelectItem>
            <SelectItem value="duration">시간순</SelectItem>
            <SelectItem value="createdAt">등록일순</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={fetchServices}
          title="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Service List */}
      <ServiceList
        services={services}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Service Form Dialog */}
      <ServiceForm
        open={formOpen}
        service={editingService}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      {deletingService && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          service={deletingService}
          onConfirm={handleDeleteSuccess}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
