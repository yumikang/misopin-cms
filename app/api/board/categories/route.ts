import { NextResponse } from 'next/server';

// Board types based on database schema
interface BoardType {
  id: string;
  name: string;
  slug: string;
  value: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

const boardTypes: BoardType[] = [
  {
    id: 'NOTICE',
    name: '공지사항',
    slug: 'notice',
    value: 'NOTICE',
    description: '병원 공지사항',
    display_order: 1,
    is_active: true
  },
  {
    id: 'EVENT',
    name: '이벤트',
    slug: 'event',
    value: 'EVENT',
    description: '진행중인 이벤트',
    display_order: 2,
    is_active: true
  }
];

export async function GET() {
  return NextResponse.json(boardTypes);
}

export async function POST() {
  // Board types are predefined, no creation allowed
  return NextResponse.json(
    { error: 'Board types are predefined and cannot be created' },
    { status: 405 }
  );
}

export async function PUT() {
  // Board types are predefined, no modification allowed
  return NextResponse.json(
    { error: 'Board types are predefined and cannot be modified' },
    { status: 405 }
  );
}

export async function DELETE() {
  // Board types are predefined, no deletion allowed
  return NextResponse.json(
    { error: 'Board types are predefined and cannot be deleted' },
    { status: 405 }
  );
}