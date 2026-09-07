import { describe, it, expect } from 'vitest';
import { ExcelService } from '../services/excelService';
import { prisma } from '../prisma';

describe('Excel Workbook Export Generation', () => {
  it('should generate an authentic Excel workbook with 8 sheets matching original template', async () => {
    const submission = await prisma.submission.findFirst();
    expect(submission).toBeDefined();

    if (!submission) return;

    const workbook = await ExcelService.generateAttribute3Workbook(submission.id);
    expect(workbook).toBeDefined();

    const sheetNames = workbook.worksheets.map((s) => s.name);
    console.log('Generated sheets:', sheetNames);

    // Verify all mandatory sheets are present
    expect(sheetNames).toContain('Summary');
    expect(sheetNames).toContain('3.1');
    expect(sheetNames).toContain('3.2');
    expect(sheetNames).toContain('3.3');
    expect(sheetNames).toContain('3.4');
    expect(sheetNames).toContain('3.5');
    expect(sheetNames).toContain('Documents & Proofs');
    expect(sheetNames).toContain('Audit Trail');

    // Check Sheet 3.1 rows and structure
    const sheet31 = workbook.getWorksheet('3.1');
    expect(sheet31).toBeDefined();
    expect(sheet31?.rowCount).toBeGreaterThanOrEqual(15);

    // Check header row in 3.1
    const row1 = sheet31?.getRow(1);
    expect(row1?.getCell(1).value).toBe('Sr. No.');
    expect(row1?.getCell(2).value).toBe('Facility');
    expect(row1?.getCell(3).value).toBe('2023-24');
    expect(row1?.getCell(4).value).toBe('2024-25');
    expect(row1?.getCell(5).value).toBe('2025-26');
    expect(row1?.getCell(6).value).toBe('Proofs');

    // Check 3.1.1 Teaching Classrooms values
    const row2 = sheet31?.getRow(2);
    expect(row2?.getCell(1).value).toBe('3.1.1');
    expect(row2?.getCell(2).value).toBe('Teaching Classrooms');
    expect(row2?.getCell(3).value).toBe(59);
    expect(row2?.getCell(4).value).toBe(61);
    expect([81, 82, 85]).toContain(row2?.getCell(5).value);
  });
});
