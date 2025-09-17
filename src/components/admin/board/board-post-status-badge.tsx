import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText } from "lucide-react";

interface BoardPostStatusBadgeProps {
  isPublished: boolean;
}

export function BoardPostStatusBadge({ isPublished }: BoardPostStatusBadgeProps) {
  if (isPublished) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="h-3 w-3 mr-1" />
        발행됨
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
      <FileText className="h-3 w-3 mr-1" />
      임시저장
    </Badge>
  );
}