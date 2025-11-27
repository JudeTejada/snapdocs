'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { apiService } from '@/services/api';

export default function GitHubCallback() {
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
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>
          Connecting GitHub...
        </h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Please wait while we complete your GitHub connection.
        </p>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}