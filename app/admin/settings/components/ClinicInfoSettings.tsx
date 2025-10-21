"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ClinicInfo {
  id: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  addressFull: string;
  addressFloor: string | null;
  hoursWeekday: string;
  hoursSaturday: string;
  hoursSunday: string;
  hoursLunch: string | null;
  hoursSpecialNote: string | null;
  snsInstagram: string | null;
  snsKakao: string | null;
  snsNaverBlog: string | null;
  snsFacebook: string | null;
  snsYoutube: string | null;
  businessRegistration: string;
  representativeName: string;
  medicalLicense: string | null;
  version: number;
  updatedAt: string;
}

export function ClinicInfoSettings() {
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [formData, setFormData] = useState<Partial<ClinicInfo>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchClinicInfo();
  }, []);

  const fetchClinicInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("로그인이 필요합니다");
        return;
      }

      const response = await fetch("/api/admin/clinic-info", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("클리닉 정보를 불러오는데 실패했습니다");
      }

      const data = await response.json();
      setClinicInfo(data.data);
      setFormData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ClinicInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!clinicInfo) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("로그인이 필요합니다");
      }

      const response = await fetch("/api/admin/clinic-info", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "VERSION_CONFLICT") {
          throw new Error(
            "다른 사용자가 정보를 수정했습니다. 페이지를 새로고침해주세요."
          );
        }
        throw new Error(data.error || "저장에 실패했습니다");
      }

      setSuccess("✅ 클리닉 정보가 업데이트되었습니다");
      setHasChanges(false);

      // Refresh data
      await fetchClinicInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("변경사항을 취소하시겠습니까?")) return;
    setFormData(clinicInfo || {});
    setHasChanges(false);
    setSuccess(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">로딩 중...</p>
      </div>
    );
  }

  if (!clinicInfo) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          클리닉 정보를 찾을 수 없습니다. 관리자에게 문의하세요.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 연락처 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
          📞 연락처 정보
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phonePrimary">대표 전화번호 *</Label>
            <Input
              id="phonePrimary"
              value={formData.phonePrimary || ""}
              onChange={(e) => handleChange("phonePrimary", e.target.value)}
              placeholder="061-277-1001"
            />
          </div>

          <div>
            <Label htmlFor="phoneSecondary">보조 전화번호</Label>
            <Input
              id="phoneSecondary"
              value={formData.phoneSecondary || ""}
              onChange={(e) => handleChange("phoneSecondary", e.target.value)}
              placeholder="선택사항"
            />
          </div>
        </div>
      </div>

      {/* 주소 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
          📍 주소 정보
        </h3>

        <div>
          <Label htmlFor="addressFull">주소 *</Label>
          <Input
            id="addressFull"
            value={formData.addressFull || ""}
            onChange={(e) => handleChange("addressFull", e.target.value)}
            placeholder="전남 목포시 영산로 362 미소핀의원"
          />
        </div>

        <div>
          <Label htmlFor="addressFloor">층/호수 정보</Label>
          <Input
            id="addressFloor"
            value={formData.addressFloor || ""}
            onChange={(e) => handleChange("addressFloor", e.target.value)}
            placeholder="2층, 3층"
          />
        </div>
      </div>

      {/* 운영 시간 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
          ⏰ 운영 시간
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hoursWeekday">평일 운영시간 *</Label>
            <Input
              id="hoursWeekday"
              value={formData.hoursWeekday || ""}
              onChange={(e) => handleChange("hoursWeekday", e.target.value)}
              placeholder="평일 08:30 ~ 19:30"
            />
          </div>

          <div>
            <Label htmlFor="hoursSaturday">토요일 운영시간 *</Label>
            <Input
              id="hoursSaturday"
              value={formData.hoursSaturday || ""}
              onChange={(e) => handleChange("hoursSaturday", e.target.value)}
              placeholder="토요일 09:00 ~ 14:00"
            />
          </div>

          <div>
            <Label htmlFor="hoursSunday">일요일/공휴일 *</Label>
            <Input
              id="hoursSunday"
              value={formData.hoursSunday || ""}
              onChange={(e) => handleChange("hoursSunday", e.target.value)}
              placeholder="일요일, 공휴일 휴무"
            />
          </div>

          <div>
            <Label htmlFor="hoursLunch">점심시간</Label>
            <Input
              id="hoursLunch"
              value={formData.hoursLunch || ""}
              onChange={(e) => handleChange("hoursLunch", e.target.value)}
              placeholder="점심시간 12:00-14:00"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="hoursSpecialNote">특이사항</Label>
          <Input
            id="hoursSpecialNote"
            value={formData.hoursSpecialNote || ""}
            onChange={(e) => handleChange("hoursSpecialNote", e.target.value)}
            placeholder="수요일 08:30 ~ 12:00"
          />
        </div>
      </div>

      {/* SNS 링크 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
          🔗 SNS 링크
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="snsInstagram">Instagram</Label>
            <Input
              id="snsInstagram"
              value={formData.snsInstagram || ""}
              onChange={(e) => handleChange("snsInstagram", e.target.value)}
              placeholder="https://www.instagram.com/misopin_clinic/"
            />
          </div>

          <div>
            <Label htmlFor="snsKakao">Kakao 채널</Label>
            <Input
              id="snsKakao"
              value={formData.snsKakao || ""}
              onChange={(e) => handleChange("snsKakao", e.target.value)}
              placeholder="http://pf.kakao.com/_xjxeLxj"
            />
          </div>

          <div>
            <Label htmlFor="snsNaverBlog">Naver Blog</Label>
            <Input
              id="snsNaverBlog"
              value={formData.snsNaverBlog || ""}
              onChange={(e) => handleChange("snsNaverBlog", e.target.value)}
              placeholder="https://blog.naver.com/integrate725"
            />
          </div>
        </div>
      </div>

      {/* 사업자 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
          🏢 사업자 정보
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="businessRegistration">사업자등록번호 *</Label>
            <Input
              id="businessRegistration"
              value={formData.businessRegistration || ""}
              onChange={(e) =>
                handleChange("businessRegistration", e.target.value)
              }
              placeholder="123-56-789"
            />
          </div>

          <div>
            <Label htmlFor="representativeName">대표자명 *</Label>
            <Input
              id="representativeName"
              value={formData.representativeName || ""}
              onChange={(e) =>
                handleChange("representativeName", e.target.value)
              }
              placeholder="김지식"
            />
          </div>

          <div>
            <Label htmlFor="medicalLicense">의료기관 인허가번호</Label>
            <Input
              id="medicalLicense"
              value={formData.medicalLicense || ""}
              onChange={(e) => handleChange("medicalLicense", e.target.value)}
              placeholder="선택사항"
            />
          </div>
        </div>
      </div>

      {/* 버전 정보 */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <p>버전: {clinicInfo.version}</p>
        <p>마지막 수정: {new Date(clinicInfo.updatedAt).toLocaleString("ko-KR")}</p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
          변경사항 취소
        </Button>

        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? "저장 중..." : "변경사항 저장"}
        </Button>
      </div>
    </div>
  );
}
