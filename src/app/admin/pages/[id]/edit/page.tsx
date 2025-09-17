import { notFound } from "next/navigation";
import { PageForm } from "@/components/admin/pages/page-form";

async function getPage(id: string) {
  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/pages/${id}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

interface EditPagePageProps {
  params: { id: string };
}

export default async function EditPagePage({ params }: EditPagePageProps) {
  const page = await getPage(params.id);

  if (!page) {
    notFound();
  }

  return <PageForm mode="edit" pageId={params.id} initialData={page} />;
}