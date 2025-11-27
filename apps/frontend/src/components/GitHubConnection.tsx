"use client";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "lucide-react";

interface GitHubConnectionProps {
  onConnectionChange?: (connected: boolean, installationId?: string) => void;
  currentStatus?: {
    connected: boolean;
    installationId?: string;
  };
}

export default function GitHubConnection({
  onConnectionChange,
  currentStatus,
}: GitHubConnectionProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectGitHub = async () => {
    try {
      setConnecting(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const installUrl = await apiService.installGitHubApp(token);
      window.location.href = installUrl;
    } catch (error) {
      setError("Failed to start GitHub connection");
      setConnecting(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      setConnecting(true);
      setError(null);

      const token = await getToken();
      const response = await apiService.disconnectGitHub(token || undefined);

      if (response.success) {
        onConnectionChange?.(false);
      } else {
        setError(response.error || "Failed to disconnect GitHub");
      }
    } catch (error) {
      setError("Failed to disconnect GitHub");
    } finally {
      setConnecting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
            <GithubIcon className="w-6 h-6" />
          </div>
          <div>
            <CardTitle>GitHub Connection</CardTitle>
            <CardDescription>
              Connect your repositories to enable auto-documentation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {currentStatus && (
          <div className={`p-4 rounded-md border ${
            currentStatus.connected 
              ? "bg-zinc-50 border-zinc-200" 
              : "bg-zinc-50 border-zinc-200"
          }`}>
            {currentStatus.connected ? (
              <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Connected to GitHub
                 </div>
                {currentStatus.installationId && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    ID: {currentStatus.installationId}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                 <span className="h-2 w-2 rounded-full bg-zinc-300" />
                 Not connected
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Capabilities:</p>
          <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
            <li>Monitor repositories for merged PRs</li>
            <li>Analyze code changes and diffs</li>
            <li>Generate documentation automatically</li>
            <li>Post summaries to PR comments</li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-4 border-t bg-zinc-50/50 pt-6">
        <Button
          onClick={currentStatus?.connected ? handleDisconnectGitHub : handleConnectGitHub}
          disabled={connecting}
          variant={currentStatus?.connected ? "destructive" : "default"}
          className="w-full sm:w-auto"
        >
          {connecting 
            ? "Processing..." 
            : (currentStatus?.connected ? "Disconnect GitHub" : "Connect GitHub Account")
          }
        </Button>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Requires GitHub OAuth. You will be redirected to GitHub to authorize access.
          We only access repositories you explicitly grant permission to.
        </p>
      </CardFooter>
    </Card>
  );
}