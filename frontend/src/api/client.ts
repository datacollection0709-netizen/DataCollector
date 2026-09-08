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
    const subs = this.getSubmissionsData();
    if (!subs[id]) throw new Error('Submission not found');

    const sub = subs[id];
    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

    if (GOOGLE_SCRIPT_URL) {
      const user = this.getLocalUser();
      
      const payload = {
        action: 'submitForm',
        userName: user?.name || 'Local User',
        department: user?.organizationName || 'Department',
        submissionData: sub.values,
        documents: sub.documents || []
      };

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to submit to Google Sheets');
        }
      } catch (err) {
        console.error('GAS Submit Error:', err);
        throw new Error('Failed to submit data to Google Sheets. Check your Apps Script deployment.');
      }
    } else {
      await this.delay(); // Mock delay
    }

    sub.status = 'SUBMITTED';
    this.saveSubmissionsData(subs);
    return { success: true, message: 'Submitted successfully', submission: sub };
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

  // Documents
  async uploadDocument(formData: FormData) {
    const file = formData.get('file') as File | null;
    const submissionId = formData.get('submissionId') as string;
    const fieldCode = formData.get('fieldCode') as string;
    const yearCode = formData.get('yearCode') as string | null;

    if (!file || !submissionId) throw new Error('Missing file or submissionId');

    let fileUrl = '#';
    let fileId = Date.now().toString();

    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

    if (GOOGLE_SCRIPT_URL) {
      // Convert to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

      const user = this.getLocalUser();

      const payload = {
        action: 'uploadFile',
        fileName: file.name,
        mimeType: file.type,
        base64Data: base64Data,
        userName: user?.name || 'Local User',
        department: user?.organizationName || 'Department'
      };

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to upload to Google Drive');

        fileId = data.fileId;
        fileUrl = data.fileUrl;
      } catch (err) {
        console.error('GAS Upload Error:', err);
        throw new Error('Failed to upload file to Google Drive. Check your Apps Script deployment.');
      }
    } else {
      await this.delay(); // Mock delay
    }

    // Save to local submission data
    const subs = this.getSubmissionsData();
    if (!subs[submissionId]) {
      subs[submissionId] = { id: submissionId, status: 'DRAFT', values: [], documents: [] };
    }
    if (!subs[submissionId].documents) {
      subs[submissionId].documents = [];
    }

    const doc = {
      id: fileId,
      fieldCode,
      yearCode,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      fileUrl: fileUrl
    };

    subs[submissionId].documents.push(doc);
    this.saveSubmissionsData(subs);

    return { success: true, message: 'File uploaded', document: doc };
  }

  async deleteDocument(id: string) {
    await this.delay();
    const subs = this.getSubmissionsData();
    // We would need to search across all submissions to delete the document locally
    for (const subId in subs) {
      if (subs[subId].documents) {
        subs[subId].documents = subs[subId].documents.filter((d: any) => d.id !== id);
      }
    }
    this.saveSubmissionsData(subs);
    return { success: true, message: 'Document deleted' };
  }

  downloadDocumentUrl(id: string): string {
    const subs = this.getSubmissionsData();
    for (const subId in subs) {
      const doc = subs[subId].documents?.find((d: any) => d.id === id);
      if (doc && doc.fileUrl && doc.fileUrl !== '#') {
        return doc.fileUrl;
      }
    }
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
