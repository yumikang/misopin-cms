"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { List, Calendar, BarChart3 } from "lucide-react";

interface Tab {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    label: "리스트",
    href: "/admin/reservations",
    icon: <List className="h-4 w-4" />
  },
  {
    label: "타임라인",
    href: "/admin/reservations/timeline",
    icon: <Calendar className="h-4 w-4" />
  },
  {
    label: "통계",
    href: "/admin/reservations/stats",
    icon: <BarChart3 className="h-4 w-4" />
  }
];

export default function TabNavigation() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
