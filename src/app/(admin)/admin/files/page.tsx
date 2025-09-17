import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { FileManagementPage } from '@/components/admin/files/file-management-page';

export const metadata: Metadata = {
  title: '파일 관리 | 미소핀의원 CMS',
  description: '업로드된 파일을 관리하고 새 파일을 업로드합니다.',
};

export default async function FilesPage() {
  // 세션 및 권한 확인
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // EDITOR는 파일 업로드만 가능, 삭제는 불가
  // ADMIN 이상만 전체 파일 관리 가능

  return <FileManagementPage userRole={session.user.role} />;
}