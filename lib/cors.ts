import { NextRequest, NextResponse } from 'next/server';

export function cors(request: NextRequest, response: NextResponse) {
  // Get origin from request headers
  const origin = request.headers.get('origin') || '*';

  // Set CORS headers
  const headers = response.headers;
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return response;
}

// Helper function to create CORS response
export function createCorsResponse(data: any, status: number = 200) {
  const response = NextResponse.json(data, { status });

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}