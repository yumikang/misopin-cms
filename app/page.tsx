import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-4">
            미소핀의원 CMS
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            컨텐츠 관리 시스템
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
              시스템 접속
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/login" className="group">
                <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-6 transition-all duration-300 hover:scale-105">
                  <div className="text-3xl mb-3">🔐</div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    관리자 로그인
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    CMS 시스템에 로그인하여 컨텐츠를 관리하세요
                  </p>
                </div>
              </Link>

              <a href="https://misopin.com" target="_blank" rel="noopener noreferrer" className="group">
                <div className="bg-green-50 dark:bg-gray-700 rounded-lg p-6 transition-all duration-300 hover:scale-105">
                  <div className="text-3xl mb-3">🌐</div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    웹사이트 방문
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    미소핀의원 공식 웹사이트로 이동합니다
                  </p>
                </div>
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
              시스템 정보
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  기술 스택
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span> Next.js 15.5.3
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span> TypeScript
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span> Supabase
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span> Tailwind CSS
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  API 상태
                </h3>
                <div className="space-y-2">
                  <Link href="/api/health" className="block">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Health Check API
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Database Connected
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                © 2025 미소핀의원. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}