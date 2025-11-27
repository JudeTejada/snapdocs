'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { apiService } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function GitHubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const installationId = searchParams.get('installation_id');
      const error = searchParams.get('error');
      
      if (error) {
        router.push(`/dashboard?error=${error}`);
        return;
      }

      if (!installationId) {
        router.push('/dashboard?error=no_installation_id');
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          router.push('/dashboard?error=unauthorized');
          return;
        }

        const response = await apiService.connectGitHub(installationId, token);
        
        if (response.success) {
          router.push('/dashboard?success=github_connected');
        } else {
          router.push(`/dashboard?error=${encodeURIComponent(response.error || 'connection_failed')}`);
        }
      } catch (err) {
        console.error('Error processing GitHub callback:', err);
        router.push('/dashboard?error=callback_failed');
      }
    };

    handleCallback();
  }, [router, searchParams, getToken]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md text-center p-8">
        <CardContent className="flex flex-col items-center space-y-4 pt-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Connecting GitHub...
            </h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we complete your GitHub connection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GitHubCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <GitHubCallbackContent />
    </Suspense>
  );
}