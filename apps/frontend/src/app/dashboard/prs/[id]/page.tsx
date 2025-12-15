import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiService } from "@/services/api";
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
  ArrowLeftIcon,
  GitCommitIcon,
  FileTextIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  Loader2,
} from "lucide-react";
import { CopySummaryButton } from "@/components/CopySummaryButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function PRDetailContent({ params }: PageProps) {
  const { getToken } = await auth();
  const token = await getToken();
  const { id: prId } = await params;

  const response = await apiService.getPRDetail(prId, token || undefined);

  if (!response.success || !response.data) {
    notFound();
  }

  const pr = response.data;
  const summary = pr.docs?.json;
  const hasSummary = !!summary;

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStateBadgeVariant = (state: string) => {
    switch (state) {
      case "open":
        return "default";
      case "merged":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          PR #{pr.number}
        </h1>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={getStateBadgeVariant(pr.state)}>
              {pr.state}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {pr.repo.owner}/{pr.repo.name}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {pr.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            by @{pr.author} • {pr.sha ? `${pr.sha.substring(0, 7)}` : ""}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - PR Preview */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommitIcon className="h-5 w-5" />
                  Pull Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Repository</p>
                    <p className="text-sm">{pr.repo.owner}/{pr.repo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">PR Number</p>
                    <p className="text-sm">#{pr.number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Author</p>
                    <p className="text-sm">@{pr.author}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <Badge variant={getStateBadgeVariant(pr.state)} className="mt-1">
                      {pr.state}
                    </Badge>
                  </div>
                  {pr.sha && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Commit SHA</p>
                      <p className="text-sm font-mono">{pr.sha.substring(0, 7)}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <a
                    href={`https://github.com/${pr.repo.owner}/${pr.repo.name}/pull/${pr.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLinkIcon className="h-4 w-4 mr-2" />
                      View on GitHub
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Files Changed (from summary if available) */}
            {hasSummary && summary.filesChanged && summary.filesChanged.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileTextIcon className="h-5 w-5" />
                    Files Changed
                  </CardTitle>
                  <CardDescription>
                    {summary.filesChanged.length} file{summary.filesChanged.length !== 1 ? "s" : ""} modified
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.filesChanged.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border"
                      >
                        <span className="text-sm font-mono truncate">{file.name}</span>
                        <Badge
                          variant={
                            file.changeType === "added"
                              ? "default"
                              : file.changeType === "deleted"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {file.changeType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - AI Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  AI Summary
                </CardTitle>
                <CardDescription>
                  {hasSummary
                    ? `Generated ${new Date(summary.generatedAt).toLocaleDateString()}`
                    : "Summary pending..."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasSummary ? (
                  <div className="space-y-6">
                    {/* Risk Level */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Risk Level</p>
                      <Badge variant={getRiskBadgeVariant(summary.riskLevel)}>
                        {summary.riskLevel.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Breaking Changes */}
                    {summary.breakingChanges && (
                      <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
                        <AlertTriangleIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">Contains Breaking Changes</span>
                      </div>
                    )}

                    {/* Summary */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Overview</p>
                      <p className="text-sm leading-relaxed">{summary.summary}</p>
                    </div>

                    {/* Key Changes */}
                    {summary.keyChanges && summary.keyChanges.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Key Changes</p>
                        <ul className="space-y-2">
                          {summary.keyChanges.map((change, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Copy Button */}
                    <div className="pt-4 border-t">
                      <CopySummaryButton
                        summary={summary}
                        prTitle={pr.title}
                        prNumber={pr.number}
                        repoOwner={pr.repo.owner}
                        repoName={pr.repo.name}
                        author={pr.author}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ClockIcon className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Summary is being generated...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Refresh the page in a few moments.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PRDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PRDetailContent params={params} />
    </Suspense>
  );
}
