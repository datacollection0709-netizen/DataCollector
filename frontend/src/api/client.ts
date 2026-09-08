import { attribute3Schema } from '../utils/schema';
import { ExcelService } from '../utils/excelGenerator';

class LocalApiClient {
  // Helpers
  private getLocalUser() {
    const userStr = localStorage.getItem('attribute3_local_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  private getSubmissionsData() {
    const subsStr = localStorage.getItem('attribute3_submissions');
    return subsStr ? JSON.parse(subsStr) : {};
  }

  private saveSubmissionsData(data: any) {
    localStorage.setItem('attribute3_submissions', JSON.stringify(data));
  }

  private delay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Auth
  async login(name: string, department: string) {
    await this.delay();
    const user = {
      id: 'local-user-id',
      name: name,
      role: 'DATA_ENTRY' as const,
      organizationId: 'local-org-id',
      organizationName: department,
    };
    localStorage.setItem('attribute3_local_user', JSON.stringify(user));
    return { success: true, token: 'local-token', user };
  }

  async getMe() {
    await this.delay();
    const user = this.getLocalUser();
    if (user) {
      return { success: true, user };
    }
    throw new Error('Not authenticated');
  }

  async getUsers() {
    return { success: true, users: [this.getLocalUser()].filter(Boolean) };
  }

  // Attributes
  async getAttribute(code = '3') {
    await this.delay();
    if (code === '3') {
      return attribute3Schema;
    }
    throw new Error('Attribute not found');
  }

  // Submissions
  async getSubmissions() {
    await this.delay();
    const subs = this.getSubmissionsData();
    const list = Object.values(subs).map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      updatedAt: sub.updatedAt,
      attribute: { title: 'Attribute 3: Infrastructure and Learning Resources' }
    }));
    return { success: true, submissions: list };
  }

  async getCurrentSubmission() {
    await this.delay();
    const subs = this.getSubmissionsData();
    let current: any = Object.values(subs).find((s: any) => s.status === 'DRAFT');
    
    if (!current) {
      current = {
        id: `sub-${Date.now()}`,
        status: 'DRAFT',
        values: [],
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      subs[current.id] = current;
      this.saveSubmissionsData(subs);
    }
    
    return { success: true, submission: current, progress: { total: 0, completed: 0, percentage: 0 } };
  }

  async getSubmissionById(id: string) {
    await this.delay();
    const subs = this.getSubmissionsData();
    if (subs[id]) {
      return { success: true, submission: subs[id], progress: { total: 0, completed: 0, percentage: 0 } };
    }
    throw new Error('Submission not found');
  }

  async saveDraft(id: string, values: any[]) {
    await this.delay(500); // Simulate network
    const subs = this.getSubmissionsData();
    if (!subs[id]) {
      subs[id] = { id, status: 'DRAFT', values: [], documents: [] };
    }
    subs[id].values = values;
    subs[id].updatedAt = new Date().toISOString();
    this.saveSubmissionsData(subs);
    return { success: true, savedAt: new Date().toISOString(), progress: { total: 0, completed: 0, percentage: 0 } };
  }

  async submitForReview(id: string) {
    await this.delay();
    const subs = this.getSubmissionsData();
    if (subs[id]) {
      subs[id].status = 'SUBMITTED';
      this.saveSubmissionsData(subs);
      return { success: true, message: 'Submitted successfully', submission: subs[id] };
    }
    throw new Error('Submission not found');
  }

  async reviewSubmission(id: string, action: 'APPROVE' | 'REJECT', reason?: string) {
    await this.delay();
    const subs = this.getSubmissionsData();
    if (subs[id]) {
      subs[id].status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      this.saveSubmissionsData(subs);
      return { success: true, message: 'Review recorded', submission: subs[id] };
    }
    throw new Error('Submission not found');
  }

  async addComment(id: string, comment: string, sectionCode?: string, fieldCode?: string) {
    await this.delay();
    return { success: true, comment: { id: Date.now().toString(), comment, sectionCode, fieldCode, createdAt: new Date() } };
  }

  // Documents (Mocked since we can't save files locally easily without IndexedDB)
  async uploadDocument(formData: FormData) {
    await this.delay();
    const file = formData.get('file') as File | null;
    return { success: true, message: 'File saved locally', document: { id: Date.now().toString(), originalFileName: file?.name || 'document.pdf' } };
  }

  async deleteDocument(id: string) {
    await this.delay();
    return { success: true, message: 'Document deleted' };
  }

  downloadDocumentUrl(id: string): string {
    return '#';
  }

  async downloadExcel(submissionId: string, filename = 'Attribute_3_Report.xlsx') {
    const subs = this.getSubmissionsData();
    const sub = subs[submissionId];
    if (!sub) throw new Error('Submission not found');

    const user = this.getLocalUser();
    await ExcelService.generateAndDownloadAttribute3Workbook(
      sub.values,
      user?.name || 'Local User',
      user?.organizationName || 'Department'
    );
  }

  // Audit
  async getAuditLogs(submissionId?: string) {
    return { success: true, logs: [] };
  }

  // Health
  async getHealth() {
    return { status: 'Healthy (Local Frontend Mode)', timestamp: new Date().toISOString() };
  }
}

export const api = new LocalApiClient();
