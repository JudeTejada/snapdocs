"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import GitHubConnection from "@/components/GitHubConnection";
import { apiService } from "@/services/api";

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; installationId?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const token = await getToken();
        
        const [statsResponse, githubResponse] = await Promise.all([
          apiService.getDashboardStats(token || undefined),
          apiService.getGitHubStatus(token || undefined)
        ]);

        if (statsResponse.success) {
          setStats(statsResponse.data?.stats);
        }

        if (githubResponse.success) {
          setGithubStatus({
            connected: githubResponse.data?.connected || false,
            installationId: githubResponse.data?.installationId
          });
        }

        if (!statsResponse.success) {
          setError("Failed to load dashboard data");
        }
      } catch (error) {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded && user) {
      loadDashboardData();
    }
  }, [isLoaded, user, getToken]);



  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid #e9ecef'
      }}>
        <Link href="/">
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            cursor: 'pointer'
          }}>
            SnapDocs
          </h1>
        </Link>
        <AuthButton />
      </header>

      {/* Dashboard Content */}
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Welcome back!
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            {user?.firstName ? `Hello, ${user.firstName}!` : 'Ready to document your code changes?'}
          </p>
          {user?.emailAddresses[0]?.emailAddress && (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              {user.emailAddresses[0].emailAddress}
            </p>
          )}
        </div>

        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div style={{ marginBottom: '2rem' }}>
            <p>Loading dashboard data...</p>
          </div>
        ) : stats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff', marginBottom: '0.5rem' }}>
                {stats.totalRepos || 0}
              </h3>
              <p style={{ color: '#666' }}>Repositories</p>
            </div>
            <div style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745', marginBottom: '0.5rem' }}>
                {stats.totalPRs || 0}
              </h3>
              <p style={{ color: '#666' }}>Pull Requests</p>
            </div>
            <div style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6f42c1', marginBottom: '0.5rem' }}>
                {stats.totalDocs || 0}
              </h3>
              <p style={{ color: '#666' }}>Documents Generated</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <GitHubConnection 
            onConnectionChange={(connected, installationId) => {
              setGithubStatus({ 
                connected, 
                installationId: connected ? installationId : undefined 
              });
            }}
          />

          <div style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              View Repositories
            </h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Check your connected repositories and their documentation status
            </p>
            <Link href="/dashboard/repos">
              <button style={{
                padding: '0.5rem 1rem',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                View Repos
              </button>
            </Link>
          </div>

          <div style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Recent PRs
            </h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              See the latest pull requests and their generated documentation
            </p>
            <Link href="/dashboard/prs">
              <button style={{
                padding: '0.5rem 1rem',
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                View PRs
              </button>
            </Link>
          </div>
        </div>

        {/* Getting Started */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            How it works
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>1. Connect</h4>
              <p style={{ fontSize: '0.9rem', opacity: '0.9' }}>
                Link your GitHub repositories to SnapDocs
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>2. Merge PRs</h4>
              <p style={{ fontSize: '0.9rem', opacity: '0.9' }}>
                Continue working as normal - SnapDocs monitors for merges
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>3. Auto-docs</h4>
              <p style={{ fontSize: '0.9rem', opacity: '0.9' }}>
                AI generates documentation, changelogs, and code summaries
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>4. Export</h4>
              <p style={{ fontSize: '0.9rem', opacity: '0.9' }}>
                Download markdown, post to Notion, or comment on GitHub
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}