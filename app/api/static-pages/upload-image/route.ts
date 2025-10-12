import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 정적 페이지용 이미지 업로드 API
 * - Sharp를 사용한 WebP 변환
 * - 이미지 최적화 (리사이즈, 품질 조정)
 * - 미리보기 썸네일 생성
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'general'; // banner, content, facility
    const maxWidth = parseInt(formData.get('maxWidth') as string) || 1920;
    const quality = parseInt(formData.get('quality') as string) || 85;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 10MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 업로드 디렉토리 경로
    const uploadDir = path.join(
      process.cwd(),
      '../Misopin-renew/img/uploads',
      category
    );

    // 디렉토리 생성 (없으면)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 파일명 생성 (타임스탬프 + 랜덤)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const baseFilename = `${timestamp}-${random}`;

    // 1. WebP 변환 및 최적화
    const webpFilename = `${baseFilename}.webp`;
    const webpPath = path.join(uploadDir, webpFilename);

    const imageProcessor = sharp(buffer);
    const metadata = await imageProcessor.metadata();

    // 리사이즈 (원본 크기가 maxWidth보다 크면)
    if (metadata.width && metadata.width > maxWidth) {
      imageProcessor.resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // WebP 변환
    await imageProcessor
      .webp({ quality, effort: 4 }) // effort 4 = 품질/속도 균형
      .toFile(webpPath);

    // 2. 썸네일 생성 (400px 너비)
    const thumbnailFilename = `${baseFilename}-thumb.webp`;
    const thumbnailPath = path.join(uploadDir, thumbnailFilename);

    await sharp(buffer)
      .resize(400, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    // 3. 원본 포맷 유지 버전 (폴백용)
    const originalFilename = `${baseFilename}.${fileExtension}`;
    const originalPath = path.join(uploadDir, originalFilename);

    const originalProcessor = sharp(buffer);
    if (metadata.width && metadata.width > maxWidth) {
      originalProcessor.resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    await originalProcessor.toFile(originalPath);

    // 파일 정보 및 URL 반환
    const baseUrl = `/img/uploads/${category}`;

    return NextResponse.json({
      success: true,
      files: {
        webp: {
          filename: webpFilename,
          url: `${baseUrl}/${webpFilename}`,
          path: webpPath,
        },
        thumbnail: {
          filename: thumbnailFilename,
          url: `${baseUrl}/${thumbnailFilename}`,
          path: thumbnailPath,
        },
        original: {
          filename: originalFilename,
          url: `${baseUrl}/${originalFilename}`,
          path: originalPath,
        },
      },
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);

    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류';

    return NextResponse.json(
      {
        success: false,
        error: '이미지 업로드 중 오류가 발생했습니다.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * 업로드된 이미지 목록 조회 (선택적)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general';

    const uploadDir = path.join(
      process.cwd(),
      '../Misopin-renew/img/uploads',
      category
    );

    if (!existsSync(uploadDir)) {
      return NextResponse.json({
        success: true,
        images: [],
      });
    }

    const files = readdirSync(uploadDir);

    // WebP 파일만 필터링 (썸네일 제외)
    const images = files
      .filter((file: string) => file.endsWith('.webp') && !file.includes('-thumb'))
      .map((file: string) => ({
        filename: file,
        url: `/img/uploads/${category}/${file}`,
        thumbnail: `/img/uploads/${category}/${file.replace('.webp', '-thumb.webp')}`,
      }));

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('이미지 목록 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '이미지 목록 조회 실패' },
      { status: 500 }
    );
  }
}
