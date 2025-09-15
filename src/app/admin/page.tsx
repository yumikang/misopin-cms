"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Clock,
  Shield,
  User,
  Edit
} from "lucide-react";

export default function AdminPage() {
  const { data: session } = useSession();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Shield className="h-5 w-5 text-red-500" />;
      case "ADMIN":
        return <User className="h-5 w-5 text-blue-500" />;
      case "EDITOR":
        return <Edit className="h-5 w-5 text-green-500" />;
      default:
        return <User className="h-5 w-5" />;
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

  const stats = [
    {
      title: "오늘 예약",
      value: "12",
      change: "+2",
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "활성 팝업",
      value: "3",
      change: "0",
      icon: MessageSquare,
      color: "text-green-600",
    },
    {
      title: "최근 게시물",
      value: "8",
      change: "+1",
      icon: FileText,
      color: "text-purple-600",
    },
    {
      title: "총 방문자",
      value: "1,234",
      change: "+89",
      icon: Users,
      color: "text-orange-600",
    },
  ];

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground mt-2">
          미소핀의원 CMS에 오신 것을 환영합니다, {session.user.name}님
        </p>
      </div>

      {/* User Info Card */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRoleIcon(session.user.role)}
              현재 로그인 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="font-medium">{session.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">권한</p>
                <Badge variant="secondary" className="mt-1">
                  {getRoleDisplay(session.user.role)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> 어제 대비
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              예약 관리
            </CardTitle>
            <CardDescription>
              오늘의 예약을 확인하고 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">오늘 예약</span>
                <Badge>12건</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">대기 중</span>
                <Badge variant="outline">3건</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">완료</span>
                <Badge variant="secondary">9건</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              최근 활동
            </CardTitle>
            <CardDescription>
              시스템의 최근 활동을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">새 예약이 등록되었습니다</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">팝업이 활성화되었습니다</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">공지사항이 게시되었습니다</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              콘텐츠 현황
            </CardTitle>
            <CardDescription>
              웹사이트 콘텐츠 현황을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">공지사항</span>
                <Badge>5개</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">이벤트</span>
                <Badge variant="outline">2개</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">FAQ</span>
                <Badge variant="secondary">12개</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}