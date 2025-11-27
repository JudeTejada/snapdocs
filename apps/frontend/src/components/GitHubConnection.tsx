"use client";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { apiService } from "@/services/api";

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
      console.log(installUrl, "installUrl");
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
    <div
      style={{
        background: "#fff",
        padding: "1.5rem",
        borderRadius: "12px",
        border: "1px solid #e9ecef",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "#333",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "1rem",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </div>
        <div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              marginBottom: "0.25rem",
            }}
          >
            GitHub Connection
          </h3>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>
            Connect your GitHub repositories to start auto-generating
            documentation
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {currentStatus && (
        <div
          style={{
            background: currentStatus.connected ? "#d4edda" : "#fff3cd",
            color: currentStatus.connected ? "#155724" : "#856404",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            border: `1px solid ${currentStatus.connected ? "#c3e6cb" : "#ffeaa7"}`,
          }}
        >
          {currentStatus.connected ? (
            <div>
              <strong>✓ GitHub Connected</strong>
              {currentStatus.installationId && (
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem" }}>
                  Installation ID: {currentStatus.installationId}
                </p>
              )}
            </div>
          ) : (
            "GitHub not connected"
          )}
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: "1.4" }}>
          By connecting GitHub, SnapDocs will be able to:
        </p>
        <ul
          style={{
            marginTop: "0.5rem",
            paddingLeft: "1.5rem",
            fontSize: "0.9rem",
            color: "#555",
          }}
        >
          <li>Monitor your repositories for merged pull requests</li>
          <li>Read PR diffs and code changes</li>
          <li>Generate comprehensive documentation</li>
          <li>Post comments with documentation summaries</li>
        </ul>
      </div>

      <button
        onClick={currentStatus?.connected ? handleDisconnectGitHub : handleConnectGitHub}
        disabled={connecting}
        style={{
          padding: "0.75rem 1.5rem",
          background: connecting ? "#6c757d" : currentStatus?.connected ? "#dc3545" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: connecting ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: "500",
        }}
      >
        {connecting 
          ? (currentStatus?.connected ? "Disconnecting..." : "Connecting...") 
          : (currentStatus?.connected ? "Disconnect GitHub" : "Connect GitHub")
        }
      </button>

      <p
        style={{
          marginTop: "1rem",
          fontSize: "0.8rem",
          color: "#888",
          lineHeight: "1.4",
        }}
      >
        GitHub App OAuth required. This will redirect to GitHub for
        authorization. We&apos;ll only access repositories you explicitly grant
        permission to.
      </p>
    </div>
  );
}
