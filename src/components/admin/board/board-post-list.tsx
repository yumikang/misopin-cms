import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BoardPostPagination } from "./board-post-pagination";
import { BoardPostStatusBadge } from "./board-post-status-badge";
import {
  Eye,
  Calendar,
  User,
  Hash,
  Pin,
  Image,
  BarChart3,
  FileText
} from "lucide-react";

interface BoardPostListProps {
  searchParams: {
    page?: string;
    boardType?: string;
    published?: string;
    search?: string;
  };
}

async function getBoardPosts(params: any) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page);
  if (params.boardType) searchParams.set("boardType", params.boardType);
  if (params.published) searchParams.set("published", params.published);
  if (params.search) searchParams.set("search", params.search);

  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/board-posts?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("게시글 데이터를 불러오는데 실패했습니다.");
  }

  return response.json();
}

function getBoardTypeLabel(boardType: string) {
  switch (boardType) {
    case "NOTICE": return "Notice";
    case "EVENT": return "Event";
    default: return boardType;
  }
}

function getBoardTypeColor(boardType: string) {
  switch (boardType) {
    case "NOTICE": return "bg-red-100 text-red-800 hover:bg-red-100";
    case "EVENT": return "bg-green-100 text-green-800 hover:bg-green-100";
    default: return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
}

export async function BoardPostList({ searchParams }: BoardPostListProps) {
  const data = await getBoardPosts(searchParams);
  const { posts, pagination } = data;

  if (!posts || posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>등록된 게시글이 없습니다.</p>
            <p className="text-sm mt-2">새 게시글을 작성해보세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {posts.map((post: any) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {post.isPinned && (
                      <Pin className="h-4 w-4 text-orange-500" />
                    )}
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                  </div>
                  <Badge variant="default" className={getBoardTypeColor(post.boardType)}>
                    {getBoardTypeLabel(post.boardType)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <BoardPostStatusBadge isPublished={post.isPublished} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/board/${post.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      상세
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 게시글 요약 */}
                {post.excerpt && (
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {post.excerpt}
                  </div>
                )}

                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{post.author}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span>조회 {post.viewCount}회</span>
                  </div>

                  {post.publishedAt && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(parseISO(post.publishedAt), "MM월 dd일", { locale: ko })}
                      </span>
                    </div>
                  )}

                  {post.imageUrl && (
                    <div className="flex items-center space-x-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span>이미지 첨부</span>
                    </div>
                  )}
                </div>

                {/* 태그 */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 생성일 */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <p>
                    작성일: {format(parseISO(post.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                  </p>
                  {post.updatedAt !== post.createdAt && (
                    <p>
                      수정일: {format(parseISO(post.updatedAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BoardPostPagination pagination={pagination} />
    </div>
  );
}