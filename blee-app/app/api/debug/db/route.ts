import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 환경 변수 정보 확인 (민감한 정보는 마스킹)
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      return NextResponse.json({
        error: 'DATABASE_URL not found',
        env: Object.keys(process.env).filter(key => key.includes('DATABASE'))
      });
    }

    // URL 파싱 (패스워드는 마스킹)
    const url = new URL(dbUrl);

    return NextResponse.json({
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1),
      username: url.username,
      password: url.password ? '***masked***' : 'not set',
      search: url.search,
      ssl: url.searchParams.get('sslmode'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to parse DATABASE_URL',
      message: error.message
    }, { status: 500 });
  }
}