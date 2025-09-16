import { notFound } from "next/navigation";
import { PopupForm } from "@/components/admin/popups/popup-form";

async function getPopup(id: string) {
  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/popups/${id}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

interface EditPopupPageProps {
  params: { id: string };
}

export default async function EditPopupPage({ params }: EditPopupPageProps) {
  const popup = await getPopup(params.id);

  if (!popup) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">팝업 수정</h1>
        <p className="text-muted-foreground">
          기존 팝업 정보를 수정합니다.
        </p>
      </div>
      <PopupForm mode="edit" popupId={params.id} initialData={popup} />
    </div>
  );
}