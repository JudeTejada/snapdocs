import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RepositoriesLoading() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          SnapDocs
        </h1>
        <Skeleton className="h-8 w-24" />
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Back Button */}
        <div className="inline-flex items-center gap-2 text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
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
            {/* Table Header Skeleton */}
            <div className="grid grid-cols-5 gap-4 pb-3 mb-3 border-b border-border">
              <div className="col-span-2">
                <Skeleton className="h-4 w-12" />
              </div>
              <div>
                <Skeleton className="h-4 w-12" />
              </div>
              <div>
                <Skeleton className="h-4 w-8" />
              </div>
              <div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            {/* Table Rows Skeleton */}
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-5 gap-4 p-4 rounded-lg bg-secondary/50 border border-border items-center"
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
