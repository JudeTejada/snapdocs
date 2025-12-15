import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { apiService } from "@/services/api";
import AuthButton from "@/components/AuthButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Settings, ArrowLeft } from "lucide-react";
import { GitHubConnectionCard } from "./GitHubConnectionCard";
import { RepositoriesList } from "./RepositoriesList";

async function GitHubStatusSection() {
  const { getToken } = await auth();
  const token = await getToken();

  const statusResponse = await apiService.getGitHubStatus(token || undefined);

  const githubStatus = statusResponse.success && statusResponse.data
    ? statusResponse.data
    : { connected: false };

  return <GitHubConnectionCard githubStatus={githubStatus} />;
}

async function RepositoriesSection() {
  const { getToken } = await auth();
  const token = await getToken();

  const repoResponse = await apiService.getGitHubRepositories(token || undefined);

  const repositories = repoResponse.success && repoResponse.data
    ? repoResponse.data.repositories || []
    : [];

  // Only show if connected (we check by having repos or checking the API)
  if (repositories.length === 0) {
    // Check if connected
    const statusResponse = await apiService.getGitHubStatus(token || undefined);
    if (!statusResponse.success || !statusResponse.data?.connected) {
      return null;
    }
  }

  return <RepositoriesList repositories={repositories} />;
}

// Skeleton for repositories section
function RepositoriesLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" />
            <div>
              <Skeleton className="h-5 w-44 mb-1" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-96" />
      </CardFooter>
    </Card>
  );
}

// Skeleton for GitHub status section
function GitHubStatusLoadingSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" />
            <div>
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-10 w-44" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <Link href="/">
          <h1 className="text-xl font-bold tracking-tight text-foreground cursor-pointer">
            SnapDocs
          </h1>
        </Link>
        <AuthButton />
      </header>

      {/* Settings Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-foreground" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Manage your GitHub connection and repository preferences
          </p>
        </div>

        {/* GitHub Connection Card - High priority, loads first */}
        <Suspense fallback={<GitHubStatusLoadingSkeleton />}>
          <GitHubStatusSection />
        </Suspense>

        {/* Connected Repositories Card - Lower priority, loads after */}
        <Suspense fallback={<RepositoriesLoadingSkeleton />}>
          <RepositoriesSection />
        </Suspense>
      </main>
    </div>
  );
}
