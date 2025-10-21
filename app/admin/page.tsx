"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardData {
  stats: Array<{
    title: string;
    value: string;
    change: string;
    color: string;
    description: string;
  }>;
  reservationDetails: {
    total: number;
    pending: number;
    completed: number;
  };
  recentActivities: string[];
  contentStats: {
    notices: number;
    events: number;
    faqs: number;
  };
}

export default function AdminPage() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchDashboardData(token);
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "슈퍼 관리자";
      case "ADMIN":
        return "일반 관리자";
      case "EDITOR":
        return "편집자";
      default:
        return role;
    }
  };

  const stats = dashboardData?.stats || [
    {
      title: "오늘 예약",
      value: "0",
      change: "0",
      color: "bg-blue-100 text-blue-600",
      description: "로딩 중"
    },
    {
      title: "활성 팝업",
      value: "0",
      change: "0",
      color: "bg-green-100 text-green-600",
      description: "로딩 중"
    },
    {
      title: "최근 게시물",
      value: "0",
      change: "0",
      color: "bg-purple-100 text-purple-600",
      description: "로딩 중"
    },
    {
      title: "총 사용자",
      value: "0",
      change: "0",
      color: "bg-orange-100 text-orange-600",
      description: "로딩 중"
    },
  ];

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
          <p className="text-gray-600 mt-1">
            미소핀의원 CMS에 오신 것을 환영합니다, {user.name}님
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 로그인 정보</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">이름</p>
              <p className="font-medium text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">이메일</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">권한</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                {getRoleDisplay(user.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${stat.color}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.description || '어제 대비'}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mb-6">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">예약 관리</h3>
            <p className="text-sm text-gray-600 mb-4">
              오늘의 예약을 확인하고 관리하세요
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">오늘 예약</span>
                <span className="text-sm font-medium text-gray-900">{dashboardData?.reservationDetails.total || 0}건</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">대기 중</span>
                <span className="text-sm font-medium text-gray-900">{dashboardData?.reservationDetails.pending || 0}건</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">완료</span>
                <span className="text-sm font-medium text-gray-900">{dashboardData?.reservationDetails.completed || 0}건</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">최근 활동</h3>
            <p className="text-sm text-gray-600 mb-4">
              시스템의 최근 활동을 확인하세요
            </p>
            <div className="space-y-2">
              {dashboardData?.recentActivities.length ? (
                dashboardData.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-green-500' :
                      index === 1 ? 'bg-blue-500' : 'bg-purple-500'
                    }`}></div>
                    <span className="text-sm text-gray-600 truncate">{activity}</span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-gray-500">최근 활동이 없습니다</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">콘텐츠 현황</h3>
            <p className="text-sm text-gray-600 mb-4">
              웹사이트 콘텐츠 현황을 확인하세요
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">공지사항</span>
                <span className="text-sm font-medium text-gray-900">{dashboardData?.contentStats.notices || 0}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">이벤트</span>
                <span className="text-sm font-medium text-gray-900">{dashboardData?.contentStats.events || 0}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">FAQ</span>
                <span className="text-sm font-medium text-gray-900">{dashboardData?.contentStats.faqs || 0}개</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links - Hidden */}
        {/*
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <button
            onClick={() => router.push('/admin/reservations')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group hover:bg-blue-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-blue-600">예약 관리</h4>
                <p className="text-sm text-gray-600 mt-1">예약 확인 및 관리</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/popups')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group hover:bg-green-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-green-600">팝업 관리</h4>
                <p className="text-sm text-gray-600 mt-1">팝업 생성 및 수정</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/board')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group hover:bg-purple-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-purple-600">게시판 관리</h4>
                <p className="text-sm text-gray-600 mt-1">게시글 작성 및 관리</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/pages')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group hover:bg-orange-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-orange-600">페이지 관리</h4>
                <p className="text-sm text-gray-600 mt-1">페이지 생성 및 편집</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
        */}

        {/* Additional Admin Functions - Hidden */}
        {/*
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => router.push('/admin/settings')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-gray-700">⚙️ 시스템 설정</h4>
                <p className="text-sm text-gray-600 mt-1">사이트 설정 관리</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/files')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group hover:bg-indigo-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-indigo-600">📁 파일 관리</h4>
                <p className="text-sm text-gray-600 mt-1">업로드된 파일 관리</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          {user.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => router.push('/admin/users')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group hover:bg-red-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-red-600">👥 사용자 관리</h4>
                  <p className="text-sm text-gray-600 mt-1">관리자 계정 관리</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}
        </div>
        */}
    </div>
  );
}