import { notFound } from "next/navigation";
import { BoardPostForm } from "@/components/admin/board/board-post-form";

async function getBoardPost(id: string) {
  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/board-posts/${id}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

interface EditBoardPageProps {
  params: { id: string };
}

export default async function EditBoardPage({ params }: EditBoardPageProps) {
  const post = await getBoardPost(params.id);

  if (!post) {
    notFound();
  }

  // Convert tags array back to comma-separated string for the form
  const initialData = {
    ...post,
    tags: post.tags ? post.tags.join(", ") : "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">게시글 수정</h1>
        <p className="text-muted-foreground">
          기존 게시글 정보를 수정합니다.
        </p>
      </div>
      <BoardPostForm mode="edit" postId={params.id} initialData={initialData} />
    </div>
  );
}