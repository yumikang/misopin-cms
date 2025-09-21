import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
}