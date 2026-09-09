import { AuthResponse, JobStatus, MediaJobDTO, MediaType, PaginatedMediaJobsResponse, UserDTO, UserMediaStats } from '@repo/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || (data.errors ? data.errors.join(', ') : 'Request failed');
      throw new Error(errorMsg);
    }

    return data;
  }

  // Auth Methods
  static async register(email: string, password: string, name?: string): Promise<{ data: AuthResponse }> {
    return this.request<{ data: AuthResponse }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  static async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    return this.request<{ data: AuthResponse }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async googleAuth(payload: { credential?: string; email?: string; name?: string; googleId?: string }): Promise<{ data: AuthResponse }> {
    return this.request<{ data: AuthResponse }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getMe(): Promise<{ data: { user: UserDTO } }> {
    return this.request<{ data: { user: UserDTO } }>('/api/auth/me');
  }

  // Media Methods
  static async uploadFiles(
    files: File[]
  ): Promise<{ data: { jobs: MediaJobDTO[] } }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.request<{ data: { jobs: MediaJobDTO[] } }>('/api/media/upload', {
      method: 'POST',
      body: formData,
    });
  }

  static async getUserJobs(params?: {
    page?: number;
    limit?: number;
    mediaType?: string;
    status?: string;
  }): Promise<{ data: PaginatedMediaJobsResponse }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.mediaType && params.mediaType !== 'ALL') query.append('mediaType', params.mediaType);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/media/jobs?${queryString}` : '/api/media/jobs';
    return this.request<{ data: PaginatedMediaJobsResponse }>(endpoint);
  }

  static getThumbnailUrl(jobId: string, directUrl?: string | null): string {
    if (directUrl && directUrl.startsWith('http')) {
      return directUrl;
    }
    return `${API_BASE_URL}/api/media/thumbnails/${jobId}`;
  }

  static getDownloadUrl(jobId: string, type: 'thumbnail' | 'original' = 'thumbnail'): string {
    const token = this.getToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/api/media/download/${jobId}?type=${type}${tokenParam}`;
  }
}

export { ApiClient, API_BASE_URL };
