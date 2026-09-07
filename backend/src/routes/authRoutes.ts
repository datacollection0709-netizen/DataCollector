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
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid email or password format.' });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email and password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email and password.' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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
        email: user.email,
        role: user.role,
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
        email: user.email,
        role: user.role,
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
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
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
