"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Github,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { syncRepositories } from "./actions";

interface GitHubConnectionCardProps {
  githubStatus: {
    connected: boolean;
    installationId?: string;
  };
}

export function GitHubConnectionCard({ githubStatus }: GitHubConnectionCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);

      const result = await syncRepositories();

      if (result.success) {
        setMessage({
          type: "success",
          text: "Repositories synced successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to sync repositories",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while syncing",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleManageRepositories = () => {
    const url = githubStatus?.installationId
      ? `https://github.com/settings/installations/${githubStatus.installationId}`
      : null;

    if (url) {
      window.open(url, "_blank");
    } else {
      setMessage({
        type: "error",
        text: "Unable to get GitHub configuration URL.",
      });
    }
  };

  return (
    <>
      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-md text-sm font-medium ${
            message.type === "success"
              ? "bg-green-500/10 text-green-600"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Github className="h-6 w-6" />
              <div>
                <CardTitle>GitHub Connection</CardTitle>
                <CardDescription>
                  Manage your GitHub App installation
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={githubStatus?.connected ? "default" : "secondary"}
              className={
                githubStatus?.connected
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : ""
              }
            >
              {githubStatus?.connected ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </span>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {githubStatus?.connected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your GitHub App is installed and connected. You can manage
                which repositories SnapDocs has access to by clicking the
                button below.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleManageRepositories} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Repositories on GitHub
                </Button>
                <Button
                  onClick={handleSync}
                  variant="secondary"
                  disabled={syncing}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                  />
                  {syncing ? "Syncing..." : "Re-sync Repositories"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your GitHub account to start monitoring repositories.
              </p>
              <Link href="/connect-github">
                <Button>
                  <Github className="h-4 w-4 mr-2" />
                  Connect GitHub
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
