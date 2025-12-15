import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiService, PRListItem } from "@/services/api";
import AuthButton from "@/components/AuthButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitCommitIcon,
  ArrowLeft,
  FileTextIcon,
  CalendarIcon,
  UserIcon,
  RefreshCwIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

function getStateBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  switch (state.toLowerCase()) {
    case "open":
      return "default";
    case "merged":
      return "secondary";
    case "closed":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function RepositoryContent({ repoId, page }: { repoId: string; page: number }) {
  const { getToken } = await auth();
  const token = await getToken();

  const response = await apiService.getRepositoryDetail(repoId, page, 20, token || undefined);

  if (!response.success || !response.data) {
    notFound();
  }

  const { repository, prs, pagination } = response.data;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <Link href="/">
          <h1 className="text-xl font-bold tracking-tight text-foreground cursor-pointer">
            SnapDocs
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          <AuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Repository Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-xs">
              {repository.provider}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            {repository.owner}/{repository.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>Created {formatDate(repository.createdAt)}</span>
            </div>
            {repository.lastSyncAt && (
              <div className="flex items-center gap-1">
                <RefreshCwIcon className="h-4 w-4" />
                <span>Last synced {formatDate(repository.lastSyncAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total PRs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Open PRs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {prs.filter((pr) => pr.state === "open").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">With Docs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {prs.filter((pr) => pr.hasDocs).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pull Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommitIcon className="h-5 w-5" />
              Pull Requests
            </CardTitle>
            <CardDescription>
              All pull requests for this repository, sorted by open first then by date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prs.length > 0 ? (
              <div className="space-y-3">
                {prs.map((pr: PRListItem) => (
                  <Link
                    key={pr.id}
                    href={`/dashboard/prs/${pr.id}`}
                    className="block"
                  >
                    <div className="flex items-start justify-between p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/80 hover:border-primary/20 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            #{pr.number}
                          </Badge>
                          <Badge
                            variant={getStateBadgeVariant(pr.state)}
                            className="text-xs"
                          >
                            {pr.state}
                          </Badge>
                          {pr.hasDocs && (
                            <Badge variant="secondary" className="text-xs">
                              <FileTextIcon className="h-3 w-3 mr-1" />
                              Docs
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-foreground mb-1 truncate">
                          {pr.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            <span>{pr.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{formatDate(pr.mergedAt)}</span>
                          </div>
                        </div>
                        {pr.docsSummary && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {pr.docsSummary}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GitCommitIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No pull requests found for this repository.
                </p>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total PRs)
                </p>
                <div className="flex items-center gap-2">
                  {pagination.page > 1 && (
                    <Link href={`/dashboard/repos/${repoId}?page=${pagination.page - 1}`}>
                      <Button variant="outline" size="sm">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                    </Link>
                  )}
                  {pagination.page < pagination.totalPages && (
                    <Link href={`/dashboard/repos/${repoId}?page=${pagination.page + 1}`}>
                      <Button variant="outline" size="sm">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default async function RepositoryDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || "1", 10);

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <RepositoryContent repoId={resolvedParams.id} page={page} />
    </Suspense>
  );
}
