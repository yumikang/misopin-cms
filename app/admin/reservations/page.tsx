"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Phone, Mail, User, FileText, Search } from "lucide-react";

interface Reservation {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  reservation_date: string;
  reservation_time: string;
  department: string;
  doctor_name?: string;
  purpose: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
}

interface ReservationInput {
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  reservation_date: string;
  reservation_time: string;
  department: string;
  doctor_name?: string;
  purpose: string;
  notes?: string;
}

// 상태별 정보
const statusInfo = {
  PENDING: { label: '대기중', color: 'secondary' as const },
  CONFIRMED: { label: '확정', color: 'default' as const },
  COMPLETED: { label: '완료', color: 'outline' as const },
  CANCELLED: { label: '취소', color: 'destructive' as const },
  NO_SHOW: { label: '미방문', color: 'destructive' as const }
};

// 진료 항목 매핑
const serviceTypeLabels: Record<string, string> = {
  'WRINKLE_BOTOX': '주름/보톡스',
  'VOLUME_LIFTING': '볼륨/리프팅',
  'SKIN_CARE': '피부케어',
  'REMOVAL_PROCEDURE': '제거시술',
  'BODY_CARE': '바디케어',
  'OTHER_CONSULTATION': '기타 상담'
};

// 진료과 목록
const departments = [
  '내과', '외과', '정형외과', '피부과', '이비인후과',
  '소아과', '산부인과', '안과', '치과', '가정의학과'
];

// 시간 슬롯
const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  });

  const [formData, setFormData] = useState<ReservationInput>({
    patient_name: "",
    patient_phone: "",
    patient_email: "",
    reservation_date: "",
    reservation_time: "",
    department: "",
    doctor_name: "",
    purpose: "",
    notes: "",
  });

  const fetchReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("date", selectedDate);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterDepartment !== "all") params.append("department", filterDepartment);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/reservations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reservations");
      const data = await response.json();
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterStatus, filterDepartment, searchTerm]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    // Update stats
    const newStats = {
      total: reservations.length,
      pending: reservations.filter(r => r.status === 'PENDING').length,
      confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
      completed: reservations.filter(r => r.status === 'COMPLETED').length,
      cancelled: reservations.filter(r => r.status === 'CANCELLED' || r.status === 'NO_SHOW').length
    };
    setStats(newStats);
  }, [reservations]);

  const fetchAvailableSlots = async (date: string, department: string) => {
    if (!date || !department) {
      setAvailableSlots(timeSlots);
      return;
    }

    try {
      const response = await fetch(
        `/api/reservations?date=${date}&department=${department}`,
        { method: 'OPTIONS' }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots);
      }
    } catch {
      setAvailableSlots(timeSlots);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingReservation
        ? `/api/reservations?id=${editingReservation.id}`
        : "/api/reservations";

      const method = editingReservation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save reservation");
      }

      const result = await response.json();
      setSuccess(result.message || "예약이 저장되었습니다.");

      await fetchReservations();
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reservation");
    }
  };

  const handleStatusUpdate = async (reservation: Reservation, newStatus: Reservation['status']) => {
    try {
      const updateData: { status: Reservation['status']; cancel_reason?: string } = { status: newStatus };

      if (newStatus === 'CANCELLED') {
        const reason = prompt('취소 사유를 입력하세요:');
        if (!reason) return;
        updateData.cancel_reason = reason;
      }

      const response = await fetch(`/api/reservations?id=${reservation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update reservation");
      }

      setSuccess(`예약 상태가 ${statusInfo[newStatus].label}(으)로 변경되었습니다.`);
      await fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reservation");
    }
  };

  // Reserved for future use - delete functionality
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 예약을 취소하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/reservations?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to cancel reservation");

      const result = await response.json();
      setSuccess(result.message);
      await fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel reservation");
    }
  };

  const handleOpenDialog = (reservation?: Reservation) => {
    if (reservation) {
      setEditingReservation(reservation);
      setFormData({
        patient_name: reservation.patient_name,
        patient_phone: reservation.patient_phone,
        patient_email: reservation.patient_email || "",
        reservation_date: reservation.reservation_date,
        reservation_time: reservation.reservation_time,
        department: reservation.department,
        doctor_name: reservation.doctor_name || "",
        purpose: reservation.purpose,
        notes: reservation.notes || "",
      });
      fetchAvailableSlots(reservation.reservation_date, reservation.department);
    } else {
      setEditingReservation(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDate = tomorrow.toISOString().split('T')[0];

      setFormData({
        patient_name: "",
        patient_phone: "",
        patient_email: "",
        reservation_date: defaultDate,
        reservation_time: "",
        department: "",
        doctor_name: "",
        purpose: "",
        notes: "",
      });
      setAvailableSlots(timeSlots);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReservation(null);
    setAvailableSlots(timeSlots);
  };

  const handleViewDetails = (reservation: Reservation) => {
    setViewingReservation(reservation);
    setViewDialogOpen(true);
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
          <p className="text-gray-600 mt-1">진료 예약을 관리합니다</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/reservations/daily-limits')}
          >
            📊 예약 한도 수정
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            새 예약 등록
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">대기중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">확정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">완료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 whitespace-nowrap">취소/미방문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-[200px]"
        />

        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="환자명 또는 전화번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="진료과" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 진료과</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="PENDING">대기중</SelectItem>
            <SelectItem value="CONFIRMED">확정</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="CANCELLED">취소</SelectItem>
            <SelectItem value="NO_SHOW">미방문</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">예약이 없습니다</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>환자 정보</TableHead>
                <TableHead>진료 정보</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{reservation.reservation_time}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{reservation.patient_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        {reservation.patient_phone}
                      </div>
                      {reservation.patient_email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          {reservation.patient_email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {serviceTypeLabels[reservation.department] || reservation.department}
                      </div>
                      {reservation.doctor_name && (
                        <div className="text-sm text-gray-600">{reservation.doctor_name}</div>
                      )}
                      <div className="text-sm">{reservation.purpose}</div>
                      {reservation.notes && (
                        <div className="flex items-start gap-1 text-xs text-gray-500">
                          <FileText className="h-3 w-3 mt-0.5" />
                          <span>{reservation.notes}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo[reservation.status].color}>
                      {statusInfo[reservation.status].label}
                    </Badge>
                    {reservation.cancel_reason && (
                      <div className="text-xs text-gray-500 mt-1">
                        취소: {reservation.cancel_reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(reservation)}
                      >
                        자세히
                      </Button>
                      {reservation.status === 'PENDING' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(reservation, 'CONFIRMED')}
                          >
                            확정
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(reservation)}
                          >
                            수정
                          </Button>
                        </>
                      )}
                      {reservation.status === 'CONFIRMED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(reservation, 'COMPLETED')}
                        >
                          완료
                        </Button>
                      )}
                      {(reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStatusUpdate(reservation, 'CANCELLED')}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingReservation ? "예약 수정" : "새 예약 등록"}
              </DialogTitle>
              <DialogDescription>
                예약 정보를 입력하세요
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_name">환자명 *</Label>
                  <Input
                    id="patient_name"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patient_phone">전화번호 *</Label>
                  <Input
                    id="patient_phone"
                    type="tel"
                    value={formData.patient_phone}
                    onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                    placeholder="010-0000-0000"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="patient_email">이메일</Label>
                <Input
                  id="patient_email"
                  type="email"
                  value={formData.patient_email}
                  onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reservation_date">예약일 *</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={formData.reservation_date}
                    onChange={(e) => {
                      setFormData({ ...formData, reservation_date: e.target.value });
                      fetchAvailableSlots(e.target.value, formData.department);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reservation_time">예약 시간 *</Label>
                  <Select
                    value={formData.reservation_time}
                    onValueChange={(value) => setFormData({ ...formData, reservation_time: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="시간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.map(slot => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">진료과 *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => {
                      setFormData({ ...formData, department: value });
                      fetchAvailableSlots(formData.reservation_date, value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="진료과 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doctor_name">담당 의사</Label>
                  <Input
                    id="doctor_name"
                    value={formData.doctor_name}
                    onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="purpose">진료 목적 *</Label>
                <Input
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="예: 정기 검진, 감기 증상"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="특이사항, 알레르기 정보 등"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingReservation ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>예약 상세 정보</DialogTitle>
            <DialogDescription>
              예약의 모든 정보를 확인할 수 있습니다
            </DialogDescription>
          </DialogHeader>

          {viewingReservation && (
            <div className="grid gap-6 py-4">
              {/* 환자 정보 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">환자 정보</h3>
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div>
                    <Label className="text-xs text-gray-500">환자명</Label>
                    <p className="text-sm font-medium">{viewingReservation.patient_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">전화번호</Label>
                    <p className="text-sm font-medium">{viewingReservation.patient_phone}</p>
                  </div>
                  {viewingReservation.patient_email && (
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500">이메일</Label>
                      <p className="text-sm font-medium">{viewingReservation.patient_email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 예약 정보 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">예약 정보</h3>
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div>
                    <Label className="text-xs text-gray-500">예약일</Label>
                    <p className="text-sm font-medium">{viewingReservation.reservation_date}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">예약 시간</Label>
                    <p className="text-sm font-medium">{viewingReservation.reservation_time}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">진료 항목</Label>
                    <p className="text-sm font-medium">
                      {serviceTypeLabels[viewingReservation.department] || viewingReservation.department}
                    </p>
                  </div>
                  {viewingReservation.doctor_name && (
                    <div>
                      <Label className="text-xs text-gray-500">담당 의사</Label>
                      <p className="text-sm font-medium">{viewingReservation.doctor_name}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">진료 목적</Label>
                    <p className="text-sm font-medium">{viewingReservation.purpose}</p>
                  </div>
                </div>
              </div>

              {/* 희망 진료 사항 */}
              {viewingReservation.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">희망 진료 사항</h3>
                  <div className="pl-4 bg-gray-50 p-4 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{viewingReservation.notes}</p>
                  </div>
                </div>
              )}

              {/* 상태 정보 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">상태 정보</h3>
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div>
                    <Label className="text-xs text-gray-500">예약 상태</Label>
                    <div className="mt-1">
                      <Badge variant={statusInfo[viewingReservation.status].color}>
                        {statusInfo[viewingReservation.status].label}
                      </Badge>
                    </div>
                  </div>
                  {viewingReservation.cancel_reason && (
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500">취소 사유</Label>
                      <p className="text-sm font-medium text-red-600">{viewingReservation.cancel_reason}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-500">등록일</Label>
                    <p className="text-sm">{new Date(viewingReservation.created_at).toLocaleString('ko-KR')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">수정일</Label>
                    <p className="text-sm">{new Date(viewingReservation.updated_at).toLocaleString('ko-KR')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}