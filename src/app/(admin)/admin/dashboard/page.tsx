import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { DashboardPage } from '@/components/admin/dashboard/dashboard-page';

export const metadata: Metadata = {
  title: '대시보드 | 미소핀의원 CMS',
  description: '미소핀의원 CMS 관리 대시보드',
};

export default async function Dashboard() {
  // 세션 및 권한 확인
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // EDITOR 권한은 대시보드 접근 불가
  if (session.user.role === UserRole.EDITOR) {
    redirect('/admin/boards'); // 편집자는 게시글 관리로 리다이렉트
  }

  return <DashboardPage />;
}