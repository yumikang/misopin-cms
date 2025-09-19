import { useEffect, useRef, useState, useCallback } from 'react';

interface AutoSaveOptions {
  interval?: number; // 자동 저장 간격 (밀리초)
  debounceDelay?: number; // 디바운스 지연 시간 (밀리초)
  onSave: (data: unknown) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface AutoSaveStatus {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions
): AutoSaveStatus {
  const {
    interval = 30000, // 기본 30초
    debounceDelay = 2000, // 기본 2초
    onSave,
    onSuccess,
    onError,
    enabled = true
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>({
    isSaving: false,
    lastSaved: null,
    error: null
  });

  const dataRef = useRef<T>(data);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // 데이터 업데이트
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 저장 함수
  const performSave = useCallback(async () => {
    if (!enabled) return;

    const currentData = JSON.stringify(dataRef.current);

    // 변경사항이 없으면 저장하지 않음
    if (currentData === lastSavedDataRef.current) {
      return;
    }

    setStatus(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      await onSave(dataRef.current);
      lastSavedDataRef.current = currentData;
      setStatus({
        isSaving: false,
        lastSaved: new Date(),
        error: null
      });
      onSuccess?.();
    } catch (error) {
      const errorObj = error as Error;
      setStatus(prev => ({
        ...prev,
        isSaving: false,
        error: errorObj
      }));
      onError?.(errorObj);
    }
  }, [enabled, onSave, onSuccess, onError]);

  // 디바운스된 저장
  const debouncedSave = useCallback(() => {
    if (!enabled) return;

    // 기존 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 새 타이머 설정
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceDelay);
  }, [enabled, debounceDelay, performSave]);

  // 데이터 변경 감지 및 디바운스 저장 실행
  useEffect(() => {
    if (!enabled) return;

    // 초기 데이터와 비교하여 변경사항이 있을 때만 자동저장 시작
    const currentData = JSON.stringify(data);
    if (lastSavedDataRef.current && currentData !== lastSavedDataRef.current) {
      debouncedSave();
    }
  }, [data, debouncedSave, enabled]);

  // 주기적 자동 저장
  useEffect(() => {
    if (!enabled || !interval) return;

    intervalRef.current = setInterval(() => {
      performSave();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, performSave]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return status;
}

// 자동 저장 상태를 표시하는 컴포넌트
export const AutoSaveIndicator: React.FC<{ status: AutoSaveStatus }> = ({ status }) => {
  const { isSaving, lastSaved, error } = status;

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
        저장 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        저장 실패: {error.message}
      </div>
    );
  }

  if (lastSaved) {
    const timeAgo = getTimeAgo(lastSaved);
    return (
      <div className="text-sm text-green-600">
        ✓ {timeAgo} 저장됨
      </div>
    );
  }

  return null;
};

// 시간 차이를 사람이 읽기 쉬운 형식으로 변환
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return '방금';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}