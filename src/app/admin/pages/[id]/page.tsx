import { notFound } from "next/navigation";
import { PageDetail } from "@/components/admin/pages/page-detail";

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

interface PageDetailPageProps {
  params: { id: string };
}

export default async function PageDetailPage({ params }: PageDetailPageProps) {
  const page = await getPage(params.id);

  if (!page) {
    notFound();
  }

  return <PageDetail page={page} />;
}