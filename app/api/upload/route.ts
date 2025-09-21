import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Supabase 클라이언트 초기화 (환경 변수 검증 포함)
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check environment variables.');
  }

  return createClient(supabaseUrl, supabaseKey);
}

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
    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient();

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

    // 원본 이미지 업로드
    const originalPath = `${folder}/${fileName}.${fileExt}`;
    const { error: originalError } = await supabase.storage
      .from('images')
      .upload(originalPath, buffer, {
        contentType: file.type,
        cacheControl: '3600'
      });

    if (originalError) {
      return NextResponse.json(
        { success: false, error: `원본 업로드 실패: ${originalError.message}` },
        { status: 500 }
      );
    }

    // 원본 이미지 URL 생성
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(originalPath);

    urls.original = originalUrl;

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

            const optimizedPath = `${folder}/${fileName}-${size}.webp`;

            const { data: optimizedData, error: optimizedError } = await supabase.storage
              .from('images')
              .upload(optimizedPath, optimized, {
                contentType: 'image/webp',
                cacheControl: '3600'
              });

            if (!optimizedError && optimizedData) {
              const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(optimizedPath);

              if (size === 'thumbnail' || size === 'small' || size === 'medium' || size === 'large') {
                urls[size] = publicUrl;
              }
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
        original: urls.original || originalPath,
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
    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient();

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { success: false, error: '삭제할 파일 경로가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // Supabase Storage에서 파일 삭제
    const { error } = await supabase.storage
      .from('images')
      .remove([path]);

    if (error) {
      return NextResponse.json(
        { success: false, error: `파일 삭제 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // 관련된 모든 크기의 이미지도 삭제
    const basePath = path.replace(/\.[^/.]+$/, '');
    const sizes = ['thumbnail', 'small', 'medium', 'large'];
    const pathsToDelete = sizes.map(size => `${basePath}-${size}.webp`);

    await supabase.storage
      .from('images')
      .remove(pathsToDelete);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: '파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}