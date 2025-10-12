import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle CORS for public API routes
  if (request.nextUrl.pathname.startsWith('/api/public')) {
    const response = NextResponse.next();

    // Get the origin from the request
    const origin = request.headers.get('origin');

    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5500', // Live Server default port
      'http://127.0.0.1:5500',
      'https://misopin-renew.vercel.app', // Current static site domain
      'https://misopin-cms.vercel.app', // CMS domain
      'https://misopin.com',
      'https://www.misopin.com',
      process.env.NEXT_PUBLIC_STATIC_SITE_URL,
      process.env.NEXT_PUBLIC_CMS_URL,
    ].filter(Boolean);

    // Check if the origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Allow requests with no origin (like Postman)
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    // Set other CORS headers
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // For all other routes, continue normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/public/:path*',
    '/api/auth/login',
    '/api/auth/register',
    '/api/reservations',
  ],
};