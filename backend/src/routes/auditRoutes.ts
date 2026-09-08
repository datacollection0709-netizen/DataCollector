import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRoles(['ADMIN', 'REVIEWER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId, limit } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(submissionId ? { entityId: submissionId as string } : {}),
        ...(req.user!.role !== 'ADMIN' ? { organizationId: req.user!.organizationId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({
      success: true,
      logs: logs.map((l: any) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user.name,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        oldValue: l.oldValue,
        newValue: l.newValue,
        ipAddress: l.ipAddress,
        timestamp: l.timestamp.toISOString(),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
