import { Suspense } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import GitHubWrapper from "./GitHubWrapper";
import SyncStatusWrapper from "./SyncStatusWrapper";
import { apiService } from "@/services/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCommitIcon, FileTextIcon, FolderIcon, Loader2, Settings } from "lucide-react";
import { stringify } from "querystring";

async function DashboardContent() {
  const { getToken } = await auth();
  const user = await currentUser();
  const token = await getToken();

  const [statsResponse, githubResponse, repoResponse, prsResponse] =
    await Promise.all([
      apiService.getDashboardStats(token || undefined),
      apiService.getGitHubStatus(token || undefined),
      apiService.getUserRepos(token || undefined),
      apiService.getUserPRs(token || undefined),
    ]);

  console.log(repoResponse, "repoResponse");

  const stats = statsResponse.success ? statsResponse.data?.stats : null;
  const githubStatus = githubResponse.success
    ? githubResponse.data
    : { connected: false };

  const repositories = repoResponse.success
    ? repoResponse.data?.repos || []
    : [];

  const pullRequests = prsResponse.success ? prsResponse.data?.prs || [] : [];

  const error = !statsResponse.success ? "Failed to load dashboard data" : null;

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
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <AuthButton />
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-lg text-muted-foreground">
            {user?.firstName
              ? `Hello, ${user.firstName}.`
              : "Ready to document your code changes?"}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-8 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Repositories
              </CardTitle>
              <FolderIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRepos || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pull Requests
              </CardTitle>
              <GitCommitIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPRs || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Generated Docs
              </CardTitle>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDocs || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-1">
            <GitHubWrapper status={githubStatus} />
          </div>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Connected Repositories</CardTitle>
              <CardDescription>
                Repositories monitored by SnapDocs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {githubStatus?.connected ? (
                <div className="space-y-4">
                  {repositories.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {repositories.slice(0, 3).map((repo: any) => (
                        <Link
                          key={repo.id}
                          href={`/dashboard/repos/${repo.id}`}
                          className="block"
                        >
                          <div
                            className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border hover:bg-secondary/80 hover:border-primary/20 transition-colors cursor-pointer"
                          >
                            <span className="text-sm font-medium truncate max-w-[150px]">
                              {repo.owner}/{repo.name}
                            </span>
                          </div>
                        </Link>
                      ))}
                      {repositories.length > 3 && (
                        <p className="text-xs text-center text-muted-foreground pt-2">
                          +{repositories.length - 3} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No repositories found.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[150px] text-center p-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect GitHub to see your repositories.
                  </p>
                </div>
              )}
            </CardContent>
            {githubStatus?.connected && repositories.length > 0 && (
              <CardFooter>
                <Link href="/dashboard/repos" className="w-full">
                  <Button variant="outline" className="w-full">
                    View All Repositories
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Recent PRs</CardTitle>
              <CardDescription>Latest processed pull requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pullRequests.length > 0 ? (
                <div className="space-y-3 max-h-[150px] overflow-y-auto pr-2">
                  {pullRequests.slice(0, 3).map((pr: any, index: number) => (
                    <Link
                      key={pr.id || index}
                      href={`/dashboard/prs/${pr.id}`}
                      className="block"
                    >
                      <div
                        className="flex items-start justify-between p-3 rounded-md bg-secondary/50 border border-border hover:bg-secondary/80 hover:border-primary/20 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-background"
                            >
                              #{pr.number || "N/A"}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {pr.state || "open"}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate mb-1">
                            {pr.title || "Untitled PR"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pr.repo?.name || "Unknown Repository"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {pullRequests.length > 3 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      +{pullRequests.length - 3} more PRs
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[150px] text-center p-4">
                  <p className="text-sm text-muted-foreground">
                    No recent PRs found.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/prs" className="w-full">
                <Button variant="secondary" className="w-full">
                  View All Activity
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Sync Status */}
        <div className="mb-8">
          <SyncStatusWrapper />
        </div>

        {/* How it works - Compact */}
        <div className="border border-border rounded-lg p-8 bg-zinc-50/50">
          <h2 className="text-lg font-semibold mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Connect",
                desc: "Link your GitHub repositories",
              },
              { step: "02", title: "Merge", desc: "Work as normal, merge PRs" },
              {
                step: "03",
                title: "Generate",
                desc: "AI creates documentation",
              },
              {
                step: "04",
                title: "Export",
                desc: "Sync to Notion or Markdown",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <div className="text-xs font-mono text-zinc-400">
                  {item.step}
                </div>
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
