"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, AlertCircle, Settings, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// 타입 정의
interface ServiceLimit {
  id: string;
  serviceType: ServiceType;
  softLimit: number;
  hardLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type ServiceType =
  | 'WRINKLE_BOTOX'
  | 'VOLUME_LIFTING'
  | 'SKIN_CARE'
  | 'REMOVAL_PROCEDURE'
  | 'BODY_CARE'
  | 'OTHER_CONSULTATION';

// 시술 타입 한글명
const serviceTypeLabels: Record<ServiceType, string> = {
  'WRINKLE_BOTOX': '주름/보톡스',
  'VOLUME_LIFTING': '볼륨/리프팅',
  'SKIN_CARE': '피부케어',
  'REMOVAL_PROCEDURE': '제거시술',
  'BODY_CARE': '바디케어',
  'OTHER_CONSULTATION': '기타 상담'
};

export default function ReservationLimitsPage() {
  const [limits, setLimits] = useState<ServiceLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLimit, setEditingLimit] = useState<ServiceLimit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    softLimit: 8,
    hardLimit: 10,
  });

  // 데이터 로드
  const loadLimits = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/daily-limits');

      if (!response.ok) {
        throw new Error('한도 데이터를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setLimits(data.limits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      console.error('Error loading limits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLimits();
  }, []);

  // 한도 수정
  const handleSaveLimit = async () => {
    if (!editingLimit) return;

    try {
      if (formData.softLimit > formData.hardLimit) {
        setError('권장 인원은 최대 인원보다 클 수 없습니다.');
        return;
      }

      if (formData.softLimit < 1 || formData.hardLimit < 1) {
        setError('한도는 1 이상이어야 합니다.');
        return;
      }

      const response = await fetch(
        `/api/admin/daily-limits?serviceType=${editingLimit.serviceType}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            softLimit: formData.softLimit,
            hardLimit: formData.hardLimit,
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || '한도 저장에 실패했습니다.');
      }

      const result = await response.json();
      setSuccess(result.message || '한도가 저장되었습니다.');
      setShowDialog(false);
      setEditingLimit(null);
      loadLimits();

      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      console.error('Error saving limit:', err);
    }
  };

  // 활성화 토글
  const handleToggleActive = async (limit: ServiceLimit) => {
    try {
      const response = await fetch(
        `/api/admin/daily-limits?serviceType=${limit.serviceType}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !limit.isActive })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || '상태 변경에 실패했습니다.');
      }

      const result = await response.json();
      setSuccess(result.message || '상태가 변경되었습니다.');
      loadLimits();

      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      console.error('Error toggling active:', err);
    }
  };

  // 수정 모드
  const handleEdit = (limit: ServiceLimit) => {
    setFormData({
      softLimit: limit.softLimit,
      hardLimit: limit.hardLimit,
    });
    setEditingLimit(limit);
    setShowDialog(true);
  };

  // 통계 계산
  const activeLimits = limits.filter(l => l.isActive).length;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">예약 한도 관리</h1>
          <p className="text-gray-500 mt-1">시술별 일일 예약 한도를 설정합니다</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Settings className="w-4 h-4 mr-2" />
          활성: {activeLimits}/6
        </Badge>
      </div>

      {/* 알림 */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* 한도 설정 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>시술별 예약 한도</CardTitle>
          <CardDescription>
            권장 인원: 여유롭게 받을 수 있는 인원 / 최대 인원: 절대 받지 않는 한계
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : limits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">설정된 한도가 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">시술명</TableHead>
                  <TableHead className="text-center">권장 인원</TableHead>
                  <TableHead className="text-center">최대 인원</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-center">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {limits.map((limit) => (
                  <TableRow key={limit.id}>
                    <TableCell className="font-medium">
                      {serviceTypeLabels[limit.serviceType]}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg font-semibold">{limit.softLimit}</span>
                      <span className="text-gray-500 ml-1">명</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg font-semibold">{limit.hardLimit}</span>
                      <span className="text-gray-500 ml-1">명</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={limit.isActive}
                          onCheckedChange={() => handleToggleActive(limit)}
                        />
                        <Badge variant={limit.isActive ? 'default' : 'outline'}>
                          {limit.isActive ? '활성' : '비활성'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(limit)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        수정
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 한도 수정 다이얼로그 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>한도 수정</DialogTitle>
            <DialogDescription>
              {editingLimit && serviceTypeLabels[editingLimit.serviceType]} 시술의 예약 한도를 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="softLimit">권장 인원</Label>
                <Input
                  id="softLimit"
                  type="number"
                  min="1"
                  value={formData.softLimit}
                  onChange={(e) => setFormData({ ...formData, softLimit: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-gray-500">여기까지는 여유롭게 예약 받음</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hardLimit">최대 인원</Label>
                <Input
                  id="hardLimit"
                  type="number"
                  min="1"
                  value={formData.hardLimit}
                  onChange={(e) => setFormData({ ...formData, hardLimit: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-gray-500">이 인원 초과 시 예약 차단</p>
              </div>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>안내:</strong> 이 설정은 모든 날짜에 적용되며, 다시 수정할 때까지 계속 유지됩니다.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>취소</Button>
            <Button onClick={handleSaveLimit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
