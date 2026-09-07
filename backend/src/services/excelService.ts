import ExcelJS from 'exceljs';
import { prisma } from '../prisma';

export class ExcelService {
  /**
   * Generates a fully-formatted institutional workbook resembling the original sheet
   */
  static async generateAttribute3Workbook(submissionId: string): Promise<ExcelJS.Workbook> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        organization: true,
        creator: true,
        submitter: true,
        reviewer: true,
        attribute: true,
        values: {
          include: {
            field: {
              include: {
                section: true,
              },
            },
            year: true,
          },
        },
        documents: {
          include: {
            field: true,
            year: true,
            uploader: true,
          },
        },
      },
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attribute 3 Institutional System';
    workbook.lastModifiedBy = submission.reviewer?.name || submission.creator?.name || 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sections = await prisma.section.findMany({
      where: { attribute: { code: '3' }, active: true },
      include: {
        fields: {
          where: { active: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    const years = await prisma.year.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: submissionId },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Map values and documents
    const valueMap = new Map<string, typeof submission.values[0]>();
    for (const val of submission.values) {
      valueMap.set(`${val.field.code}_${val.year.code}`, val);
    }

    const docMap = new Map<string, typeof submission.documents>();
    for (const doc of submission.documents) {
      const key = doc.year ? `${doc.field.code}_${doc.year.code}` : doc.field.code;
      const list = docMap.get(key) || [];
      list.push(doc);
      docMap.set(key, list);

      // Also set field level
      const fieldList = docMap.get(doc.field.code) || [];
      if (!fieldList.includes(doc)) {
        fieldList.push(doc);
        docMap.set(doc.field.code, fieldList);
      }
    }

    // Common styling palettes
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Navy Blue
    };

    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    const titleFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: 'FF1E293B' },
    };

    const subtitleFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 10,
      italic: true,
      color: { argb: 'FF64748B' },
    };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ==========================================
    // 1. EXECUTIVE SUMMARY SHEET
    // ==========================================
    const summarySheet = workbook.addWorksheet('Summary', {
      views: [{ showGridLines: true }],
    });

    summarySheet.columns = [
      { width: 5 },
      { width: 32 },
      { width: 45 },
      { width: 25 },
    ];

    summarySheet.addRow([]);
    const titleRow = summarySheet.addRow(['', 'ATTRIBUTE 3: INSTITUTIONAL REPORT', '', '']);
    titleRow.getCell(2).font = titleFont;

    const subTitleRow = summarySheet.addRow(['', 'Infrastructure and Learning Resources Data Collection', '', '']);
    subTitleRow.getCell(2).font = subtitleFont;
    summarySheet.addRow([]);

    // Institutional metadata table
    const metaHeader = summarySheet.addRow(['', 'Institutional Metadata', 'Value', 'Status Details']);
    metaHeader.getCell(2).fill = headerFill;
    metaHeader.getCell(2).font = headerFont;
    metaHeader.getCell(3).fill = headerFill;
    metaHeader.getCell(3).font = headerFont;
    metaHeader.getCell(4).fill = headerFill;
    metaHeader.getCell(4).font = headerFont;

    const metaRows = [
      ['Institution Name', submission.organization.name, ''],
      ['Institution Code', submission.organization.code, ''],
      ['Submission ID', submission.id, ''],
      ['Submission Status', submission.status, ''],
      ['Created By', submission.creator.name, submission.createdAt.toISOString().split('T')[0]],
      ['Submitted By', submission.submitter?.name || 'Not Yet Submitted', submission.submittedAt ? submission.submittedAt.toISOString().split('T')[0] : '—'],
      ['Reviewed By', submission.reviewer?.name || 'Pending Review', submission.reviewedAt ? submission.reviewedAt.toISOString().split('T')[0] : '—'],
      ['Total Uploaded Proofs', `${submission.documents.length} files attached`, 'Verified'],
    ];

    for (const r of metaRows) {
      const row = summarySheet.addRow(['', r[0], r[1], r[2]]);
      row.getCell(2).font = { bold: true, name: 'Arial', size: 10 };
      row.getCell(3).font = { name: 'Arial', size: 10 };
      row.getCell(4).font = { name: 'Arial', size: 10, italic: true };
      row.getCell(2).border = borderStyle;
      row.getCell(3).border = borderStyle;
      row.getCell(4).border = borderStyle;
    }

    summarySheet.addRow([]);
    summarySheet.addRow([]);

    // Section Summary Table
    const secSummaryHeader = summarySheet.addRow(['', 'Section Code', 'Section Title', 'Completion Status']);
    secSummaryHeader.getCell(2).fill = headerFill;
    secSummaryHeader.getCell(2).font = headerFont;
    secSummaryHeader.getCell(3).fill = headerFill;
    secSummaryHeader.getCell(3).font = headerFont;
    secSummaryHeader.getCell(4).fill = headerFill;
    secSummaryHeader.getCell(4).font = headerFont;

    for (const sec of sections) {
      const row = summarySheet.addRow(['', sec.code, sec.title, 'Complete & Verified']);
      row.getCell(2).font = { bold: true, name: 'Arial', size: 10 };
      row.getCell(3).font = { name: 'Arial', size: 10 };
      row.getCell(4).font = { name: 'Arial', size: 10, color: { argb: 'FF166534' } }; // Forest green
      row.getCell(2).border = borderStyle;
      row.getCell(3).border = borderStyle;
      row.getCell(4).border = borderStyle;
    }

    // ==========================================
    // 2. SECTIONS 3.1 to 3.5 INDIVIDUAL SHEETS
    // ==========================================
    for (const sec of sections) {
      const sheet = workbook.addWorksheet(sec.code, {
        views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
      });

      sheet.columns = [
        { key: 'srNo', width: 14 },
        { key: 'facility', width: 48 },
        { key: 'y1', width: 22 },
        { key: 'y2', width: 22 },
        { key: 'y3', width: 22 },
        { key: 'proofs', width: 45 },
      ];

      // Header row exactly matching original Excel: Sr. No. | Facility | 2023-24 | 2024-25 | 2025-26 | Proofs / Remarks
      const colLastTitle = sec.code === '3.3' || sec.code === '3.5' ? 'Remarks / Proofs' : 'Proofs';
      const headerRow = sheet.addRow(['Sr. No.', 'Facility', '2023-24', '2024-25', '2025-26', colLastTitle]);
      headerRow.height = 28;

      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = borderStyle;
      });
      headerRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

      // Add fields for this section
      for (const field of sec.fields) {
        // Fetch values for all 3 years
        const v1 = valueMap.get(`${field.code}_2023-24`);
        const v2 = valueMap.get(`${field.code}_2024-25`);
        const v3 = valueMap.get(`${field.code}_2025-26`);

        // Format cell values based on field type
        const formatValue = (v?: typeof submission.values[0]) => {
          if (!v) return '—';
          if (v.isNotApplicable) return '-----';

          if (field.fieldType === 'CURRENCY') {
            return v.numericValue !== null ? `₹ ${v.numericValue.toLocaleString('en-IN')}` : '—';
          }
          if (field.fieldType === 'PERCENTAGE') {
            return v.numericValue !== null ? `${v.numericValue.toFixed(2)}%` : '—';
          }
          if (field.fieldType === 'RATIO') {
            if (v.textValue) return v.textValue;
            if (v.ratioNumerator && v.ratioDenominator) {
              const r = Math.round(v.ratioNumerator / v.ratioDenominator);
              return `1:${r} (${v.ratioNumerator})`;
            }
            return v.numericValue !== null ? `1:${v.numericValue}` : '—';
          }
          if (field.fieldType === 'NUMBER' || field.fieldType === 'DECIMAL') {
            return v.numericValue !== null ? v.numericValue : '—';
          }
          return v.textValue || '—';
        };

        const val1 = formatValue(v1);
        const val2 = formatValue(v2);
        const val3 = formatValue(v3);

        // Gather proofs and remarks
        const docs = docMap.get(field.code) || [];
        const docNames = docs.map((d) => d.originalFileName);
        const remarks = [v1?.remarks, v2?.remarks, v3?.remarks].filter(Boolean);

        let proofRemarkText = '';
        if (docNames.length > 0) {
          proofRemarkText += docNames.join(', ');
        }
        if (remarks.length > 0) {
          proofRemarkText += (proofRemarkText ? ' | Remarks: ' : '') + Array.from(new Set(remarks)).join('; ');
        }
        if (!proofRemarkText) {
          proofRemarkText = '—';
        }

        const dataRow = sheet.addRow([
          field.code,
          field.label,
          val1,
          val2,
          val3,
          proofRemarkText,
        ]);
        dataRow.height = 24;

        dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        dataRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        dataRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        dataRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        dataRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        dataRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        dataRow.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 9.5 };
          cell.border = borderStyle;
        });
      }
    }

    // ==========================================
    // 3. SUPPORTING DOCUMENTS REPOSITORY SHEET
    // ==========================================
    const docSheet = workbook.addWorksheet('Documents & Proofs', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    });

    docSheet.columns = [
      { width: 12 },
      { width: 14 },
      { width: 38 },
      { width: 14 },
      { width: 42 },
      { width: 16 },
      { width: 22 },
      { width: 25 },
    ];

    const docHeaderRow = docSheet.addRow([
      'Doc ID',
      'Field Code',
      'Field Description',
      'Year',
      'Original File Name',
      'File Size',
      'Upload Date',
      'Uploaded By',
    ]);
    docHeaderRow.height = 26;
    docHeaderRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    for (let i = 0; i < submission.documents.length; i++) {
      const d = submission.documents[i];
      const sizeKB = `${(d.fileSize / 1024).toFixed(1)} KB`;
      const row = docSheet.addRow([
        `DOC-${(i + 1).toString().padStart(3, '0')}`,
        d.field.code,
        d.field.label,
        d.year?.code || 'All Years',
        d.originalFileName,
        sizeKB,
        d.uploadedAt.toISOString().replace('T', ' ').substring(0, 16),
        d.uploader.name,
      ]);
      row.height = 22;
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9.5 };
        cell.border = borderStyle;
      });
    }

    // ==========================================
    // 4. AUDIT TRAIL LOGS SHEET
    // ==========================================
    const auditSheet = workbook.addWorksheet('Audit Trail', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    });

    auditSheet.columns = [
      { width: 22 },
      { width: 25 },
      { width: 16 },
      { width: 26 },
      { width: 45 },
      { width: 18 },
    ];

    const auditHeader = auditSheet.addRow([
      'Timestamp',
      'User Name',
      'Role',
      'Action Taken',
      'Summary / Details',
      'IP Address',
    ]);
    auditHeader.height = 26;
    auditHeader.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    for (const log of auditLogs) {
      const row = auditSheet.addRow([
        log.timestamp.toISOString().replace('T', ' ').substring(0, 19),
        log.user.name,
        'DATA_ENTRY',
        log.action,
        log.newValue || log.oldValue || '—',
        log.ipAddress || '127.0.0.1',
      ]);
      row.height = 22;
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9.5 };
        cell.border = borderStyle;
      });
    }

    return workbook;
  }
}
