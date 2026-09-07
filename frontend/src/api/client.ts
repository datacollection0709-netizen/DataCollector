const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('attribute3_token');
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // fallback to status text
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      // Check if network failure
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Your entered data is kept in the browser. Please check your internet and retry.');
      }
      throw error;
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<{ success: boolean; user: any }>('/auth/me');
  }

  async getUsers() {
    return this.request<{ success: boolean; users: any[] }>('/auth/users');
  }

  // Attributes
  async getAttribute(code = '3') {
    return this.request<{ success: boolean; attribute: any; years: any[] }>(`/attributes/${code}`);
  }

  // Submissions
  async getSubmissions() {
    return this.request<{ success: boolean; submissions: any[] }>('/submissions');
  }

  async getCurrentSubmission() {
    return this.request<{ success: boolean; submission: any; progress: any }>('/submissions/current');
  }

  async getSubmissionById(id: string) {
    return this.request<{ success: boolean; submission: any; progress: any }>(`/submissions/${id}`);
  }

  async saveDraft(id: string, values: any[]) {
    return this.request<{ success: boolean; savedAt: string; progress: any }>(`/submissions/${id}/draft`, {
      method: 'POST',
      body: JSON.stringify({ values }),
    });
  }

  async submitForReview(id: string) {
    return this.request<{ success: boolean; message: string; submission: any }>(`/submissions/${id}/submit`, {
      method: 'POST',
    });
  }

  async reviewSubmission(id: string, action: 'APPROVE' | 'REJECT', reason?: string) {
    return this.request<{ success: boolean; message: string; submission: any }>(`/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  }

  async addComment(id: string, comment: string, sectionCode?: string, fieldCode?: string) {
    return this.request<{ success: boolean; comment: any }>(`/submissions/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment, sectionCode, fieldCode }),
    });
  }

  // Documents
  async uploadDocument(formData: FormData) {
    return this.request<{ success: boolean; message: string; document: any }>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteDocument(id: string) {
    return this.request<{ success: boolean; message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  downloadDocumentUrl(id: string): string {
    const token = this.getToken();
    return `${API_BASE}/documents/${id}/download?token=${token}`;
  }

  async downloadExcel(submissionId: string, filename = 'Attribute_3_Report.xlsx') {
    const token = this.getToken();
    const response = await fetch(`${API_BASE}/submissions/${submissionId}/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download Excel report.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Audit
  async getAuditLogs(submissionId?: string) {
    const q = submissionId ? `?submissionId=${submissionId}` : '';
    return this.request<{ success: boolean; logs: any[] }>(`/audit${q}`);
  }

  // Health
  async getHealth() {
    const res = await fetch('/health');
    return res.json();
  }
}

export const api = new ApiClient();
