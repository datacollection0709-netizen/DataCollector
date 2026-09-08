import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { attribute3Schema } from './schema';

export class ExcelService {
  /**
   * Generates a fully-formatted institutional workbook resembling the original sheet
   */
  static async generateAndDownloadAttribute3Workbook(submissionData: any, userName: string, department: string) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attribute 3 Institutional System';
    workbook.lastModifiedBy = userName || 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sections = attribute3Schema.attribute.sections;
    const years = attribute3Schema.years;

    // Map values
    const valueMap = new Map<string, any>();
    if (submissionData && Array.isArray(submissionData)) {
      for (const val of submissionData) {
        valueMap.set(`${val.fieldId}_${val.yearId}`, val);
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
      ['Institution / Submitter Name', userName, ''],
      ['Department', department, ''],
      ['Generated On', new Date().toISOString().split('T')[0], 'Local Export'],
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

      for (const field of sec.fields) {
        const v1 = valueMap.get(`${field.id}_y-2023-24`);
        const v2 = valueMap.get(`${field.id}_y-2024-25`);
        const v3 = valueMap.get(`${field.id}_y-2025-26`);

        const formatValue = (v?: any) => {
          if (!v) return '—';
          if (v.isNotApplicable) return '-----';

          if (field.fieldType === 'CURRENCY') {
            return v.numericValue !== null && v.numericValue !== undefined ? `₹ ${v.numericValue.toLocaleString('en-IN')}` : '—';
          }
          if (field.fieldType === 'PERCENTAGE') {
            return v.numericValue !== null && v.numericValue !== undefined ? `${v.numericValue.toFixed(2)}%` : '—';
          }
          if (field.fieldType === 'RATIO') {
            if (v.textValue) return v.textValue;
            if (v.ratioNumerator && v.ratioDenominator) {
              const r = Math.round(v.ratioNumerator / v.ratioDenominator);
              return `1:${r} (${v.ratioNumerator})`;
            }
            return v.numericValue !== null && v.numericValue !== undefined ? `1:${v.numericValue}` : '—';
          }
          if (field.fieldType === 'NUMBER' || field.fieldType === 'DECIMAL') {
            return v.numericValue !== null && v.numericValue !== undefined ? v.numericValue : '—';
          }
          return v.textValue || '—';
        };

        const val1 = formatValue(v1);
        const val2 = formatValue(v2);
        const val3 = formatValue(v3);

        const remarks = [v1?.remarks, v2?.remarks, v3?.remarks].filter(Boolean);
        let proofRemarkText = remarks.length > 0 ? Array.from(new Set(remarks)).join('; ') : '—';

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

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Attribute_3_${department.replace(/\s+/g, '_')}_Report.xlsx`);
  }
}
