'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiService } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GithubIcon, CheckCircle, Loader2, ShieldCheck, Settings, Eye } from 'lucide-react';
import Link from 'next/link';

export default function ConnectGitHub() {
  const { getToken } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectGitHub = async () => {
    try {
      setConnecting(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError('Authentication required. Please sign in again.');
        setConnecting(false);
        return;
      }

      const installUrl = await apiService.installGitHubApp(token);
      window.location.href = installUrl;
    } catch (err) {
      console.error('Failed to start GitHub connection:', err);
      setError('Failed to start GitHub connection. Please try again.');
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <Link href="/">
          <h1 className="text-xl font-bold tracking-tight text-foreground cursor-pointer">
            SnapDocs
          </h1>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Connect your codebase
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              SnapDocs needs read-only access to your GitHub repositories to automatically generate documentation from your pull requests.
            </p>
          </div>

          {/* Connection Card */}
          <Card className="mx-auto max-w-md shadow-lg">
            <CardContent className="pt-8 pb-8 px-8 space-y-6">
              {/* GitHub Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                  <GithubIcon className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  Link GitHub Account
                </h2>
                <p className="text-sm text-muted-foreground">
                  Authorize SnapDocs to access your repositories.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
                  {error}
                </div>
              )}

              {/* Connect Button */}
              <Button
                onClick={handleConnectGitHub}
                disabled={connecting}
                className="w-full h-12 text-base"
                size="lg"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <GithubIcon className="mr-2 h-5 w-5" />
                    Authorize with GitHub
                  </>
                )}
              </Button>

            </CardContent>
          </Card>
        </div>
      </main>


    </div>
  );
}
