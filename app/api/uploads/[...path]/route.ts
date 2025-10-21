import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// 업로드 디렉토리
const UPLOAD_DIR = '/var/www/misopin-cms-uploads';

// 로컬 개발 환경에서는 프로젝트 내 uploads 폴더 사용
const getUploadDir = () => {
  return process.env.NODE_ENV === 'production'
    ? UPLOAD_DIR
    : path.join(process.cwd(), 'public', 'uploads');
};

// MIME 타입 매핑
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const uploadDir = getUploadDir();
    const { path: pathArray } = await params;
    const filePath = pathArray.join('/');
    const fullPath = path.join(uploadDir, filePath);

    // 보안: 디렉토리 traversal 방지
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(uploadDir)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      );
    }

    // 파일 존재 확인
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 파일 읽기
    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 파일 반환 (Buffer를 Uint8Array로 변환)
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
