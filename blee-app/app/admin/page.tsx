"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>(null);
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
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
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

  const stats = [
    {
      title: "오늘 예약",
      value: "12",
      change: "+2",
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "활성 팝업",
      value: "3",
      change: "0",
      color: "bg-green-100 text-green-600",
    },
    {
      title: "최근 게시물",
      value: "8",
      change: "+1",
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "총 방문자",
      value: "1,234",
      change: "+89",
      color: "bg-orange-100 text-orange-600",
    },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">미소핀의원 CMS</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">{user.name}</p>
                <p className="text-xs text-gray-500">{getRoleDisplay(user.role)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
          <p className="text-gray-600 mt-1">
            미소핀의원 CMS에 오신 것을 환영합니다, {user.name}님
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 로그인 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${stat.color}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">어제 대비</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">예약 관리</h3>
            <p className="text-sm text-gray-600 mb-4">
              오늘의 예약을 확인하고 관리하세요
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">오늘 예약</span>
                <span className="text-sm font-medium text-gray-900">12건</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">대기 중</span>
                <span className="text-sm font-medium text-gray-900">3건</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">완료</span>
                <span className="text-sm font-medium text-gray-900">9건</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">최근 활동</h3>
            <p className="text-sm text-gray-600 mb-4">
              시스템의 최근 활동을 확인하세요
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">새 예약이 등록되었습니다</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">팝업이 활성화되었습니다</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">공지사항이 게시되었습니다</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">콘텐츠 현황</h3>
            <p className="text-sm text-gray-600 mb-4">
              웹사이트 콘텐츠 현황을 확인하세요
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">공지사항</span>
                <span className="text-sm font-medium text-gray-900">5개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">이벤트</span>
                <span className="text-sm font-medium text-gray-900">2개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">FAQ</span>
                <span className="text-sm font-medium text-gray-900">12개</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <h4 className="font-medium text-gray-900">예약 관리</h4>
            <p className="text-sm text-gray-600 mt-1">예약 확인 및 관리</p>
          </button>
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <h4 className="font-medium text-gray-900">팝업 관리</h4>
            <p className="text-sm text-gray-600 mt-1">팝업 생성 및 수정</p>
          </button>
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <h4 className="font-medium text-gray-900">게시판 관리</h4>
            <p className="text-sm text-gray-600 mt-1">게시글 작성 및 관리</p>
          </button>
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <h4 className="font-medium text-gray-900">설정</h4>
            <p className="text-sm text-gray-600 mt-1">시스템 설정 변경</p>
          </button>
        </div>
      </main>
    </div>
  );
}