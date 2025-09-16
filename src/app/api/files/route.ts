import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fileUploadService } from '@/services/file-upload.service';
import { UserRole } from '@prisma/client';

// Rate limiting을 위한 간단한 메모리 캐시
const uploadAttempts = new Map<string, { count: number; resetTime: number }>();

// Rate limiting 체크 함수
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(ip);

  if (!userAttempts || now > userAttempts.resetTime) {
    uploadAttempts.set(ip, {
      count: 1,
      resetTime: now + 60000, // 1분
    });
    return true;
  }

  if (userAttempts.count >= 10) {
    // 분당 10개 제한
    return false;
  }

  userAttempts.count++;
  return true;
}

/**
 * POST /api/files
 * 파일 업로드
 */
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 권한 확인 (ADMIN 이상만 업로드 가능)
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: '파일 업로드 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    // FormData 파싱
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const category = formData.get('category') as string | null;
    const description = formData.get('description') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '업로드할 파일이 없습니다.' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];
    const errors = [];

    // 각 파일 처리
    for (const file of files) {
      try {
        // File을 Buffer로 변환
        const buffer = Buffer.from(await file.arrayBuffer());

        // 파일 업로드
        const uploadedFile = await fileUploadService.uploadFile(
          buffer,
          file.name,
          file.type,
          {
            userId: session.user.id,
            category: category || undefined,
            description: description || undefined,
          }
        );

        uploadedFiles.push(uploadedFile);
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : '업로드 실패',
        });
      }
    }

    // 응답
    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: '모든 파일 업로드에 실패했습니다.', errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `${uploadedFiles.length}개 파일 업로드 성공`,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files
 * 파일 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || undefined;
    const userId = searchParams.get('userId') || undefined;

    // 파일 목록 조회
    const result = await fileUploadService.getFiles({
      page,
      limit,
      category,
      userId,
    });

    // 페이지네이션 정보 계산
    const totalPages = Math.ceil(result.total / limit);

    return NextResponse.json({
      files: result.files,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json(
      { error: '파일 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}