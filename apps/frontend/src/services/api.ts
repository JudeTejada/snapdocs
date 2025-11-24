const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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

  async syncUser(token?: string): Promise<ApiResponse<{ user: AuthUser }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/sync-user`, {
        method: "POST",
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync user",
      };
    }
  }

  async getCurrentUser(token?: string): Promise<ApiResponse<{ user: AuthUser }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user",
      };
    }
  }

  async getGitHubStatus(token?: string): Promise<ApiResponse<{ connected: boolean; installationId?: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/status`, {
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get GitHub status",
      };
    }
  }

  async connectGitHub(installationId: string, token?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/connect`, {
        method: "POST",
        headers,
        body: JSON.stringify({ installationId }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect GitHub",
      };
    }
  }

  async disconnectGitHub(token?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/auth/github/disconnect`, {
        method: "POST",
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect GitHub",
      };
    }
  }

  async getDashboardStats(token?: string): Promise<ApiResponse<{ stats: any }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get dashboard stats",
      };
    }
  }

  async getUserRepos(token?: string): Promise<ApiResponse<{ repos: any[] }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/repos`, {
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get repos",
      };
    }
  }

  async getUserPRs(token?: string): Promise<ApiResponse<{ prs: any[] }>> {
    try {
      const headers = this.getHeaders(token);
      const response = await fetch(`${API_BASE_URL}/dashboard/prs`, {
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get PRs",
      };
    }
  }
}

export const apiService = new ApiService();