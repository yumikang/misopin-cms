import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'popups';

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 확장자 검증
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(file.name).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (jpg, jpeg, png, gif, webp만 가능)' },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 5MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 고유한 파일명 생성 (타임스탬프 + 랜덤 문자열)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${randomString}${fileExtension}`;

    // 업로드 디렉토리 경로
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);

    // 디렉토리가 없으면 생성
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 파일 저장
    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 웹 접근 가능한 URL 반환
    const fileUrl = `/uploads/${folder}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: fileName,
      size: file.size,
      type: file.type,
    });

  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    return NextResponse.json(
      {
        error: '이미지 업로드 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
