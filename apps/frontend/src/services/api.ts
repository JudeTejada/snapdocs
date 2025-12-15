const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export interface AuthUser {
  clerkId: string;
  email: string;
  githubId?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private getHeaders(token?: string) {
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async syncUserIfNeeded(
    token?: string,
  ): Promise<ApiResponse<{ user: AuthUser }>> {
    try {
      const currentUserResult = await this.getCurrentUser(token);

      if (currentUserResult.success && currentUserResult.data?.user) {
        // User already exists, no need to sync
        return currentUserResult;
      }

      // User doesn't exist, need to sync
      return await this.syncUser(token);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync user",
      };
    }
  }

  async syncUser(token?: string): Promise<ApiResponse<{ user: AuthUser }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/sync-user`, {
        method: "POST",
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: { user: result.data },
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to sync user",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync user",
      };
    }
  }

  async getCurrentUser(
    token?: string,
  ): Promise<ApiResponse<{ user: AuthUser }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: { user: result.data },
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get user",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user",
      };
    }
  }

  async getGitHubStatus(
    token?: string,
  ): Promise<ApiResponse<{ connected: boolean; installationId?: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/status`, {
        headers,
      });

      const result = await response.json();

      // Handle both wrapped response { success, data } and direct response { connected, installationId }
      if (result.success !== undefined) {
        // Wrapped response
        if (result.success) {
          return {
            success: true,
            data: result.data,
          };
        } else {
          return {
            success: false,
            error: result.error?.message || "Failed to get GitHub status",
          };
        }
      } else {
        // Direct response from backend
        return {
          success: true,
          data: {
            connected: result.connected,
            installationId: result.installationId,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get GitHub status",
      };
    }
  }

  async connectGitHub(
    installationId: string,
    token?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/connect`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: "placeholder",
          installationId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to connect GitHub",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to connect GitHub",
      };
    }
  }

  async installGitHubApp(token?: string): Promise<string> {
    const headers = this.getHeaders(token);
    const response = await fetch(`${API_BASE_URL}/auth/github/install`, {
      method: "GET",
      headers,
    });

    if (response.redirected) {
      return response.url;
    }

    const result = await response.json();

    if (result.url) {
      return result.url;
    } else {
      throw new Error(
        result.error?.message || "Failed to get GitHub installation URL",
      );
    }
  }

  async disconnectGitHub(
    token?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/disconnect`, {
        method: "POST",
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to disconnect GitHub",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to disconnect GitHub",
      };
    }
  }

  async getDashboardStats(
    token?: string,
  ): Promise<ApiResponse<{ stats: any }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: { stats: result.data },
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get dashboard stats",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get dashboard stats",
      };
    }
  }

  async getUserRepos(token?: string): Promise<ApiResponse<{ repos: any[] }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/repos`, {
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: { repos: result.data },
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get repos",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get repos",
      };
    }
  }

  async getGitHubRepositories(
    token?: string,
  ): Promise<ApiResponse<{ repositories: any[]; count: number }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/repositories`, {
        headers,
      });

      const result = await response.json();
      console.log(result, "result");

      if (result.success) {
        return {
          success: true,
          data: {
            repositories: result.data?.data || [],
            count: result.data?.count || 0,
          },
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get GitHub repositories",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get GitHub repositories",
      };
    }
  }

  async getUserPRs(token?: string): Promise<ApiResponse<{ prs: any[] }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/prs`, {
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: { prs: result.data },
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get PRs",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get PRs",
      };
    }
  }

  async getSyncStatus(
    token?: string,
  ): Promise<ApiResponse<{ syncStatus: any }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/sync-status`, {
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: { syncStatus: result.data },
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get sync status",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get sync status",
      };
    }
  }

  async refreshData(token?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/refresh`, {
        method: "POST",
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to refresh data",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to refresh data",
      };
    }
  }

  async getPRDetail(prId: string, token?: string): Promise<ApiResponse<PRDetail>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/prs/${prId}`, {
        headers,
      });

      if (response.status === 404) {
        return {
          success: false,
          error: "Pull request not found",
        };
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get PR details",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get PR details",
      };
    }
  }

  async getGitHubConfigureUrl(
    token?: string,
  ): Promise<ApiResponse<{ url: string; installationId: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/configure`, {
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: {
            url: result.url,
            installationId: result.installationId,
          },
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to get GitHub configuration URL",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get GitHub configuration URL",
      };
    }
  }

  async triggerSync(
    token?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/sync`, {
        method: "POST",
        headers,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: { message: result.message },
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to sync repositories",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync repositories",
      };
    }
  }

  async getRepositoryDetail(
    repoId: string,
    page: number = 1,
    limit: number = 20,
    token?: string,
  ): Promise<ApiResponse<RepositoryWithPRs>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(
        `${API_BASE_URL}/dashboard/repos/${repoId}?page=${page}&limit=${limit}`,
        { headers },
      );

      if (response.status === 404) {
        return {
          success: false,
          error: "Repository not found",
        };
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error?.message || "Failed to get repository details",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get repository details",
      };
    }
  }
}

export interface RepositoryDetail {
  id: string;
  name: string;
  owner: string;
  provider: string;
  createdAt: string;
  lastSyncAt: string | null;
}

export interface PRListItem {
  id: string;
  number: number;
  title: string;
  author: string;
  state: string;
  mergedAt: string;
  repo: {
    name: string;
    owner: string;
  };
  hasDocs: boolean;
  docsSummary: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RepositoryWithPRs {
  repository: RepositoryDetail;
  prs: PRListItem[];
  pagination: PaginationMeta;
}

export interface PRDetail {
  id: string;
  number: number;
  title: string;
  author: string;
  state: string;
  sha: string | null;
  mergedAt: string;
  repo: {
    id: string;
    name: string;
    owner: string;
    installId: string;
  };
  docs: {
    id: string;
    summary: string;
    json: PRSummary | null;
    generatedAt: string;
  } | null;
}

export interface PRSummary {
  summary: string;
  keyChanges: string[];
  filesChanged: Array<{ name: string; changeType: "added" | "modified" | "deleted" }>;
  breakingChanges: boolean;
  riskLevel: "low" | "medium" | "high";
  generatedAt: string;
}

export const apiService = new ApiService();
