import { BoardPostForm } from "@/components/admin/board/board-post-form";

export default function BoardCreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">새 게시글 작성</h1>
        <p className="text-muted-foreground">
          공지사항, 이벤트 등 새로운 게시글을 작성합니다.
        </p>
      </div>
      <BoardPostForm mode="create" />
    </div>
  );
}