import { useState, useEffect } from 'react';
import { WebBuilderAction, createWebBuilderUserContext, WebBuilderUserContext } from '@/lib/middleware/auth';

interface UsePermissionsResult {
  user: WebBuilderUserContext | null;
  loading: boolean;
  error: string | null;
  hasPermission: (action: WebBuilderAction) => boolean;
  hasAnyPermission: (actions: WebBuilderAction[]) => boolean;
  hasAllPermissions: (actions: WebBuilderAction[]) => boolean;
  canViewWebBuilder: boolean;
  canCreateBlocks: boolean;
  canEditBlocks: boolean;
  canDeleteBlocks: boolean;
  canManagePages: boolean;
  canManageSEO: boolean;
  canViewVersions: boolean;
  canRestoreVersions: boolean;
  canDeleteVersions: boolean;
  canManageTemplates: boolean;
  canManageGlobalBlocks: boolean;
  canPublishContent: boolean;
}

/**
 * 웹빌더 권한 관리를 위한 React Hook
 */
export function usePermissions(): UsePermissionsResult {
  const [user, setUser] = useState<WebBuilderUserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 토큰에서 사용자 정보 가져오기
    const fetchUserPermissions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        // 토큰을 사용해 사용자 정보 가져오기
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          const userContext = createWebBuilderUserContext(userData.user);
          setUser(userContext);
        } else {
          setError('사용자 정보를 불러올 수 없습니다.');
        }
      } catch (err) {
        setError('권한 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, []);

  const hasPermission = (action: WebBuilderAction): boolean => {
    return user?.can(action) || false;
  };

  const hasAnyPermission = (actions: WebBuilderAction[]): boolean => {
    return user?.canAny(actions) || false;
  };

  const hasAllPermissions = (actions: WebBuilderAction[]): boolean => {
    return user?.canAll(actions) || false;
  };

  return {
    user,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // 주요 권한들을 쉽게 확인할 수 있는 편의 프로퍼티
    canViewWebBuilder: hasPermission('VIEW_WEBBUILDER'),
    canCreateBlocks: hasPermission('CREATE_BLOCKS'),
    canEditBlocks: hasPermission('EDIT_BLOCKS'),
    canDeleteBlocks: hasPermission('DELETE_BLOCKS'),
    canManagePages: hasPermission('MANAGE_PAGES'),
    canManageSEO: hasPermission('MANAGE_SEO'),
    canViewVersions: hasPermission('VIEW_VERSIONS'),
    canRestoreVersions: hasPermission('RESTORE_VERSIONS'),
    canDeleteVersions: hasPermission('DELETE_VERSIONS'),
    canManageTemplates: hasPermission('MANAGE_TEMPLATES'),
    canManageGlobalBlocks: hasPermission('GLOBAL_BLOCKS'),
    canPublishContent: hasPermission('PUBLISH_CONTENT')
  };
}

/**
 * 권한이 없을 때 표시할 UI 컴포넌트
 */
export function PermissionDenied({ action, message }: { action?: WebBuilderAction; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold mb-2">접근 권한이 없습니다</h2>
      <p className="text-gray-600 mb-4">
        {message || (action ? `'${action}' 작업을 수행할 권한이 없습니다.` : '이 기능에 접근할 권한이 없습니다.')}
      </p>
      <p className="text-sm text-gray-500">
        필요한 권한이 있다고 생각되시면 관리자에게 문의하세요.
      </p>
    </div>
  );
}

/**
 * 권한 기반 조건부 렌더링 컴포넌트
 */
interface PermissionGateProps {
  requiredActions: WebBuilderAction[];
  requireAll?: boolean; // true면 모든 권한 필요, false면 하나라도 있으면 됨
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  requiredActions,
  requireAll = false,
  fallback = null,
  children
}: PermissionGateProps) {
  const { hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return <div className="animate-pulse">권한 확인 중...</div>;
  }

  const hasRequiredPermissions = requireAll
    ? hasAllPermissions(requiredActions)
    : hasAnyPermission(requiredActions);

  if (!hasRequiredPermissions) {
    return <>{fallback || <PermissionDenied />}</>;
  }

  return <>{children}</>;
}