"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

interface Service {
  code: string;
  label: string;
  duration?: number;
  description?: string;
}

interface ServiceSelectorProps {
  /**
   * Currently selected service code
   */
  value?: string;

  /**
   * Callback when service changes
   */
  onChange: (serviceCode: string) => void;

  /**
   * Disable selector
   */
  disabled?: boolean;

  /**
   * Show label
   */
  showLabel?: boolean;

  /**
   * Custom label text
   */
  label?: string;

  /**
   * Show service details
   */
  showDetails?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Required field indicator
   */
  required?: boolean;
}

// Service definitions based on the system
const SERVICES: Service[] = [
  {
    code: 'WRINKLE_BOTOX',
    label: '주름/보톡스',
    duration: 30,
    description: '주름 개선 및 보톡스 시술'
  },
  {
    code: 'VOLUME_LIFTING',
    label: '볼륨/리프팅',
    duration: 40,
    description: '볼륨 충전 및 리프팅 시술'
  },
  {
    code: 'SKIN_CARE',
    label: '피부케어',
    duration: 50,
    description: '피부 관리 및 케어 시술'
  },
  {
    code: 'REMOVAL_PROCEDURE',
    label: '제거시술',
    duration: 30,
    description: '점, 사마귀 등 제거 시술'
  },
  {
    code: 'BODY_CARE',
    label: '바디케어',
    duration: 60,
    description: '바디 관리 및 케어 시술'
  },
  {
    code: 'OTHER_CONSULTATION',
    label: '기타 상담',
    duration: 20,
    description: '기타 상담 및 문의'
  }
];

const ServiceSelector = ({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  label = '진료 항목',
  showDetails = false,
  className = "",
  required = false
}: ServiceSelectorProps) => {
  // Get selected service details
  const selectedService = useMemo(() => {
    return SERVICES.find(s => s.code === value);
  }, [value]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {showLabel && (
        <Label htmlFor="service-select" className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* Select */}
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id="service-select" className="w-full">
          <SelectValue placeholder="진료 항목을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {SERVICES.map(service => (
            <SelectItem key={service.code} value={service.code}>
              <div className="flex items-center justify-between w-full gap-2">
                <span>{service.label}</span>
                {service.duration && (
                  <Badge variant="outline" className="text-xs">
                    {service.duration}분
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service details */}
      {showDetails && selectedService && (
        <div className="flex items-start gap-2 p-3 bg-muted rounded-md text-sm">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="space-y-1">
            <div className="font-medium">{selectedService.label}</div>
            {selectedService.description && (
              <div className="text-muted-foreground text-xs">
                {selectedService.description}
              </div>
            )}
            {selectedService.duration && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">
                  예상 시간: {selectedService.duration}분
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSelector;
export { SERVICES };
export type { Service, ServiceSelectorProps };
