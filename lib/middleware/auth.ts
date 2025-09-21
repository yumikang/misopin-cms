import { NextRequest } from 'next/server';
import { AuthenticatedUser } from '@/lib/auth';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
export type WebBuilderAction =
  | 'VIEW_WEBBUILDER'      // 웹빌더 페이지 접근
  | 'CREATE_BLOCKS'        // 블록 생성
  | 'EDIT_BLOCKS'          // 블록 편집
  | 'DELETE_BLOCKS'        // 블록 삭제
  | 'MANAGE_PAGES'         // 페이지 관리
  | 'MANAGE_SEO'           // SEO 설정 관리
  | 'VIEW_VERSIONS'        // 버전 히스토리 조회
  | 'RESTORE_VERSIONS'     // 버전 복원
  | 'DELETE_VERSIONS'      // 버전 삭제
  | 'MANAGE_TEMPLATES'     // 템플릿 관리
  | 'GLOBAL_BLOCKS'        // 글로벌 블록 관리
  | 'BLOCK_SETTINGS'       // 블록 고급 설정
  | 'PUBLISH_CONTENT'      // 콘텐츠 게시
  | 'PREVIEW_CONTENT';     // 콘텐츠 미리보기

/**
 * 역할 기반 권한 매트릭스 - 각 역할별로 허용되는 작업 정의
 */
export const RBAC_PERMISSIONS: Record<UserRole, WebBuilderAction[]> = {
  SUPER_ADMIN: [
    'VIEW_WEBBUILDER',
    'CREATE_BLOCKS',
    'EDIT_BLOCKS',
    'DELETE_BLOCKS',
    'MANAGE_PAGES',
    'MANAGE_SEO',
    'VIEW_VERSIONS',
    'RESTORE_VERSIONS',
    'DELETE_VERSIONS',
    'MANAGE_TEMPLATES',
    'GLOBAL_BLOCKS',
    'BLOCK_SETTINGS',
    'PUBLISH_CONTENT',
    'PREVIEW_CONTENT'
  ],
  ADMIN: [
    'VIEW_WEBBUILDER',
    'CREATE_BLOCKS',
    'EDIT_BLOCKS',
    'DELETE_BLOCKS',
    'MANAGE_PAGES',
    'MANAGE_SEO',
    'VIEW_VERSIONS',
    'RESTORE_VERSIONS',
    'MANAGE_TEMPLATES',
    'GLOBAL_BLOCKS',
    'BLOCK_SETTINGS',
    'PUBLISH_CONTENT',
    'PREVIEW_CONTENT'
  ],
  EDITOR: [
    'VIEW_WEBBUILDER',
    'EDIT_BLOCKS',
    'MANAGE_PAGES',
    'VIEW_VERSIONS',
    'PREVIEW_CONTENT'
  ]
};

/**
 * API 엔드포인트별 필요 권한 매핑
 */
export const API_PERMISSIONS: Record<string, { method: string; action: WebBuilderAction }[]> = {
  '/api/webbuilder/blocks': [
    { method: 'GET', action: 'VIEW_WEBBUILDER' },
    { method: 'POST', action: 'CREATE_BLOCKS' },
    { method: 'PATCH', action: 'EDIT_BLOCKS' },
    { method: 'DELETE', action: 'DELETE_BLOCKS' }
  ],
  '/api/webbuilder/page-blocks': [
    { method: 'GET', action: 'VIEW_WEBBUILDER' },
    { method: 'POST', action: 'MANAGE_PAGES' },
    { method: 'PATCH', action: 'MANAGE_PAGES' },
    { method: 'PUT', action: 'MANAGE_PAGES' },
    { method: 'DELETE', action: 'MANAGE_PAGES' }
  ],
  '/api/webbuilder/seo': [
    { method: 'GET', action: 'VIEW_WEBBUILDER' },
    { method: 'POST', action: 'MANAGE_SEO' },
    { method: 'PATCH', action: 'MANAGE_SEO' },
    { method: 'DELETE', action: 'MANAGE_SEO' }
  ],
  '/api/webbuilder/versions': [
    { method: 'GET', action: 'VIEW_VERSIONS' },
    { method: 'POST', action: 'RESTORE_VERSIONS' },
    { method: 'DELETE', action: 'DELETE_VERSIONS' }
  ]
};

/**
 * 사용자가 특정 작업을 수행할 권한이 있는지 확인
 */
export function hasPermission(userRole: UserRole, action: WebBuilderAction): boolean {
  const allowedActions = RBAC_PERMISSIONS[userRole];
  return allowedActions.includes(action);
}

/**
 * 여러 작업에 대한 권한을 한번에 확인
 */
export function hasAnyPermission(userRole: UserRole, actions: WebBuilderAction[]): boolean {
  return actions.some(action => hasPermission(userRole, action));
}

/**
 * 모든 작업에 대한 권한을 확인
 */
export function hasAllPermissions(userRole: UserRole, actions: WebBuilderAction[]): boolean {
  return actions.every(action => hasPermission(userRole, action));
}

/**
 * API 엔드포인트에 대한 권한 확인
 */
export function hasApiPermission(userRole: UserRole, path: string, method: string): boolean {
  const endpointPermissions = API_PERMISSIONS[path];
  if (!endpointPermissions) {
    return false; // 정의되지 않은 엔드포인트는 접근 거부
  }

  const requiredPermission = endpointPermissions.find(p => p.method === method);
  if (!requiredPermission) {
    return false; // 정의되지 않은 메소드는 접근 거부
  }

  return hasPermission(userRole, requiredPermission.action);
}

/**
 * 웹빌더 전용 권한 체크 미들웨어
 */
export function checkWebBuilderPermission(
  user: AuthenticatedUser,
  requiredActions: WebBuilderAction[]
): { hasPermission: boolean; missingActions: WebBuilderAction[] } {
  const missingActions = requiredActions.filter(action => !hasPermission(user.role, action));

  return {
    hasPermission: missingActions.length === 0,
    missingActions
  };
}

/**
 * 권한 에러 메시지 생성
 */
export function getPermissionErrorMessage(
  action: WebBuilderAction,
  userRole: UserRole
): string {
  const actionMessages: Record<WebBuilderAction, string> = {
    'VIEW_WEBBUILDER': '웹빌더 페이지에 접근할 권한이 없습니다.',
    'CREATE_BLOCKS': '블록을 생성할 권한이 없습니다.',
    'EDIT_BLOCKS': '블록을 편집할 권한이 없습니다.',
    'DELETE_BLOCKS': '블록을 삭제할 권한이 없습니다.',
    'MANAGE_PAGES': '페이지를 관리할 권한이 없습니다.',
    'MANAGE_SEO': 'SEO 설정을 관리할 권한이 없습니다.',
    'VIEW_VERSIONS': '버전 히스토리를 조회할 권한이 없습니다.',
    'RESTORE_VERSIONS': '버전을 복원할 권한이 없습니다.',
    'DELETE_VERSIONS': '버전을 삭제할 권한이 없습니다.',
    'MANAGE_TEMPLATES': '템플릿을 관리할 권한이 없습니다.',
    'GLOBAL_BLOCKS': '글로벌 블록을 관리할 권한이 없습니다.',
    'BLOCK_SETTINGS': '블록 고급 설정을 변경할 권한이 없습니다.',
    'PUBLISH_CONTENT': '콘텐츠를 게시할 권한이 없습니다.',
    'PREVIEW_CONTENT': '콘텐츠를 미리볼 권한이 없습니다.'
  };

  return actionMessages[action] || `'${action}' 작업을 수행할 권한이 없습니다.`;
}

/**
 * 사용자의 역할별 허용된 작업 목록 반환
 */
export function getUserPermissions(userRole: UserRole): WebBuilderAction[] {
  return RBAC_PERMISSIONS[userRole] || [];
}

/**
 * 권한 정보를 포함한 사용자 컨텍스트 생성
 */
export interface WebBuilderUserContext extends AuthenticatedUser {
  permissions: WebBuilderAction[];
  can: (action: WebBuilderAction) => boolean;
  canAny: (actions: WebBuilderAction[]) => boolean;
  canAll: (actions: WebBuilderAction[]) => boolean;
}

export function createWebBuilderUserContext(user: AuthenticatedUser): WebBuilderUserContext {
  const permissions = getUserPermissions(user.role);

  return {
    ...user,
    permissions,
    can: (action: WebBuilderAction) => hasPermission(user.role, action),
    canAny: (actions: WebBuilderAction[]) => hasAnyPermission(user.role, actions),
    canAll: (actions: WebBuilderAction[]) => hasAllPermissions(user.role, actions)
  };
}