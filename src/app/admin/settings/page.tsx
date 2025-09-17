import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { SettingsTabs } from "@/components/admin/settings/settings-tabs";

export const metadata = {
  title: "시스템 설정 | 미소핀 CMS",
  description: "시스템 전반의 설정을 관리합니다.",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // SUPER_ADMIN만 접근 가능
  if (session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight">시스템 설정</h1>
        <p className="text-muted-foreground">
          시스템 전반의 설정을 관리합니다. 변경사항은 즉시 적용됩니다.
        </p>
      </div>

      <SettingsTabs />
    </div>
  );
}