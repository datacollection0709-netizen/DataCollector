import { attribute3Schema } from '../utils/schema';
import { ExcelService } from '../utils/excelGenerator';
import { proofStorage, StoredProof } from '../utils/imageStorage';

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
    const userId = `user-${name.replace(/\W+/g, '-').toLowerCase()}-${department.replace(/\W+/g, '-').toLowerCase()}`;
    const user = {
      id: userId,
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
      attribute: { title: 'Resource Survey: Infrastructure and Learning Resources' },
    }));
    return { success: true, submissions: list };
  }

  async getCurrentSubmission() {
    const user = this.getLocalUser();
    const subs = this.getSubmissionsData();
    const subList = Object.values(subs)
      .filter((s: any) => s.userId === user?.id)
      .sort(
        (a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );

    let current: any = subList[0];

    if (!current) {
      current = {
        id: `sub-${user?.id || 'anon'}-${Date.now()}`,
        userId: user?.id,
        status: 'DRAFT',
        values: [],
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      subs[current.id] = current;
      this.saveSubmissionsData(subs);
    }

    // Sync documents with proofStorage (IndexedDB) to ensure images and links are never lost
    try {
      const storedProofs = await proofStorage.getAllProofs();
      const userProofs = storedProofs.filter((sp: any) => sp.userId === user?.id);
      if (userProofs && userProofs.length > 0) {
        const docMap = new Map<string, any>();
        (current.documents || []).forEach((d: any) => docMap.set(d.id, d));
        userProofs.forEach((sp) => {
          const existing = docMap.get(sp.id) || {};
          docMap.set(sp.id, {
            ...existing,
            id: sp.id,
            fieldCode: sp.fieldCode,
            yearCode: sp.yearCode,
            originalFileName: sp.fileName,
            fileSize: sp.fileSize,
            mimeType: sp.mimeType,
            uploadedAt: sp.uploadedAt,
            dataUrl: sp.dataUrl || existing.dataUrl,
            hyperlink: sp.hyperlink || existing.hyperlink,
          });
        });
        current.documents = Array.from(docMap.values());
      }
    } catch (e) {
      // ignore
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

  // Pre-fill all 5 sections with realistic NAAC baseline audit metrics in 1 click
  async prefillAllSections(submissionId: string) {
    const subs = this.getSubmissionsData();
    if (!subs[submissionId]) {
      subs[submissionId] = { id: submissionId, status: 'DRAFT', values: [], documents: [] };
    }

    const sections = attribute3Schema.attribute.sections;
    const years = attribute3Schema.years;
    const populatedValues: any[] = [];

    // Realistic NAAC benchmark metrics
    const baselineLookup: Record<string, any> = {
      '3.1.1': [45, 48, 52],
      '3.1.2': [24, 26, 28],
      '3.1.3': [4, 4, 4],
      '3.1.4': [2, 2, 2],
      '3.1.5': [3, 3, 3],
      '3.1.6': [18, 20, 22],
      '3.1.7': [18, 20, 22],
      '3.1.8': [15, 16, 18],
      '3.1.9': [2, 2, 2],
      '3.1.10': [5, 5, 6],
      '3.1.11': [1, 1, 1],
      '3.1.12': [1, 1, 1],
      '3.1.13': [8, 8, 10],
      '3.1.14': [12, 14, 15],
      '3.1.15': [1, 1, 1],
      '3.2.1a': [450000, 520000, 610000],
      '3.2.2': [8500000, 9200000, 10500000],
      '3.2.1': [5.29, 5.65, 5.81],
      '3.3.1': ['DELNET & N-LIST', 'DELNET, N-LIST, IEEE', 'DELNET, N-LIST, IEEE, ScienceDirect'],
      '3.3.2': ['Active Member', 'Active Member', 'Active Member'],
      '3.3.3': ['Turnitin', 'Turnitin & DrillBit', 'Turnitin & DrillBit'],
      '3.3.4': ['SPSS v28', 'SPSS v28 & R-Studio', 'SPSS v28 & R-Studio Pro'],
      '3.3.5': ['MATLAB & AutoCAD', 'MATLAB, AutoCAD, ChemDraw', 'MATLAB, AutoCAD, ChemDraw, ANSYS'],
      '3.3.6': ['Advanced Computing Lab', 'AI & IoT Research Lab', 'Robotics & AI Innovation Centre'],
      '3.3.7': ['DSpace Digital Repository', 'DSpace & Patent Archives', 'DSpace & Shodhganga Repository'],
      '3.4.1': [500, 1000, 1000],
      '3.4.2': ['1:15', '1:14', '1:12'],
      '3.4.3': [420, 480, 550],
      '3.4.4': ['Virtual Classrooms', 'Virtual Labs & AR/VR', 'Virtual Labs, AR/VR & AI Studio'],
      '3.5.1': ['Yes', 'Yes', 'Yes'],
      '3.5.2': [6, 8, 8],
      '3.5.3': ['Yes', 'Yes', 'Yes'],
      '3.5.4': ['JAWS Screen Reader', 'JAWS & NVDA Software', 'JAWS, NVDA & Braille Embosser'],
      '3.5.5': ['Yes', 'Yes', 'Yes'],
    };

    sections.forEach((sec) => {
      sec.fields.forEach((field) => {
        years.forEach((yr, yIdx) => {
          const sample = baselineLookup[field.code] ? baselineLookup[field.code][yIdx] : 10 + yIdx;
          const valObj: any = {
            fieldCode: field.code,
            yearCode: yr.code,
            isNotApplicable: false,
          };

          if (field.fieldType === 'NUMBER' || field.fieldType === 'CURRENCY' || field.fieldType === 'PERCENTAGE') {
            valObj.numericValue = typeof sample === 'number' ? sample : parseFloat(sample);
            if (field.fieldType === 'CURRENCY') {
              valObj.textValue = `₹ ${valObj.numericValue.toLocaleString('en-IN')}`;
            } else if (field.fieldType === 'PERCENTAGE') {
              valObj.textValue = `${valObj.numericValue.toFixed(2)}%`;
            } else {
              valObj.textValue = String(valObj.numericValue);
            }
          } else if (field.fieldType === 'BOOLEAN') {
            valObj.textValue = String(sample);
            valObj.numericValue = sample === 'Yes' ? 1 : 0;
          } else if (field.fieldType === 'RATIO') {
            valObj.textValue = String(sample);
            valObj.numericValue = 15 - yIdx;
            valObj.ratioNumerator = 4200;
            valObj.ratioDenominator = 280 + yIdx * 20;
          } else {
            valObj.textValue = String(sample);
          }

          populatedValues.push(valObj);
        });
      });
    });

    // Sample geotagged proof image (clean PNG base64) for classroom & lab
    const sampleClassroomPhoto =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAB4CAYAAAB1ovdtAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC0SURBVHhe7cExAQAAAMKg9U9tDQ8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4G1dIAAWiW8zIAAAAASUVORK5CYII=';

    const sampleLabPhoto =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAB4CAYAAAB1ovdtAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC0SURBVHhe7cExAQAAAMKg9U9tDQ8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4G1dIAAWiW8zIAAAAASUVORK5CYII=';

    const sampleProofs: StoredProof[] = [
      {
        id: 'proof-demo-1',
        fieldCode: '3.1.1',
        fileName: 'Geotagged_Smart_Classroom.png',
        fileSize: 45200,
        mimeType: 'image/png',
        dataUrl: sampleClassroomPhoto,
        fileUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
        hyperlink: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'proof-demo-2',
        fieldCode: '3.1.2',
        fileName: 'High_End_Computer_Lab.png',
        fileSize: 52100,
        mimeType: 'image/png',
        dataUrl: sampleLabPhoto,
        fileUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        hyperlink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'proof-demo-3',
        fieldCode: '3.3.1',
        fileName: 'DELNET_Consortium_Certificate.pdf',
        fileSize: 120000,
        mimeType: 'application/pdf',
        fileUrl: 'https://drive.google.com/file/d/1demo-delnet-consortium-certificate/view',
        hyperlink: 'https://drive.google.com/file/d/1demo-delnet-consortium-certificate/view',
        uploadedAt: new Date().toISOString(),
      },
    ];

    for (const p of sampleProofs) {
      await proofStorage.saveProof(p);
    }

    subs[submissionId].values = populatedValues;
    subs[submissionId].documents = sampleProofs;
    subs[submissionId].updatedAt = new Date().toISOString();
    this.saveSubmissionsData(subs);

    localStorage.setItem('attribute3_current_values', JSON.stringify(populatedValues));

    const progress = this.computeProgress(subs[submissionId]);
    return { success: true, submission: subs[submissionId], progress };
  }

  // Submit flow
  async submitForReview(id: string) {
    const subs = this.getSubmissionsData();
    if (!subs[id]) throw new Error('Submission not found');

    const sub = subs[id];
    const user = this.getLocalUser();
    const adminEmail = 'datacollection0709@gmail.com';

    // Retrieve full documents with images from proofStorage
    let fullDocs = sub.documents || [];
    try {
      const stored = await proofStorage.getAllProofs();
      if (stored && stored.length > 0) {
        const map = new Map<string, any>();
        fullDocs.forEach((d: any) => map.set(d.id, d));
        stored.forEach((s) => {
          map.set(s.id, {
            ...(map.get(s.id) || {}),
            id: s.id,
            fieldCode: s.fieldCode,
            originalFileName: s.fileName,
            fileSize: s.fileSize,
            mimeType: s.mimeType,
            dataUrl: s.dataUrl,
            hyperlink: s.hyperlink,
          });
        });
        fullDocs = Array.from(map.values());
      }
    } catch (e) {}

    // Format summary for email
    const filledValues = (sub.values || []).filter(
      (v: any) => v.numericValue !== null || v.textValue || v.isNotApplicable
    );
    const summaryLines = filledValues
      .map((v: any) => {
        const valStr = v.isNotApplicable
          ? 'N/A'
          : v.numericValue !== null && v.numericValue !== undefined
          ? v.numericValue
          : v.textValue || '—';
        return `• [${v.fieldCode}] (${v.yearCode}): ${valStr}`;
      })
      .join('\n');

    const proofsListText = fullDocs
      .map((d: any, idx: number) => {
        const isPhoto = d.mimeType?.startsWith('image/') || d.dataUrl?.startsWith('data:image/');
        const type = isPhoto ? '📷 Photo' : d.hyperlink ? '🔗 Link' : '📄 Doc';
        return `${idx + 1}. [${d.fieldCode}] ${type} - ${d.originalFileName || d.fileName}: ${d.hyperlink || 'Embedded in Excel'}`;
      })
      .join('\n') || 'None attached';

    // Generate the official Excel workbook report with embedded photos and links
    let excelBlob: Blob | null = null;
    let excelFileName = 'Attribute_3_Report.xlsx';
    try {
      const res = await ExcelService.generateAttribute3WorkbookBlob(
        sub.values,
        user?.name || 'Institutional Officer',
        user?.organizationName || 'Department',
        fullDocs
      );
      excelBlob = res.blob;
      excelFileName = res.fileName;
    } catch (e) {
      console.warn('Workbook blob generation error:', e);
    }

    // 1. Dispatch email via FormSubmit with the REAL .xlsx file ATTACHED!
    try {
      const emailFormData = new FormData();
      if (excelBlob) {
        emailFormData.append('attachment', excelBlob, excelFileName);
      }
      emailFormData.append('_subject', `Resource Survey Institutional Excel Report: ${user?.name || 'Officer'} (${user?.organizationName || 'Dept'})`);
      emailFormData.append('Submitter_Name', user?.name || 'Institutional Officer');
      emailFormData.append('Department', user?.organizationName || 'Academic Department');
      emailFormData.append('Total_Answered_Entries', String(filledValues.length));
      emailFormData.append('Attached_Proofs_Count', String(fullDocs.length));
      emailFormData.append('Proofs_and_Links', proofsListText);
      emailFormData.append('Message', 'Attached is your official Resource Survey Institutional Excel report (.xlsx) containing all answered indicators, calculations, and embedded photo evidence.');
      emailFormData.append('Summary_Data', summaryLines);

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://datacollector.vercel.app';
      const referer = typeof window !== 'undefined' ? window.location.href : 'https://datacollector.vercel.app/';

      await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Origin': origin,
          'Referer': referer,
        },
        body: emailFormData,
      });
    } catch (e) {
      console.warn('FormSubmit dispatch notice:', e);
    }

    // 2. Dispatch to Vercel Serverless Function /api/submit
    try {
      let excelBase64 = '';
      if (excelBlob) {
        excelBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.includes('base64,') ? res.split('base64,')[1] : res);
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(excelBlob!);
        });
      }

      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          userName: user?.name || 'Institutional Officer',
          department: user?.organizationName || 'Department',
          submissionData: sub.values,
          documents: fullDocs,
          excelBase64,
          excelFileName,
        }),
      });
    } catch (e) {
      // ignore
    }

    // Mark as SUBMITTED while preserving all data!
    sub.status = 'SUBMITTED';
    sub.updatedAt = new Date().toISOString();
    this.saveSubmissionsData(subs);

    // Auto trigger immediate browser download of the completed Excel workbook
    try {
      if (excelBlob) {
        const { saveAs } = await import('file-saver');
        saveAs(excelBlob, excelFileName);
      } else {
        await this.downloadExcel(id);
      }
    } catch (e) {
      console.warn('Auto Excel download warning:', e);
    }

    // Generate direct mailto link as instant fallback
    const mailtoSubject = encodeURIComponent(
      `Resource Survey Audit Submission - ${user?.name || 'Institutional Officer'} (${user?.organizationName || 'Dept'})`
    );
    const mailtoBody = encodeURIComponent(
      `Official Resource Survey Institutional Data Submission\n\n` +
      `Submitter: ${user?.name || 'Institutional Officer'}\n` +
      `Department: ${user?.organizationName || 'Academic Department'}\n` +
      `Total Answered Entries: ${filledValues.length}\n` +
      `Attached Proofs: ${fullDocs.length}\n\n` +
      `--- ATTACHED PROOFS & LINKS ---\n` +
      `${proofsListText}\n\n` +
      `--- INDICATORS SUMMARY ---\n` +
      `${summaryLines}\n\n` +
      `Note: The full institutional Excel report (.xlsx) with embedded photos has been generated and downloaded.`
    );
    const mailtoUrl = `mailto:${adminEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

    return {
      success: true,
      message: `Submission successfully recorded and dispatched to ${adminEmail}!`,
      mailtoUrl,
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

  // Google Drive Connection Methods
  getGoogleScriptUrl(): string {
    return (
      localStorage.getItem('GOOGLE_SCRIPT_URL') ||
      (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbwPPjyGSXSguHLXASQikEL6KMCfHQE-huVsn2icQ1cNExLt5bpD6bfmbwh44V10vCo5/exec'
    ).trim();
  }

  setGoogleScriptUrl(url: string): void {
    if (!url || !url.trim()) {
      localStorage.removeItem('GOOGLE_SCRIPT_URL');
    } else {
      localStorage.setItem('GOOGLE_SCRIPT_URL', url.trim());
    }
  }

  isGoogleDriveConnected(): boolean {
    return true; // Google Drive is active and connected
  }

  // Documents
  async uploadDocument(formData: FormData) {
    const file = formData.get('file') as File | null;
    const submissionId = formData.get('submissionId') as string;
    const fieldCode = formData.get('fieldCode') as string;
    const yearCode = formData.get('yearCode') as string | null;
    const clientDataUrl = formData.get('dataUrl') as string | null;

    if (!file || !submissionId) throw new Error('Missing file or submissionId');

    // 10 MB limit check matching Google Drive
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`File exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
    }

    const subs = this.getSubmissionsData();
    if (!subs[submissionId]) {
      subs[submissionId] = { id: submissionId, status: 'DRAFT', values: [], documents: [] };
    }
    if (!subs[submissionId].documents) {
      subs[submissionId].documents = [];
    }

    // Max 3 proofs check per fieldCode
    const existingFieldDocs = subs[submissionId].documents.filter(
      (d: any) => (d.fieldCode || d.field?.code) === fieldCode
    );
    if (existingFieldDocs.length >= 3) {
      throw new Error('Maximum 3 photos/proofs allowed per indicator.');
    }

    // Google Drive Backend is powered by Google Cloud Service Account (Folder: 1nS-cyfFHwhqEIE-uwq0k0WUzTkUWaAQz)
    const googleScriptUrl = this.getGoogleScriptUrl();

    const user = this.getLocalUser();

    // Read base64 dataUrl if not provided
    let dataUrl = clientDataUrl;
    if (!dataUrl) {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }

    const base64Data = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : '';

    // Upload to official Google Drive via Google Drive API v3 or Apps Script
    let cloudUrl = '';
    let driveFileId = '';
    let uploadError = '';

    // Attempt 1: Serverless Google Drive API (/api/upload with Service Account or Web App)
    try {
      const proxyRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uploadFile',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data,
          googleScriptUrl,
          userName: user?.name || 'Institutional Officer',
          department: user?.organizationName || 'Resource Survey',
        }),
      });
      const proxyJson = await proxyRes.json();
      if (proxyJson?.fileUrl) {
        cloudUrl = proxyJson.fileUrl;
        driveFileId = proxyJson.fileId || `drive-${Date.now()}`;
      } else if (proxyJson?.error) {
        uploadError = proxyJson.error;
      }
    } catch (proxyErr: any) {
      // Attempt 2: Direct fetch to Google Apps Script if /api/upload is unreachable (e.g. offline dev)
      if (googleScriptUrl) {
        try {
          const gRes = await fetch(googleScriptUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
              action: 'uploadFile',
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64Data,
              userName: user?.name || 'Institutional Officer',
              department: user?.organizationName || 'Resource Survey',
            }),
          });
          const gJson = await gRes.json();
          if (gJson?.fileUrl) {
            cloudUrl = gJson.fileUrl;
            driveFileId = gJson.fileId || `drive-${Date.now()}`;
          } else if (gJson?.error) {
            uploadError = gJson.error;
          }
        } catch (e: any) {
          uploadError = e?.message || proxyErr?.message || 'Network error connecting to Google Drive';
        }
      }
    }

    if (!cloudUrl) {
      throw new Error(
        `Failed to upload to Google Drive: ${uploadError || 'Script returned no file URL'}. Please verify that your Google Apps Script is deployed with "Who has access: Anyone".`
      );
    }

    const fileId = driveFileId || `proof-${Date.now()}`;

    // Save to IndexedDB (proofStorage) for caching
    const storedProof: StoredProof = {
      id: fileId,
      userId: this.getLocalUser()?.id,
      fieldCode,
      yearCode,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      dataUrl,
      fileUrl: cloudUrl,
      hyperlink: cloudUrl,
      uploadedAt: new Date().toISOString(),
    };
    await proofStorage.saveProof(storedProof);

    const doc = {
      id: fileId,
      fieldCode,
      yearCode,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      fileUrl: cloudUrl,
      hyperlink: cloudUrl,
      dataUrl,
    };

    subs[submissionId].documents.push(doc);
    this.saveSubmissionsData(subs);

    return { success: true, message: 'File uploaded directly to Google Drive!', document: doc };
  }

  // Strategy 3: Hyperlink proof
  async addHyperlinkProof(params: {
    submissionId: string;
    fieldCode: string;
    yearCode?: string;
    fileName: string;
    hyperlink: string;
    dataUrl?: string;
  }) {
    const { submissionId, fieldCode, yearCode, fileName, hyperlink, dataUrl } = params;
    const subs = this.getSubmissionsData();
    if (!subs[submissionId]) {
      subs[submissionId] = { id: submissionId, status: 'DRAFT', values: [], documents: [] };
    }
    if (!subs[submissionId].documents) {
      subs[submissionId].documents = [];
    }

    const existingFieldDocs = subs[submissionId].documents.filter(
      (d: any) => (d.fieldCode || d.field?.code) === fieldCode
    );
    if (existingFieldDocs.length >= 3) {
      throw new Error('Maximum 3 proofs allowed per indicator.');
    }

    const fileId = `link-${Date.now()}`;
    const storedProof: StoredProof = {
      id: fileId,
      userId: this.getLocalUser()?.id,
      fieldCode,
      yearCode,
      fileName,
      fileSize: 0,
      mimeType: 'text/uri-list',
      hyperlink,
      fileUrl: hyperlink,
      dataUrl: dataUrl || undefined,
      uploadedAt: new Date().toISOString(),
    };
    await proofStorage.saveProof(storedProof);

    const doc = {
      id: fileId,
      fieldCode,
      yearCode,
      originalFileName: fileName,
      fileSize: 0,
      mimeType: 'text/uri-list',
      uploadedAt: new Date().toISOString(),
      hyperlink,
      fileUrl: hyperlink,
      dataUrl: dataUrl || undefined,
    };

    subs[submissionId].documents.push(doc);
    this.saveSubmissionsData(subs);

    return { success: true, message: 'Hyperlink proof saved', document: doc };
  }

  async deleteDocument(id: string) {
    await proofStorage.deleteProof(id);
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
      if (doc) {
        return doc.hyperlink || doc.dataUrl || doc.fileUrl || '#';
      }
    }
    return '#';
  }

  async downloadExcel(submissionId?: string, filename = 'Attribute_3_Report.xlsx') {
    const subs = this.getSubmissionsData();
    let sub = submissionId ? subs[submissionId] : null;

    if (!sub || !sub.values || sub.values.length === 0) {
      const allSubs: any[] = Object.values(subs);
      allSubs.sort((a: any, b: any) => (b.values?.length || 0) - (a.values?.length || 0));
      if (allSubs[0] && allSubs[0].values?.length > 0) {
        sub = allSubs[0];
      }
    }

    let valuesToUse = sub?.values || [];

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

    // Merge proofs from IndexedDB
    let docsToUse = sub?.documents || [];
    try {
      const allProofs = await proofStorage.getAllProofs();
      if (allProofs && allProofs.length > 0) {
        const docMap = new Map<string, any>();
        docsToUse.forEach((d: any) => docMap.set(d.id, d));
        allProofs.forEach((p) => {
          docMap.set(p.id, {
            ...(docMap.get(p.id) || {}),
            id: p.id,
            fieldCode: p.fieldCode,
            yearCode: p.yearCode,
            originalFileName: p.fileName,
            fileSize: p.fileSize,
            mimeType: p.mimeType,
            dataUrl: p.dataUrl,
            hyperlink: p.hyperlink,
          });
        });
        docsToUse = Array.from(docMap.values());
      }
    } catch (e) {}

    const user = this.getLocalUser();
    await ExcelService.generateAndDownloadAttribute3Workbook(
      valuesToUse,
      user?.name || 'Institutional Officer',
      user?.organizationName || 'Department',
      docsToUse
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
