import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// 업로드 디렉토리 (배포와 무관하게 보존됨)
const UPLOAD_DIR = '/var/www/misopin-cms-uploads';

// 로컬 개발 환경에서는 프로젝트 내 uploads 폴더 사용
const getUploadDir = () => {
  return process.env.NODE_ENV === 'production'
    ? UPLOAD_DIR
    : path.join(process.cwd(), 'public', 'uploads');
};

// 허용된 이미지 형식
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// 최대 파일 크기 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 이미지 사이즈 프리셋
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 320, height: 240 },
  medium: { width: 800, height: 600 },
  large: { width: 1920, height: 1080 },
  original: null
};

interface UploadResponse {
  success: boolean;
  data?: {
    original: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      size: number;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const uploadDir = getUploadDir();

    // 업로드 디렉토리 존재 확인 및 생성
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'webbuilder';
    const optimize = formData.get('optimize') === 'true';

    // 파일 유효성 검사
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_FORMATS.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '지원하지 않는 파일 형식입니다.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '파일 크기가 10MB를 초과합니다.' },
        { status: 400 }
      );
    }

    // 파일을 버퍼로 변환
    const buffer = Buffer.from(await file.arrayBuffer());

    // Sharp를 사용하여 이미지 메타데이터 가져오기
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { success: false, error: '이미지 메타데이터를 읽을 수 없습니다.' },
        { status: 400 }
      );
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const urls: { original?: string; thumbnail?: string; small?: string; medium?: string; large?: string } = {};

    // 폴더 경로 생성
    const folderPath = path.join(uploadDir, folder);
    try {
      await fs.access(folderPath);
    } catch {
      await fs.mkdir(folderPath, { recursive: true });
    }

    // 원본 이미지 저장
    const originalFileName = `${fileName}.${fileExt}`;
    const originalFilePath = path.join(folderPath, originalFileName);
    await fs.writeFile(originalFilePath, buffer);

    // URL 생성 (절대 URL)
    const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '';
    const baseUrl = apiBaseUrl ? `${apiBaseUrl}/api/uploads` : '/api/uploads';

    urls.original = `${baseUrl}/${folder}/${originalFileName}`;

    // 최적화가 활성화된 경우 다양한 크기로 변환
    if (optimize) {
      for (const [size, dimensions] of Object.entries(IMAGE_SIZES)) {
        if (dimensions && size !== 'original') {
          try {
            // 이미지 리사이징 및 최적화
            const optimized = await sharp(buffer)
              .resize(dimensions.width, dimensions.height, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .webp({ quality: 85 })
              .toBuffer();

            const optimizedFileName = `${fileName}-${size}.webp`;
            const optimizedFilePath = path.join(folderPath, optimizedFileName);

            await fs.writeFile(optimizedFilePath, optimized);

            if (size === 'thumbnail' || size === 'small' || size === 'medium' || size === 'large') {
              urls[size] = `${baseUrl}/${folder}/${optimizedFileName}`;
            }
          } catch (err) {
            console.error(`Failed to create ${size} version:`, err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        original: urls.original,
        ...urls,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format || 'unknown',
          size: file.size
        }
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 이미지 삭제 엔드포인트
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const uploadDir = getUploadDir();
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: '삭제할 파일 경로가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // /uploads/ 제거하고 실제 파일 경로 생성
    const relativePath = filePath.replace(/^\/uploads\//, '');
    const fullPath = path.join(uploadDir, relativePath);

    // 파일 삭제
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('File delete error:', error);
      return NextResponse.json(
        { success: false, error: '파일 삭제 실패' },
        { status: 500 }
      );
    }

    // 관련된 모든 크기의 이미지도 삭제
    const dirPath = path.dirname(fullPath);
    const baseName = path.basename(fullPath, path.extname(fullPath));
    const sizes = ['thumbnail', 'small', 'medium', 'large'];

    for (const size of sizes) {
      const optimizedPath = path.join(dirPath, `${baseName}-${size}.webp`);
      try {
        await fs.unlink(optimizedPath);
      } catch {
        // 파일이 없으면 무시
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: '파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}