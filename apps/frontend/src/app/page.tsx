'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthButton from '@/components/AuthButton';
import { SignedIn, SignedOut } from '@clerk/nextjs';

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const healthResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/health`
        );
        const healthData = await healthResponse.json();
        setHealthStatus(healthData);
      } catch (error) {
        console.error('Backend connection error:', error);
      }
    };

    checkBackend();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid #e9ecef'
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          SnapDocs
        </h1>
        <AuthButton />
      </header>

      {/* Hero Section */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '20px',
          textAlign: 'center'
        }}
      >
        <h1
          style={{
            fontSize: '3.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          SnapDocs
        </h1>

        <p
          style={{
            fontSize: '1.4rem',
            color: '#666',
            marginBottom: '1rem',
            maxWidth: '600px'
          }}
        >
          Auto-generate documentation for your GitHub PRs with AI
        </p>

        <p
          style={{
            fontSize: '1.1rem',
            color: '#888',
            marginBottom: '3rem',
            maxWidth: '500px'
          }}
        >
          Transform merged pull requests into comprehensive documentation,
          changelogs, and code summaries
        </p>

        <SignedIn>
          <Link href='/dashboard'>
            <button
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Go to Dashboard
            </button>
          </Link>
        </SignedIn>

        <SignedOut>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Sign in to get started with SnapDocs
          </p>
        </SignedOut>

        {/* Status Section */}
        <div
          style={{
            marginTop: '3rem',
            background: '#f8f9fa',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            minWidth: '300px',
            maxWidth: '500px'
          }}
        >
          {healthStatus && (
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              <p>Status: {healthStatus.data.status}</p>
              <p>Uptime: {Math.round(healthStatus.data.uptime)}s</p>
              <p>
                Time:{' '}
                {new Date(healthStatus.data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
