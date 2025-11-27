"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import GitHubConnection from "@/components/GitHubConnection";
import { apiService } from "@/services/api";

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<any>(null);
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; installationId?: string } | null>(null);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubMessage, setGithubMessage] = useState<string | null>(null);
  const [githubMessageType, setGithubMessageType] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const token = await getToken();
        
        const [statsResponse, githubResponse, repoResponse] = await Promise.all([
          apiService.getDashboardStats(token || undefined),
          apiService.getGitHubStatus(token || undefined),
          apiService.getGitHubRepositories(token || undefined)
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

        if (repoResponse.success) {
          setRepositories(repoResponse.data?.repositories || []);
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
            currentStatus={githubStatus || { connected: false }}
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
              Connected Repositories
            </h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Repositories with SnapDocs access
            </p>
            
            {githubStatus?.connected ? (
              <div>
                {loading ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>Loading repositories...</p>
                ) : repositories.length > 0 ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {repositories.slice(0, 3).map((repo) => (
                      <div key={repo.id} style={{
                        padding: '0.5rem',
                        marginBottom: '0.5rem',
                        background: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {repo.full_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                          {repo.private ? '🔒 Private' : '🔓 Public'} • {repo.language || 'Unknown'}
                        </div>
                      </div>
                    ))}
                    {repositories.length > 3 && (
                      <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', marginTop: '0.5rem' }}>
                        +{repositories.length - 3} more repositories
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>
                    No repositories found. Make sure to grant repository access during installation.
                  </p>
                )}
                
                <Link href="/dashboard/repos">
                  <button style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}>
                    View All Repos ({repositories.length})
                  </button>
                </Link>
              </div>
            ) : (
              <div>
                <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>
                  Connect your GitHub account to see repositories
                </p>
                <p style={{ fontSize: '0.8rem', color: '#888' }}>
                  After connecting, grant repository access during GitHub App installation
                </p>
              </div>
            )}
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