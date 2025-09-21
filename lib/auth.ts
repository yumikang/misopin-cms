import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { WebBuilderAction, hasApiPermission, checkWebBuilderPermission, getPermissionErrorMessage } from '@/lib/middleware/auth';

export interface JWTPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
}

/**
 * JWT 토큰 생성 (로그인 시 role 정보 포함)
 */
export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role as 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Request에서 Bearer 토큰 추출
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Request에서 인증된 사용자 정보 가져오기
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  try {
    // 사용자 정보가 최신인지 확인 (계정 비활성화, 역할 변경 등)
    const result = await pool.query(
      'SELECT id, email, name, role, "isActive" FROM users WHERE id = $1 AND "isActive" = true',
      [payload.id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * 역할 기반 권한 체크
 */
export function hasPermission(
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR',
  requiredRoles: ('SUPER_ADMIN' | 'ADMIN' | 'EDITOR')[]
): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * 웹빌더 접근 권한 체크 미들웨어 (기존 호환성 유지)
 */
export async function requireWebBuilderAuth(
  request: NextRequest,
  requiredRoles: ('SUPER_ADMIN' | 'ADMIN' | 'EDITOR')[] = ['SUPER_ADMIN', 'ADMIN', 'EDITOR']
): Promise<{ user: AuthenticatedUser } | { error: string; status: number }> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (!hasPermission(user.role, requiredRoles)) {
    return { error: 'Insufficient permissions', status: 403 };
  }

  return { user };
}

/**
 * RBAC 기반 웹빌더 접근 권한 체크 미들웨어
 */
export async function requireWebBuilderPermission(
  request: NextRequest,
  requiredActions: WebBuilderAction[]
): Promise<{ user: AuthenticatedUser } | { error: string; status: number }> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const permissionCheck = checkWebBuilderPermission(user, requiredActions);

  if (!permissionCheck.hasPermission) {
    const errorMessage = permissionCheck.missingActions.length === 1
      ? getPermissionErrorMessage(permissionCheck.missingActions[0], user.role)
      : `다음 권한이 필요합니다: ${permissionCheck.missingActions.join(', ')}`;

    return { error: errorMessage, status: 403 };
  }

  return { user };
}

/**
 * API 엔드포인트 기반 권한 체크
 */
export async function requireApiPermission(
  request: NextRequest,
  path: string,
  method: string
): Promise<{ user: AuthenticatedUser } | { error: string; status: number }> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (!hasApiPermission(user.role, path, method)) {
    return { error: `'${method} ${path}' 작업을 수행할 권한이 없습니다.`, status: 403 };
  }

  return { user };
}