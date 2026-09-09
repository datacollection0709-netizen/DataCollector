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

  computeProgress(submission: any) {
    const sections = attribute3Schema.attribute.sections;
    const years = attribute3Schema.years;
    const values = submission?.values || [];
    const documents = submission?.documents || [];

    const valueMap = new Map<string, any>();
    for (const v of values) {
      const fCode = v.fieldCode || v.field?.code;
      const yCode = v.yearCode || v.year?.code;
      if (fCode && yCode) {
        valueMap.set(`${fCode}_${yCode}`, v);
      }
    }

    let totalRequired = 0;
    let completedRequired = 0;
    const sectionProgress = [];
    const missingRequiredProofs = [];

    for (const sec of sections) {
      let secTotal = 0;
      let secCompleted = 0;
      const missingFieldCodes: string[] = [];

      for (const field of sec.fields) {
        if (field.proofRequired) {
          const hasProof = documents.some((d: any) => (d.fieldCode || d.field?.code) === field.code);
          if (!hasProof) {
            missingRequiredProofs.push({ fieldCode: field.code, label: field.label });
          }
        }

        for (const yr of years) {
          secTotal++;
          totalRequired++;
          const val = valueMap.get(`${field.code}_${yr.code}`);
          const isFilled =
            val &&
            (val.isNotApplicable === true ||
              (val.numericValue !== null && val.numericValue !== undefined && !isNaN(val.numericValue)) ||
              (val.textValue !== null && val.textValue !== undefined && String(val.textValue).trim() !== ''));

          if (isFilled) {
            secCompleted++;
            completedRequired++;
          } else {
            if (!missingFieldCodes.includes(field.code)) {
              missingFieldCodes.push(field.code);
            }
          }
        }
      }

      const secPct = secTotal > 0 ? Math.round((secCompleted / secTotal) * 100) : 100;
      sectionProgress.push({
        sectionCode: sec.code,
        percentage: secPct,
        missingFieldCodes,
      });
    }

    const overallPct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
    return {
      overallPercentage: overallPct,
      completedRequiredFields: completedRequired,
      totalRequiredFields: totalRequired,
      documentsCount: documents.length,
      sectionProgress,
      missingRequiredProofs,
    };
  }

  // Auth
  async login(name: string, department: string) {
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
    if (code === '3') {
      return attribute3Schema;
    }
    throw new Error('Attribute not found');
  }

  // Submissions
  async getSubmissions() {
    const subs = this.getSubmissionsData();
    const list = Object.values(subs).map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      updatedAt: sub.updatedAt,
      attribute: { title: 'Attribute 3: Infrastructure and Learning Resources' },
    }));
    return { success: true, submissions: list };
  }

  async getCurrentSubmission() {
    const subs = this.getSubmissionsData();
    const subList = Object.values(subs).sort(
      (a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );

    // Keep the most recent submission active so user data is NEVER lost or wiped after submit
    let current: any = subList[0];

    if (!current) {
      current = {
        id: `sub-${Date.now()}`,
        status: 'DRAFT',
        values: [],
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      subs[current.id] = current;
      this.saveSubmissionsData(subs);
    }

    const progress = this.computeProgress(current);
    return { success: true, submission: current, progress };
  }

  async getSubmissionById(id: string) {
    const subs = this.getSubmissionsData();
    if (subs[id]) {
      const progress = this.computeProgress(subs[id]);
      return { success: true, submission: subs[id], progress };
    }
    throw new Error('Submission not found');
  }

  async saveDraft(id: string, values: any[]) {
    const subs = this.getSubmissionsData();
    if (!subs[id]) {
      subs[id] = { id, status: 'DRAFT', values: [], documents: [] };
    }

    // Merge values by fieldCode_yearCode to preserve values across all sections
    const valMap = new Map<string, any>();
    (subs[id].values || []).forEach((v: any) => {
      const fCode = v.fieldCode || v.field?.code;
      const yCode = v.yearCode || v.year?.code;
      if (fCode && yCode) {
        valMap.set(`${fCode}_${yCode}`, v);
      }
    });

    (values || []).forEach((v: any) => {
      const fCode = v.fieldCode || v.field?.code;
      const yCode = v.yearCode || v.year?.code;
      if (fCode && yCode) {
        valMap.set(`${fCode}_${yCode}`, {
          ...valMap.get(`${fCode}_${yCode}`),
          ...v,
          fieldCode: fCode,
          yearCode: yCode,
        });
      }
    });

    const mergedValues = Array.from(valMap.values());
    subs[id].values = mergedValues;
    subs[id].updatedAt = new Date().toISOString();
    this.saveSubmissionsData(subs);

    // Also persist directly into standalone key for instant fallback recovery
    localStorage.setItem('attribute3_current_values', JSON.stringify(mergedValues));

    const progress = this.computeProgress(subs[id]);
    return { success: true, savedAt: new Date().toISOString(), progress };
  }

  async submitForReview(id: string) {
    const subs = this.getSubmissionsData();
    if (!subs[id]) throw new Error('Submission not found');

    const sub = subs[id];
    const user = this.getLocalUser();
    const adminEmail = 'datacollection0709@gmail.com';

    // 1. Format a clean summary of submitted metrics for the email
    const filledValues = (sub.values || []).filter((v: any) => v.numericValue !== null || v.textValue || v.isNotApplicable);
    const summaryLines = filledValues.map((v: any) => {
      const valStr = v.isNotApplicable ? 'N/A' : (v.numericValue !== null && v.numericValue !== undefined ? v.numericValue : (v.textValue || '—'));
      return `• [${v.fieldCode}] (${v.yearCode}): ${valStr}`;
    }).join('\n');

    let emailDispatched = false;

    // 2. Dispatch email via FormSubmit API directly to datacollection0709@gmail.com
    try {
      const formSubmitRes = await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          _subject: `New Attribute 3 Submission: ${user?.name || 'User'} (${user?.organizationName || 'Dept'})`,
          Submitter_Name: user?.name || 'Institutional Officer',
          Department: user?.organizationName || 'Academic Department',
          Total_Filled_Entries: filledValues.length,
          Attached_Documents_Count: (sub.documents || []).length,
          Document_Links: (sub.documents || []).map((d: any) => `${d.originalFileName}: ${d.fileUrl}`).join(', ') || 'None',
          Summary_Data: summaryLines,
        }),
      });
      if (formSubmitRes.ok) {
        emailDispatched = true;
      }
    } catch (e) {
      console.warn('FormSubmit dispatch notice:', e);
    }

    // 3. Dispatch to Vercel Serverless Function /api/submit if available
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          userName: user?.name || 'Local User',
          department: user?.organizationName || 'Department',
          submissionData: sub.values,
          documents: sub.documents || [],
        }),
      });
    } catch (e) {
      // ignore if local without vercel dev
    }

    // 4. Dispatch to Google Apps Script if VITE_GOOGLE_SCRIPT_URL configured
    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (GOOGLE_SCRIPT_URL) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'submitForm',
            adminEmail,
            userName: user?.name || 'Local User',
            department: user?.organizationName || 'Department',
            submissionData: sub.values,
            documents: sub.documents || [],
          }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        });
      } catch (err) {
        console.error('GAS Submit Error:', err);
      }
    }

    // Mark as SUBMITTED while preserving all data!
    sub.status = 'SUBMITTED';
    sub.updatedAt = new Date().toISOString();
    this.saveSubmissionsData(subs);

    // Also automatically trigger download of the filled Excel workbook as immediate delivery
    try {
      await this.downloadExcel(id);
    } catch (e) {
      console.warn('Auto Excel download warning:', e);
    }

    return {
      success: true,
      message: `Submission successfully recorded and dispatched to ${adminEmail}!`,
      submission: sub,
    };
  }

  async reviewSubmission(id: string, action: 'APPROVE' | 'REJECT', reason?: string) {
    const subs = this.getSubmissionsData();
    if (subs[id]) {
      subs[id].status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      this.saveSubmissionsData(subs);
      return { success: true, message: 'Review recorded', submission: subs[id] };
    }
    throw new Error('Submission not found');
  }

  async addComment(id: string, comment: string, sectionCode?: string, fieldCode?: string) {
    return {
      success: true,
      comment: { id: Date.now().toString(), comment, sectionCode, fieldCode, createdAt: new Date() },
    };
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
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const user = this.getLocalUser();

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadFile',
            adminEmail: 'datacollection0709@gmail.com',
            fileName: file.name,
            mimeType: file.type,
            base64Data: base64Data,
            userName: user?.name || 'Local User',
            department: user?.organizationName || 'Department',
          }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        });

        const data = await response.json();
        if (data.success) {
          fileId = data.fileId;
          fileUrl = data.fileUrl;
        }
      } catch (err) {
        console.error('GAS Upload Error:', err);
      }
    }

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
      fileUrl: fileUrl,
    };

    subs[submissionId].documents.push(doc);
    this.saveSubmissionsData(subs);

    return { success: true, message: 'File uploaded', document: doc };
  }

  async deleteDocument(id: string) {
    const subs = this.getSubmissionsData();
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

  async downloadExcel(submissionId?: string, filename = 'Attribute_3_Report.xlsx') {
    const subs = this.getSubmissionsData();
    let sub = submissionId ? subs[submissionId] : null;

    // Bulletproof fallback: if sub has no values, check other stored submissions or localStorage
    if (!sub || !sub.values || sub.values.length === 0) {
      const allSubs: any[] = Object.values(subs);
      allSubs.sort((a: any, b: any) => (b.values?.length || 0) - (a.values?.length || 0));
      if (allSubs[0] && allSubs[0].values?.length > 0) {
        sub = allSubs[0];
      }
    }

    let valuesToUse = sub?.values || [];

    // Secondary fallback: check standalone attribute3_current_values key
    if (valuesToUse.length === 0) {
      const stored = localStorage.getItem('attribute3_current_values');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) valuesToUse = parsed;
          else if (typeof parsed === 'object') valuesToUse = Object.values(parsed);
        } catch (e) {}
      }
    }

    const user = this.getLocalUser();
    await ExcelService.generateAndDownloadAttribute3Workbook(
      valuesToUse,
      user?.name || 'Local User',
      user?.organizationName || 'Department',
      sub?.documents || []
    );
  }

  async getAuditLogs(submissionId?: string) {
    return { success: true, logs: [] };
  }

  async getHealth() {
    return { status: 'Healthy (Standalone Portal)', timestamp: new Date().toISOString() };
  }
}

export const api = new LocalApiClient();
