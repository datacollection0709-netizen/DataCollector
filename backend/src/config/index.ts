import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-attribute-3-dev-only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
};
