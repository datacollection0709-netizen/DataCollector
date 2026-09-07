import { prisma } from '../prisma';

export interface RecordAuditParams {
  organizationId?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export class AuditService {
  static async log(params: RecordAuditParams) {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldValue: params.oldValue ? (typeof params.oldValue === 'string' ? params.oldValue : JSON.stringify(params.oldValue)) : null,
          newValue: params.newValue ? (typeof params.newValue === 'string' ? params.newValue : JSON.stringify(params.newValue)) : null,
          ipAddress: params.ipAddress,
        },
      });
    } catch (error) {
      console.error('[AUDIT LOG ERROR]', error);
      // Fail safely without blocking main transaction
    }
  }

  static async getLogs(options: { organizationId?: string; submissionId?: string; limit?: number }) {
    return prisma.auditLog.findMany({
      where: {
        ...(options.organizationId ? { organizationId: options.organizationId } : {}),
        ...(options.submissionId ? { entityId: options.submissionId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: options.limit || 100,
    });
  }
}
