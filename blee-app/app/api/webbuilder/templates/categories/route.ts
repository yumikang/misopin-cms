import { NextRequest, NextResponse } from 'next/server';
import { requireWebBuilderPermission } from '@/lib/auth';
import { WebBuilderResponse } from '@/app/types/webbuilder';

// GET: 템플릿 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['VIEW_WEBBUILDER']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const categories = [
      { value: 'UI', label: 'UI 컴포넌트', description: '버튼, 폼, 네비게이션 등' },
      { value: 'LAYOUT', label: '레이아웃', description: '그리드, 섹션 등' },
      { value: 'CONTENT', label: '콘텐츠', description: '텍스트, 이미지, 갤러리 등' },
      { value: 'FORM', label: '폼', description: '폼 및 입력 요소' },
      { value: 'MEDIA', label: '미디어', description: '비디오, 오디오, 캐러셀 등' },
      { value: 'NAVIGATION', label: '네비게이션', description: '네비게이션 및 메뉴' },
      { value: 'MARKETING', label: '마케팅', description: '배너, CTA, 프로모션 등' },
      { value: 'SOCIAL', label: '소셜', description: '소셜 미디어 및 공유 요소' },
      { value: 'OTHER', label: '기타', description: '기타 템플릿' }
    ];

    return NextResponse.json<WebBuilderResponse<typeof categories>>({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching template categories:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch template categories' },
      { status: 500 }
    );
  }
}