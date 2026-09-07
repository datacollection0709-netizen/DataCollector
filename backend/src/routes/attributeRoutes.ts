import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const attributes = await prisma.attribute.findMany({
      where: { active: true },
      include: {
        sections: {
          where: { active: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            fields: {
              where: { active: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const years = await prisma.year.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      attributes,
      years,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:code', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const attribute = await prisma.attribute.findUnique({
      where: { code },
      include: {
        sections: {
          where: { active: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            fields: {
              where: { active: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!attribute) {
      res.status(404).json({ success: false, message: `Attribute ${code} not found.` });
      return;
    }

    const years = await prisma.year.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      attribute,
      years,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
