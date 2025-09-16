"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeletePopupButtonProps {
  popupId: string;
  popupTitle: string;
  isSuperAdmin: boolean;
}

export function DeletePopupButton({ popupId, popupTitle, isSuperAdmin }: DeletePopupButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 슈퍼 관리자가 아니면 버튼을 렌더링하지 않음
  if (!isSuperAdmin) {
    return null;
  }

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/popups/${popupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "팝업 삭제에 실패했습니다");
      }

      toast.success("팝업이 성공적으로 삭제되었습니다");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("팝업 삭제 오류:", error);
      toast.error(error instanceof Error ? error.message : "팝업 삭제 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팝업 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 "{popupTitle}" 팝업을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}