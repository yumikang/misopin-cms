import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Calendar } from "lucide-react";

interface ReservationStatusBadgeProps {
  status: string;
}

const statusConfig = {
  PENDING: {
    label: "대기",
    variant: "default" as const,
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  CONFIRMED: {
    label: "확정",
    variant: "default" as const,
    icon: CheckCircle,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  COMPLETED: {
    label: "완료",
    variant: "default" as const,
    icon: Calendar,
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  CANCELLED: {
    label: "취소",
    variant: "default" as const,
    icon: XCircle,
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig];

  if (!config) {
    return (
      <Badge variant="secondary">
        알 수 없음
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}