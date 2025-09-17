"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { MoreVertical, UserPlus, Key, Search, Mail } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER';
  department?: string;
  phone?: string;
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface UserInput {
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER';
  department?: string;
  phone?: string;
  is_active: boolean;
}

// 역할별 정보
const roleInfo = {
  SUPER_ADMIN: {
    label: '최고관리자',
    color: 'destructive' as const,
    description: '모든 권한'
  },
  ADMIN: {
    label: '관리자',
    color: 'default' as const,
    description: '일반 관리 권한'
  },
  EDITOR: {
    label: '편집자',
    color: 'secondary' as const,
    description: '콘텐츠 편집 권한'
  },
  USER: {
    label: '사용자',
    color: 'outline' as const,
    description: '읽기 권한'
  }
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [formData, setFormData] = useState<UserInput>({
    email: "",
    name: "",
    role: "USER",
    department: "",
    phone: "",
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, [filterRole, filterStatus, searchTerm]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole !== "all") params.append("role", filterRole);
      if (filterStatus !== "all") params.append("is_active", filterStatus);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTempPassword(null);

    try {
      const url = editingUser
        ? `/api/users?id=${editingUser.id}`
        : "/api/users";

      const method = editingUser ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save user");
      }

      const result = await response.json();

      if (result.tempPassword) {
        setTempPassword(result.tempPassword);
        setSuccess(`사용자가 생성되었습니다. 임시 비밀번호: ${result.tempPassword}`);
      } else {
        setSuccess(editingUser ? "사용자 정보가 수정되었습니다." : "사용자가 생성되었습니다.");
      }

      await fetchUsers();
      if (!result.tempPassword) {
        handleCloseDialog();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (!response.ok) throw new Error("Failed to update user");

      setSuccess(`사용자가 ${!user.is_active ? '활성화' : '비활성화'}되었습니다.`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("정말 이 사용자의 비밀번호를 재설정하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resetPassword: true }),
      });

      if (!response.ok) throw new Error("Failed to reset password");

      const result = await response.json();
      setSuccess(`비밀번호가 재설정되었습니다. 임시 비밀번호: ${result.tempPassword}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("정말 이 사용자를 비활성화하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete user");

      const result = await response.json();
      setSuccess(result.message);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department || "",
        phone: user.phone || "",
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: "",
        name: "",
        role: "USER",
        department: "",
        phone: "",
        is_active: true,
      });
    }
    setTempPassword(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setTempPassword(null);
    setFormData({
      email: "",
      name: "",
      role: "USER",
      department: "",
      phone: "",
      is_active: true,
    });
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return "없음";
    const date = new Date(lastLogin);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "방금 전";
    if (hours < 24) return `${hours}시간 전`;
    if (hours < 48) return "어제";
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-600 mt-1">시스템 사용자 및 권한을 관리합니다</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <UserPlus className="h-4 w-4 mr-2" />
          새 사용자 추가
        </Button>
      </div>

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="이름, 이메일, 부서 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="역할 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 역할</SelectItem>
            <SelectItem value="SUPER_ADMIN">최고관리자</SelectItem>
            <SelectItem value="ADMIN">관리자</SelectItem>
            <SelectItem value="EDITOR">편집자</SelectItem>
            <SelectItem value="USER">사용자</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="true">활성</SelectItem>
            <SelectItem value="false">비활성</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">등록된 사용자가 없습니다</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사용자</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>마지막 로그인</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        {user.email}
                        {user.email_verified && (
                          <Mail className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      {user.phone && (
                        <div className="text-xs text-gray-400">{user.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleInfo[user.role].color}>
                      {roleInfo[user.role].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.department || "-"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => handleToggleActive(user)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className={user.last_login ? "" : "text-gray-400"}>
                      {formatLastLogin(user.last_login)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                          정보 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                          <Key className="h-4 w-4 mr-2" />
                          비밀번호 재설정
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(user.id)}
                        >
                          비활성화
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "사용자 수정" : "새 사용자 추가"}
              </DialogTitle>
              <DialogDescription>
                사용자 정보를 입력하세요
              </DialogDescription>
            </DialogHeader>

            {tempPassword && (
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertDescription>
                  <div className="font-medium mb-1">임시 비밀번호가 생성되었습니다</div>
                  <code className="bg-white px-2 py-1 rounded text-blue-900">
                    {tempPassword}
                  </code>
                  <p className="text-xs mt-2">이 비밀번호를 사용자에게 전달하세요.</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  이메일 *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="col-span-3"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  이름 *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  역할 *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as User['role'] })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">최고관리자</SelectItem>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                    <SelectItem value="EDITOR">편집자</SelectItem>
                    <SelectItem value="USER">사용자</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">
                  부서
                </Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  전화번호
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="col-span-3"
                  placeholder="010-0000-0000"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is_active" className="text-right">
                  활성화
                </Label>
                <div className="col-span-3">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {tempPassword ? "닫기" : "취소"}
              </Button>
              {!tempPassword && (
                <Button type="submit">
                  {editingUser ? "수정" : "추가"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}