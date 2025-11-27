'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function useGitHubConnectionResult() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'github_connected') {
      setMessage('GitHub connected successfully! You can now auto-generate documentation for your PRs.');
      setMessageType('success');
      setIsProcessing(true);

      // Clean up URL after 3 seconds
      setTimeout(() => {
        window.history.replaceState({}, '', '/dashboard');
        setIsProcessing(false);
      }, 3000);
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        'no_installation': 'GitHub app installation was cancelled.',
        'no_installation_id': 'No installation ID received from GitHub.',
        'unauthorized': 'Authentication required to complete GitHub connection.',
        'connection_failed': 'Failed to connect GitHub account.',
        'callback_failed': 'An error occurred during GitHub callback processing.'
      };

      setMessage(errorMessages[error] || 'An error occurred while connecting GitHub.');
      setMessageType('error');
      setIsProcessing(true);

      // Clean up URL after 5 seconds
      setTimeout(() => {
        window.history.replaceState({}, '', '/dashboard');
        setIsProcessing(false);
      }, 5000);
    }
  }, [searchParams]);

  const clearMessage = () => {
    setMessage(null);
    setMessageType(null);
    setIsProcessing(false);
  };

  return { message, messageType, isProcessing, clearMessage };
}