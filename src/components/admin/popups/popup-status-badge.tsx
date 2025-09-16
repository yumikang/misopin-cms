import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface PopupStatusBadgeProps {
  isActive: boolean;
  popup: {
    isActive: boolean;
    startDate: string;
    endDate: string;
  };
}

export function PopupStatusBadge({ isActive, popup }: PopupStatusBadgeProps) {
  const now = new Date();
  const startDate = new Date(popup.startDate);
  const endDate = new Date(popup.endDate);

  // 상태 결정 로직
  let status: {
    label: string;
    icon: any;
    className: string;
  };

  if (!popup.isActive) {
    status = {
      label: "비활성화",
      icon: XCircle,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
  } else if (now < startDate) {
    status = {
      label: "예약됨",
      icon: Clock,
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    };
  } else if (now > endDate) {
    status = {
      label: "만료됨",
      icon: AlertTriangle,
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    };
  } else {
    status = {
      label: "활성화",
      icon: CheckCircle,
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    };
  }

  const Icon = status.icon;

  return (
    <Badge variant="default" className={status.className}>
      <Icon className="h-3 w-3 mr-1" />
      {status.label}
    </Badge>
  );
}