import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Ensure base upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Storage engine: structured by organization/submission
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgId = req.user?.organizationId || 'default-org';
    const submissionId = (req.body.submissionId as string) || 'temp-submission';
    const targetDir = path.join(config.uploadDir, orgId, submissionId);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Sanitize file name
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(sanitizedOriginal);
    const baseName = path.basename(sanitizedOriginal, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// Whitelist allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type (${file.mimetype}). Allowed formats: PDF, Word (DOCX/DOC), Excel (XLSX/XLS), Images (JPG/PNG/WEBP).`
      )
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
  },
});
