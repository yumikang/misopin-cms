"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface CapacityIndicatorProps {
  /**
   * Remaining capacity in minutes
   */
  remaining: number;

  /**
   * Total capacity in minutes
   */
  total: number;

  /**
   * Percentage of remaining capacity
   */
  percentage?: number;

  /**
   * Capacity status
   */
  status?: 'available' | 'limited' | 'full';

  /**
   * Show compact version (icon only)
   */
  compact?: boolean;

  /**
   * Show progress bar
   */
  showProgress?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

const CapacityIndicator = ({
  remaining,
  total,
  percentage: providedPercentage,
  status: providedStatus,
  compact = false,
  showProgress = false,
  className = ""
}: CapacityIndicatorProps) => {
  // Calculate percentage if not provided
  const percentage = useMemo(() => {
    if (providedPercentage !== undefined) {
      return providedPercentage;
    }
    if (total === 0) return 0;
    return (remaining / total) * 100;
  }, [remaining, total, providedPercentage]);

  // Determine status based on percentage
  const status = useMemo(() => {
    if (providedStatus) return providedStatus;

    if (percentage > 60) return 'available';
    if (percentage > 20) return 'limited';
    return 'full';
  }, [percentage, providedStatus]);

  // Get status config
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'available':
        return {
          label: '여유',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          icon: CheckCircle,
          badgeVariant: 'default' as const
        };
      case 'limited':
        return {
          label: '제한적',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-300',
          icon: AlertTriangle,
          badgeVariant: 'secondary' as const
        };
      case 'full':
        return {
          label: '마감',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300',
          icon: AlertCircle,
          badgeVariant: 'destructive' as const
        };
    }
  }, [status]);

  const Icon = statusConfig.icon;

  // Compact version (icon only)
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 ${className}`}
        title={`${statusConfig.label}: ${Math.round(percentage)}% (${remaining}/${total}분)`}
      >
        <Icon className={`h-3 w-3 ${statusConfig.color}`} />
        <span className={`text-xs font-medium ${statusConfig.color}`}>
          {Math.round(percentage)}%
        </span>
      </div>
    );
  }

  // Full version with details
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Status badge and percentage */}
      <div className="flex items-center justify-between">
        <Badge variant={statusConfig.badgeVariant} className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          <span>{statusConfig.label}</span>
        </Badge>

        <span className={`text-sm font-semibold ${statusConfig.color}`}>
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="space-y-1">
          <Progress
            value={percentage}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>남은 용량: {remaining}분</span>
            <span>전체: {total}분</span>
          </div>
        </div>
      )}

      {/* Simple text info */}
      {!showProgress && (
        <div className="text-xs text-muted-foreground">
          {remaining}분 / {total}분 남음
        </div>
      )}
    </div>
  );
};

export default CapacityIndicator;
