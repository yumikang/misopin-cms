import { PopupForm } from "@/components/admin/popups/popup-form";

export default function PopupCreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">새 팝업 만들기</h1>
        <p className="text-muted-foreground">
          웹사이트에 표시될 새로운 팝업을 생성합니다.
        </p>
      </div>
      <PopupForm mode="create" />
    </div>
  );
}