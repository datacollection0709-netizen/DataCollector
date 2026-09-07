import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { SubmissionService } from '../services/submissionService';
import { ExcelService } from '../services/excelService';
import { AuditService } from '../services/auditService';

const router = Router();

// Draft values validation schema
const saveDraftSchema = z.object({
  values: z.array(
    z.object({
      fieldCode: z.string(),
      yearCode: z.string(),
      isNotApplicable: z.boolean().optional(),
      numericValue: z.number().nullable().optional(),
      textValue: z.string().nullable().optional(),
      ratioNumerator: z.number().nullable().optional(),
      ratioDenominator: z.number().nullable().optional(),
      remarks: z.string().nullable().optional(),
    })
  ),
});

const reviewActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional(),
});

// List submissions
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const isElevated = req.user!.role === 'ADMIN' || req.user!.role === 'REVIEWER';
    const whereClause = isElevated ? {} : { organizationId: req.user!.organizationId };

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        organization: true,
        creator: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        _count: {
          select: {
            values: true,
            documents: true,
            comments: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current active submission for user's organization
router.get('/current', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { submission, progress } = await SubmissionService.getOrCreateSubmission(
      req.user!.organizationId,
      req.user!.id
    );

    res.json({ success: true, submission, progress });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get submission by ID
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { submission, progress } = await SubmissionService.getSubmissionById(id);

    // Multi-tenant isolation: check access
    if (
      req.user!.role === 'DATA_ENTRY' &&
      submission.organizationId !== req.user!.organizationId
    ) {
      res.status(403).json({ success: false, message: 'Forbidden: Cannot view submissions from other organizations.' });
      return;
    }

    res.json({ success: true, submission, progress });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save draft values
router.post('/:id/draft', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parseResult = saveDraftSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid draft payload',
        errors: parseResult.error.errors,
      });
      return;
    }

    // Verify submission ownership if DATA_ENTRY
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    if (
      req.user!.role === 'DATA_ENTRY' &&
      existing.organizationId !== req.user!.organizationId
    ) {
      res.status(403).json({ success: false, message: 'Forbidden: Cannot edit another organization submission.' });
      return;
    }

    const result = await SubmissionService.saveDraft(
      id,
      parseResult.data.values,
      req.user!.id,
      req.ip
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit form for review
router.post('/:id/submit', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.submission.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    if (
      req.user!.role === 'DATA_ENTRY' &&
      existing.organizationId !== req.user!.organizationId
    ) {
      res.status(403).json({ success: false, message: 'Forbidden: Cannot submit another organization submission.' });
      return;
    }

    const submission = await SubmissionService.submitForReview(id, req.user!.id, req.ip);

    res.json({
      success: true,
      message: 'Attribute 3 submitted successfully for institutional review.',
      submission,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Reviewer approve or reject
router.post(
  '/:id/review',
  authenticate,
  requireRoles(['ADMIN', 'REVIEWER']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const parseResult = reviewActionSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid review parameters',
          errors: parseResult.error.errors,
        });
        return;
      }

      const { action, reason } = parseResult.data;
      const submission = await SubmissionService.reviewSubmission(
        id,
        req.user!.id,
        action,
        reason,
        req.ip
      );

      res.json({
        success: true,
        message: `Submission marked as ${action === 'APPROVE' ? 'APPROVED' : 'REJECTED'}.`,
        submission,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Add review comment
router.post('/:id/comments', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comment, sectionCode, fieldCode } = req.body;

    if (!comment || !comment.trim()) {
      res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
      return;
    }

    const newComment = await prisma.reviewComment.create({
      data: {
        submissionId: id,
        sectionCode: sectionCode || null,
        fieldCode: fieldCode || null,
        comment: comment.trim(),
        authorId: req.user!.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, comment: newComment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export to Excel
router.get('/:id/export', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    // Access check
    if (
      req.user!.role === 'DATA_ENTRY' &&
      submission.organizationId !== req.user!.organizationId
    ) {
      res.status(403).json({ success: false, message: 'Forbidden: Cannot export submissions from other organizations.' });
      return;
    }

    const workbook = await ExcelService.generateAttribute3Workbook(id);

    const safeOrgName = submission.organization.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Attribute_3_${safeOrgName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    await AuditService.log({
      organizationId: submission.organizationId,
      userId: req.user!.id,
      action: 'EXPORT_EXCEL',
      entityType: 'SUBMISSION',
      entityId: id,
      newValue: `Exported workbook ${filename}`,
      ipAddress: req.ip,
    });
  } catch (error: any) {
    console.error('Export Excel error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report: ' + error.message });
  }
});

export default router;
