'use client';

import { useRouter } from 'next/navigation';
import GitHubConnection from '@/components/GitHubConnection';

export default function GitHubWrapper({ status }: { status: any }) {
  const router = useRouter();
  return (
    <GitHubConnection 
      currentStatus={status} 
      onConnectionChange={() => router.refresh()} 
    />
  );
}
