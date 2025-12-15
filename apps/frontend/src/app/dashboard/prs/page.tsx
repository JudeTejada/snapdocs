import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileTextIcon,
  UserIcon,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  const href = `/dashboard/prs?page=${currentPage}&sortBy=${field}&sortOrder=${nextOrder}`;

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

async function PRsContent({
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

  const response = await apiService.getUserPRsPaginated(
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
          Failed to load pull requests. Please try again.
        </p>
      </div>
    );
  }

  const { prs, pagination } = response.data;

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
            All Pull Requests
          </h1>
          <p className="text-muted-foreground">
            {pagination.total} pull requests across all repositories
          </p>
        </div>

        {/* PRs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommitIcon className="h-5 w-5" />
              Pull Requests
            </CardTitle>
            <CardDescription>
              Click column headers to sort
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prs.length > 0 ? (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-4 pb-3 mb-3 border-b border-border text-sm font-medium text-muted-foreground">
                  <div>
                    <SortLink
                      field="number"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      currentPage={page}
                    >
                      #
                    </SortLink>
                  </div>
                  <div className="col-span-2">
                    <SortLink
                      field="title"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      currentPage={page}
                    >
                      Title
                    </SortLink>
                  </div>
                  <div>Repository</div>
                  <div>
                    <SortLink
                      field="state"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      currentPage={page}
                    >
                      State
                    </SortLink>
                  </div>
                  <div>
                    <SortLink
                      field="createdAt"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      currentPage={page}
                    >
                      Date
                    </SortLink>
                  </div>
                </div>

                {/* Table Body */}
                <div className="space-y-2">
                  {prs.map((pr: PRListItem) => (
                    <Link
                      key={pr.id}
                      href={`/dashboard/prs/${pr.id}`}
                      className="block"
                    >
                      <div className="grid grid-cols-6 gap-4 p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/80 hover:border-primary/20 transition-colors cursor-pointer items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{pr.number}
                          </Badge>
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="font-medium truncate">{pr.title}</span>
                          {pr.hasDocs && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <FileTextIcon className="h-3 w-3 mr-1" />
                              Docs
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {pr.repo.owner}/{pr.repo.name}
                        </div>
                        <div>
                          <Badge
                            variant={getStateBadgeVariant(pr.state)}
                            className="text-xs"
                          >
                            {pr.state}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(pr.mergedAt)}
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
                          href={`/dashboard/prs?page=${pagination.page - 1}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
                        >
                          <Button variant="outline" size="sm">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                        </Link>
                      )}
                      {pagination.page < pagination.totalPages && (
                        <Link
                          href={`/dashboard/prs?page=${pagination.page + 1}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
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
                <GitCommitIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No pull requests found. Connect GitHub and sync your repositories.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default async function PRsPage({ searchParams }: PageProps) {
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
      <PRsContent page={page} sortBy={sortBy} sortOrder={sortOrder} />
    </Suspense>
  );
}
