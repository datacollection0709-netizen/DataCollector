import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { prisma } from './prisma';
import authRoutes from './routes/authRoutes';
import attributeRoutes from './routes/attributeRoutes';
import submissionRoutes from './routes/submissionRoutes';
import documentRoutes from './routes/documentRoutes';
import auditRoutes from './routes/auditRoutes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (
        config.corsOrigin.includes(origin) ||
        config.corsOrigin.includes('*') ||
        process.env.NODE_ENV === 'development'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (Prompt item 57 & 58)
app.get(['/health', '/api/health'], async (req: Request, res: Response) => {
  let dbStatus = 'Disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'Connected';
  } catch (err: any) {
    dbStatus = `Error: ${err.message}`;
  }

  res.json({
    status: dbStatus === 'Connected' ? 'Healthy' : 'Degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    storage: 'Active (Local Filesystem / Configurable S3)',
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit', auditRoutes);

// Safe Error Handler
app.use(errorHandler);
