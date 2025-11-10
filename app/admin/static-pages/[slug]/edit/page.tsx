'use client';

import { StaticPageEditor } from '@/components/static-pages';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditStaticPage() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get JWT from localStorage (same key as login page)
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      router.push('/login');
      return;
    }
    setToken(authToken);
  }, [router]);

  if (!token) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">인증 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <StaticPageEditor
        slug={params.slug as string}
        token={token}
      />
    </div>
  );
}
