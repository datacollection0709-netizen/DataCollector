import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma';
import { config } from '../config';
import { authenticate, requireRoles } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();

const loginSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Name and Department are required.' });
      return;
    }

    const { name, department } = parseResult.data;

    // Find or create the Organization (Department)
    let org = await prisma.organization.findUnique({
      where: { code: department.toLowerCase().trim() },
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: department.trim(),
          code: department.toLowerCase().trim(),
        },
      });
    }

    // Find or create User
    let user = await prisma.user.findFirst({
      where: {
        name: name.trim(),
        organizationId: org.id,
      },
      include: { organization: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          organizationId: org.id,
        },
        include: { organization: true },
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: 'DATA_ENTRY', // Keep role for backwards compatibility in token
        organizationId: user.organizationId,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    await AuditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: 'DATA_ENTRY',
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users', authenticate, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      users: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        organizationId: u.organizationId,
        organizationName: u.organization.name,
        createdAt: u.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
