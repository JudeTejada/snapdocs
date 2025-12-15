import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { apiService, RepoListItem } from "@/services/api";
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
  FolderIcon,
  ArrowLeft,
  CalendarIcon,
  RefreshCwIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GitCommitIcon,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SortLink({
  field,
  currentSortBy,
  currentSortOrder,
  currentPage,
  children,
}: {
  field: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentPage: number;
  children: React.ReactNode;
}) {
  const isActive = currentSortBy === field;
  const nextOrder = isActive && currentSortOrder === "desc" ? "asc" : "desc";
  const href = `/dashboard/repos?page=${currentPage}&sortBy=${field}&sortOrder=${nextOrder}`;

  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {children}
      {isActive ? (
        currentSortOrder === "desc" ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </Link>
  );
}

async function RepositoriesContent({
  page,
  sortBy,
  sortOrder,
}: {
  page: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}) {
  const { getToken } = await auth();
  const token = await getToken();

  const response = await apiService.getUserReposPaginated(
    page,
    20,
    sortBy,
    sortOrder,
    token || undefined
  );

  if (!response.success || !response.data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          Failed to load repositories. Please try again.
        </p>
      </div>
    );
  }

  const { repos, pagination } = response.data;

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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            All Repositories
          </h1>
          <p className="text-muted-foreground">
            {pagination.total} repositories monitored by SnapDocs
          </p>
        </div>

        {/* Repositories Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              Repositories
            </CardTitle>
            <CardDescription>
              Click column headers to sort
            </CardDescription>
          </CardHeader>
          <CardContent>
            {repos.length > 0 ? (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 pb-3 mb-3 border-b border-border text-sm font-medium text-muted-foreground">
                  <div className="col-span-2">
                    <SortLink
                      field="name"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      currentPage={page}
                    >
                      Name
                    </SortLink>
                  </div>
                  <div>
                    <SortLink
                      field="owner"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      currentPage={page}
                    >
                      Owner
                    </SortLink>
                  </div>
                  <div>PRs</div>
                  <div>
                    <SortLink
                      field="lastSyncAt"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      currentPage={page}
                    >
                      Last Synced
                    </SortLink>
                  </div>
                </div>

                {/* Table Body */}
                <div className="space-y-2">
                  {repos.map((repo: RepoListItem) => (
                    <Link
                      key={repo.id}
                      href={`/dashboard/repos/${repo.id}`}
                      className="block"
                    >
                      <div className="grid grid-cols-5 gap-4 p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/80 hover:border-primary/20 transition-colors cursor-pointer items-center">
                        <div className="col-span-2 flex items-center gap-2">
                          <FolderIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{repo.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {repo.provider}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {repo.owner}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <GitCommitIcon className="h-3 w-3 text-muted-foreground" />
                          <span>{repo.prCount}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(repo.lastSyncAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </p>
                    <div className="flex items-center gap-2">
                      {pagination.page > 1 && (
                        <Link
                          href={`/dashboard/repos?page=${pagination.page - 1}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
                        >
                          <Button variant="outline" size="sm">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                        </Link>
                      )}
                      {pagination.page < pagination.totalPages && (
                        <Link
                          href={`/dashboard/repos?page=${pagination.page + 1}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
                        >
                          <Button variant="outline" size="sm">
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No repositories found. Connect GitHub to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default async function RepositoriesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || "1", 10);
  const sortBy = resolvedSearchParams.sortBy || "createdAt";
  const sortOrder = (resolvedSearchParams.sortOrder || "desc") as "asc" | "desc";

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          Loading...
        </div>
      }
    >
      <RepositoriesContent page={page} sortBy={sortBy} sortOrder={sortOrder} />
    </Suspense>
  );
}
