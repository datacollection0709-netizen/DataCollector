import { prisma } from '../prisma';
import { AuditService } from './auditService';
import { GoogleService } from './googleService';
import { ExcelService } from './excelService';
import fs from 'fs';
import path from 'path';

export interface SaveDraftValueInput {
  fieldCode: string;
  yearCode: string;
  isNotApplicable?: boolean;
  numericValue?: number | null;
  textValue?: string | null;
  ratioNumerator?: number | null;
  ratioDenominator?: number | null;
  remarks?: string | null;
}

export class SubmissionService {
  /**
   * Get active submission for an organization or create a new draft
   */
  static async getOrCreateSubmission(organizationId: string, userId: string) {
    const attribute = await prisma.attribute.findUnique({
      where: { code: '3' },
    });

    if (!attribute) {
      throw new Error('Attribute 3 definition not found in database.');
    }

    let submission = await prisma.submission.findFirst({
      where: {
        organizationId,
        attributeId: attribute.id,
      },
      include: {
        organization: true,
        creator: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        values: {
          include: {
            field: true,
            year: true,
          },
        },
        documents: {
          include: {
            field: true,
            year: true,
            uploader: { select: { id: true, name: true } },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          organizationId,
          attributeId: attribute.id,
          status: 'DRAFT',
          createdBy: userId,
        },
        include: {
          organization: true,
          creator: { select: { id: true, name: true } },
          submitter: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          values: {
            include: {
              field: true,
              year: true,
            },
          },
          documents: {
            include: {
              field: true,
              year: true,
              uploader: { select: { id: true, name: true } },
            },
          },
          comments: {
            include: {
              author: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      await AuditService.log({
        organizationId,
        userId,
        action: 'CREATE_SUBMISSION',
        entityType: 'SUBMISSION',
        entityId: submission.id,
        newValue: 'Draft initialized',
      });
    }

    const progress = await this.calculateProgress(submission.id);
    return { submission, progress };
  }

  /**
   * Get full submission detail with calculation and progress
   */
  static async getSubmissionById(submissionId: string) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        organization: true,
        attribute: true,
        creator: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
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
            uploader: { select: { id: true, name: true } },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!submission) {
      throw new Error(`Submission with id ${submissionId} not found.`);
    }

    const progress = await this.calculateProgress(submissionId);
    return { submission, progress };
  }

  /**
   * Calculate completeness, missing fields, section-wise completion, and required proofs
   */
  static async calculateProgress(submissionId: string) {
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

    const values = await prisma.submissionValue.findMany({
      where: { submissionId },
      include: { field: true, year: true },
    });

    const documents = await prisma.document.findMany({
      where: { submissionId },
      include: { field: true, year: true },
    });

    // Build lookup
    const valueMap = new Map<string, typeof values[0]>();
    for (const v of values) {
      valueMap.set(`${v.field.code}_${v.year.code}`, v);
    }

    const docMap = new Map<string, number>();
    for (const d of documents) {
      const key = d.year ? `${d.field.code}_${d.year.code}` : `${d.field.code}_all`;
      docMap.set(key, (docMap.get(key) || 0) + 1);
      docMap.set(d.field.code, (docMap.get(d.field.code) || 0) + 1);
    }

    let totalRequired = 0;
    let completedRequired = 0;
    const missingRequiredProofs: { fieldCode: string; yearCode?: string; label: string }[] = [];

    const sectionProgress = sections.map((sec) => {
      let secTotalFields = 0;
      let secCompletedFields = 0;
      const missingFieldCodes: string[] = [];

      for (const field of sec.fields) {
        let fieldComplete = true;

        // Check each year
        for (const yr of years) {
          const val = valueMap.get(`${field.code}_${yr.code}`);
          const hasValue =
            val &&
            (val.isNotApplicable ||
              val.numericValue !== null ||
              (val.textValue && val.textValue.trim() !== '') ||
              val.ratioNumerator !== null);

          if (field.required) {
            totalRequired++;
            if (hasValue) {
              completedRequired++;
            } else {
              fieldComplete = false;
            }
          }

          secTotalFields++;
          if (hasValue) {
            secCompletedFields++;
          }
        }

        // Check required proof
        if (field.proofRequired) {
          const docCount = docMap.get(field.code) || 0;
          if (docCount === 0) {
            missingRequiredProofs.push({
              fieldCode: field.code,
              label: field.label,
            });
            if (field.required) {
              fieldComplete = false;
            }
          }
        }

        if (!fieldComplete) {
          missingFieldCodes.push(field.code);
        }
      }

      const secPercentage = secTotalFields > 0 ? Math.round((secCompletedFields / secTotalFields) * 100) : 100;

      return {
        sectionCode: sec.code,
        sectionTitle: sec.title,
        totalFields: secTotalFields,
        completedFields: secCompletedFields,
        percentage: secPercentage,
        missingFieldCodes,
      };
    });

    const overallPercentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

    return {
      totalRequiredFields: totalRequired,
      completedRequiredFields: completedRequired,
      overallPercentage,
      sectionProgress,
      documentsCount: documents.length,
      missingRequiredProofs,
    };
  }

  /**
   * Save draft values with validation and audit trail
   */
  static async saveDraft(
    submissionId: string,
    valuesInput: SaveDraftValueInput[],
    userId: string,
    userIp?: string
  ) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { organization: true },
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    if (submission.status === 'SUBMITTED' || submission.status === 'APPROVED') {
      throw new Error(`Cannot modify submission while in ${submission.status} status.`);
    }

    // Cache fields and years
    const allFields = await prisma.field.findMany();
    const fieldByCode = new Map(allFields.map((f) => [f.code, f]));

    const allYears = await prisma.year.findMany();
    const yearByCode = new Map(allYears.map((y) => [y.code, y]));

    const modifiedAuditDetails: string[] = [];

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      for (const val of valuesInput) {
        const field = fieldByCode.get(val.fieldCode);
        const year = yearByCode.get(val.yearCode);

        if (!field || !year) {
          console.warn(`Skipping unknown field ${val.fieldCode} or year ${val.yearCode}`);
          continue;
        }

        // Fetch existing value to detect edits
        const existing = await tx.submissionValue.findUnique({
          where: {
            submissionId_fieldId_yearId: {
              submissionId,
              fieldId: field.id,
              yearId: year.id,
            },
          },
        });

        // Determine if value changed
        const isNA = val.isNotApplicable ?? false;
        const numVal = isNA ? null : val.numericValue !== undefined ? val.numericValue : null;
        const txtVal = isNA ? '-----' : val.textValue !== undefined ? val.textValue : null;
        const rNum = isNA ? null : val.ratioNumerator ?? null;
        const rDenom = isNA ? null : val.ratioDenominator ?? null;
        const rem = val.remarks ?? null;

        const hasChanged =
          !existing ||
          existing.isNotApplicable !== isNA ||
          existing.numericValue !== numVal ||
          existing.textValue !== txtVal ||
          existing.ratioNumerator !== rNum ||
          existing.ratioDenominator !== rDenom ||
          existing.remarks !== rem;

        if (hasChanged) {
          await tx.submissionValue.upsert({
            where: {
              submissionId_fieldId_yearId: {
                submissionId,
                fieldId: field.id,
                yearId: year.id,
              },
            },
            update: {
              isNotApplicable: isNA,
              numericValue: numVal,
              textValue: txtVal,
              ratioNumerator: rNum,
              ratioDenominator: rDenom,
              remarks: rem,
              updatedAt: new Date(),
            },
            create: {
              submissionId,
              fieldId: field.id,
              yearId: year.id,
              isNotApplicable: isNA,
              numericValue: numVal,
              textValue: txtVal,
              ratioNumerator: rNum,
              ratioDenominator: rDenom,
              remarks: rem,
            },
          });

          const oldSummary = existing
            ? existing.isNotApplicable
              ? 'N/A'
              : existing.numericValue ?? existing.textValue ?? 'empty'
            : 'empty';
          const newSummary = isNA ? 'N/A' : numVal ?? txtVal ?? 'empty';
          modifiedAuditDetails.push(`${val.fieldCode} (${val.yearCode}): [${oldSummary}] -> [${newSummary}]`);
        }
      }

      // Update submission updatedAt
      await tx.submission.update({
        where: { id: submissionId },
        data: { updatedAt: new Date() },
      });
    });

    if (modifiedAuditDetails.length > 0) {
      await AuditService.log({
        organizationId: submission.organizationId,
        userId,
        action: 'UPDATE_DRAFT_VALUES',
        entityType: 'SUBMISSION',
        entityId: submissionId,
        newValue: modifiedAuditDetails.slice(0, 10).join('; ') + (modifiedAuditDetails.length > 10 ? ` (+${modifiedAuditDetails.length - 10} more)` : ''),
        ipAddress: userIp,
      });
    }

    const progress = await this.calculateProgress(submissionId);
    return { success: true, savedAt: new Date().toISOString(), progress };
  }

  /**
   * Finalize and submit form for review
   */
  static async submitForReview(submissionId: string, userId: string, userIp?: string) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { organization: true, creator: true },
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    if (submission.status === 'SUBMITTED' || submission.status === 'APPROVED') {
      throw new Error(`Submission is already in ${submission.status} state.`);
    }

    const progress = await this.calculateProgress(submissionId);

    // Validate if any required proofs are missing
    if (progress.missingRequiredProofs.length > 0) {
      const missingList = progress.missingRequiredProofs.map((p) => `${p.fieldCode} (${p.label})`).join(', ');
      throw new Error(`Cannot submit: The following mandatory supporting documents are missing: ${missingList}`);
    }

    // Validate completion rate
    if (progress.overallPercentage < 100) {
      const missingSections = progress.sectionProgress
        .filter((s) => s.missingFieldCodes.length > 0)
        .map((s) => `${s.sectionCode} (${s.missingFieldCodes.join(', ')})`)
        .join('; ');
      throw new Error(`Cannot submit: Incomplete required fields in sections: ${missingSections}`);
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'SUBMITTED',
        submittedBy: userId,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    await AuditService.log({
      organizationId: submission.organizationId,
      userId,
      action: 'SUBMIT_FORM',
      entityType: 'SUBMISSION',
      entityId: submissionId,
      oldValue: submission.status,
      newValue: 'SUBMITTED',
      ipAddress: userIp,
    });

    // Formatting data for Google Sheets
    // Generate the full institutional workbook and upload it as a Google Sheet
    try {
      const workbook = await ExcelService.generateAttribute3Workbook(submissionId);
      const safeUserName = (submission.creator?.name || userId).replace(/[^a-zA-Z0-9 ]/g, '');
      const safeOrgName = submission.organization.name.replace(/[^a-zA-Z0-9 ]/g, '');
      const sheetTitle = `${safeUserName}_${safeOrgName}`;
      
      const tempPath = path.join(process.cwd(), `temp_${Date.now()}.xlsx`);
      await workbook.xlsx.writeFile(tempPath);
      
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      await GoogleService.uploadExcelAsSpreadsheet(tempPath, sheetTitle, spreadsheetId);
      
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (e) {
      console.error('Failed to export to Google Sheets:', e);
    }

    return updated;
  }

  /**
   * Reviewer / Admin action: Approve or Reject
   */
  static async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
    userIp?: string
  ) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    if (action === 'REJECT' && (!reason || reason.trim() === '')) {
      throw new Error('A detailed reason is mandatory when requesting corrections/rejecting a submission.');
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: newStatus,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: action === 'REJECT' ? reason : null,
      },
    });

    if (reason && reason.trim()) {
      await prisma.reviewComment.create({
        data: {
          submissionId,
          comment: reason,
          authorId: reviewerId,
        },
      });
    }

    await AuditService.log({
      organizationId: submission.organizationId,
      userId: reviewerId,
      action: action === 'APPROVE' ? 'APPROVE_SUBMISSION' : 'REJECT_SUBMISSION',
      entityType: 'SUBMISSION',
      entityId: submissionId,
      oldValue: submission.status,
      newValue: newStatus,
      ipAddress: userIp,
    });

    return updated;
  }
}
