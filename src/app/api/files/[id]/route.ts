import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fileUploadService } from '@/services/file-upload.service';
import { UserRole } from '@prisma/client';

/**
 * GET /api/files/[id]
 * 파일 상세 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const file = await fileUploadService.getFile(params.id);

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('File get error:', error);
    return NextResponse.json(
      { error: '파일 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/files/[id]
 * 파일 정보 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 권한 확인 (ADMIN 이상만 수정 가능)
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: '파일 수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { description, category } = body;

    const updatedFile = await fileUploadService.updateFile(params.id, {
      description,
      category,
    });

    return NextResponse.json({
      message: '파일 정보가 수정되었습니다.',
      file: updatedFile,
    });
  } catch (error) {
    console.error('File update error:', error);
    return NextResponse.json(
      { error: '파일 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[id]
 * 파일 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 권한 확인 (ADMIN 이상만 삭제 가능)
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: '파일 삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    await fileUploadService.deleteFile(params.id, session.user.id);

    return NextResponse.json({
      message: '파일이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}