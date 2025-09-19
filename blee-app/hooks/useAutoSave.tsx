'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// 자동저장 상태 타입 정의
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

// AutoSave 훅 옵션 인터페이스
export interface UseAutoSaveOptions {
  interval?: number;        // 자동저장 주기 (ms)
  debounceDelay?: number;   // 디바운스 지연 시간 (ms)
  enabled?: boolean;        // 자동저장 활성화 여부
  onSave?: () => Promise<void> | void;     // 저장 함수
  onSuccess?: () => void;   // 저장 성공 콜백
  onError?: (error: Error) => void;  // 저장 실패 콜백
}

// useAutoSave 훅 구현
export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions = {}
): AutoSaveStatus {
  const {
    interval = 30000,
    debounceDelay = 2000,
    enabled = true,
    onSave,
    onSuccess,
    onError
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedData, setLastSavedData] = useState<T>(data);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const intervalTimer = useRef<NodeJS.Timeout | null>(null);
  const isSaving = useRef(false);

  // 데이터 변경 감지 및 디바운스 처리
  const hasDataChanged = useCallback(() => {
    return JSON.stringify(data) !== JSON.stringify(lastSavedData);
  }, [data, lastSavedData]);

  // 실제 저장 함수
  const performSave = useCallback(async () => {
    if (!enabled || !onSave || isSaving.current) {
      return;
    }

    try {
      isSaving.current = true;
      setStatus('saving');

      await onSave();

      setStatus('saved');
      setLastSavedData(data);
      onSuccess?.();

      // 2초 후에 saved 상태를 idle로 변경
      setTimeout(() => {
        setStatus('idle');
      }, 2000);

    } catch (error) {
      setStatus('error');
      onError?.(error as Error);

      // 5초 후에 error 상태를 idle로 변경
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    } finally {
      isSaving.current = false;
    }
  }, [enabled, onSave, data, onSuccess, onError]);

  // 디바운스된 저장 함수
  const debouncedSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!hasDataChanged()) {
      return;
    }

    setStatus('pending');

    debounceTimer.current = setTimeout(() => {
      performSave();
    }, debounceDelay);
  }, [hasDataChanged, performSave, debounceDelay]);

  // 데이터 변경 시 디바운스된 저장 트리거
  useEffect(() => {
    if (enabled && hasDataChanged()) {
      debouncedSave();
    }
  }, [data, enabled, debouncedSave, hasDataChanged]);

  // 주기적 자동저장 설정
  useEffect(() => {
    if (!enabled || !interval) {
      return;
    }

    intervalTimer.current = setInterval(() => {
      if (hasDataChanged() && status !== 'saving') {
        performSave();
      }
    }, interval);

    return () => {
      if (intervalTimer.current) {
        clearInterval(intervalTimer.current);
      }
    };
  }, [enabled, interval, hasDataChanged, performSave, status]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (intervalTimer.current) {
        clearInterval(intervalTimer.current);
      }
    };
  }, []);

  return status;
}

// AutoSaveIndicator 컴포넌트
export interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  className?: string;
}

export function AutoSaveIndicator({ status, className = '' }: AutoSaveIndicatorProps) {
  const getStatusConfig = (status: AutoSaveStatus) => {
    switch (status) {
      case 'pending':
        return {
          text: '변경사항 감지됨',
          icon: '⏳',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
      case 'saving':
        return {
          text: '저장 중...',
          icon: '🔄',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      case 'saved':
        return {
          text: '저장됨',
          icon: '✅',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          text: '저장 실패',
          icon: '❌',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      case 'idle':
      default:
        return {
          text: '모든 변경사항 저장됨',
          icon: '💾',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);

  // 저장 중일 때 회전 애니메이션 적용
  const iconClass = status === 'saving' ? 'animate-spin' : '';

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}
      `}
    >
      <span className={iconClass}>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
}

export default useAutoSave;