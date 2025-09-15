import Image from "next/image";

export default function HomePage() {
  return (
    <div className="container-1450 py-12">
      <div className="text-center">
        <div className="mb-8">
          <Image
            src="/img/misopin-temporary-logo.svg"
            alt="미소핀의원"
            width={200}
            height={60}
            className="mx-auto"
            priority
          />
        </div>

        <h1 className="text-4xl font-bold text-primary-600 mb-6">
          미소핀의원 CMS
        </h1>

        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          병원 컨텐츠 관리 시스템이 구축되었습니다.<br />
          페이지, 예약, 팝업, 게시판을 통합 관리할 수 있습니다.
        </p>

        <div className="space-y-4">
          <div>
            <a
              href="/login"
              className="inline-block bg-primary-500 text-white px-8 py-4 rounded-lg hover:bg-primary-600 transition-colors font-medium text-lg"
            >
              🔧 관리자 로그인
            </a>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/about.html"
              className="inline-block border border-primary-500 text-primary-600 px-6 py-2 rounded-lg hover:bg-primary-50 transition-colors"
            >
              📄 기존 사이트 보기
            </a>
            <a
              href="/api/health"
              className="inline-block border border-brown-500 text-brown-600 px-6 py-2 rounded-lg hover:bg-brown-50 transition-colors"
            >
              🔍 API 상태 확인
            </a>
          </div>

          <div className="text-sm text-muted-foreground mt-6 space-y-2">
            <div>✅ Next.js 14 + TypeScript + Prisma + PostgreSQL</div>
            <div>🎨 기존 디자인 시스템 (#38b0c9, #9F988C) 호환</div>
            <div>📱 1450px 그리드 시스템 및 반응형 지원</div>
          </div>
        </div>
      </div>
    </div>
  );
}
