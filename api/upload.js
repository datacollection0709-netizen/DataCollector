/**
 * Production-Ready Google Drive API Backend Route
 * Tech Stack: Node.js (Vercel Serverless / Express compatible)
 * SDK: googleapis (Google Drive API v3)
 * Architecture: Google Cloud Service Account -> Central Google Drive Folder
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

// Environment variables
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

/**
 * Initializes and caches the authenticated Google Drive client
 */
function getDriveClient() {
  let credentials = null;

  // 1. Try raw JSON string from environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  // 2. Try individual environment variables
  if (!credentials && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  if (!credentials) {
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check / status check endpoint
  if (req.method === 'GET') {
    const drive = getDriveClient();
    const hasServiceAccount = Boolean(drive);
    const hasAppsScript = Boolean(process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL);

    return res.status(200).json({
      success: true,
      serviceAccountConfigured: hasServiceAccount,
      appsScriptConfigured: hasAppsScript,
      targetFolderId: FOLDER_ID !== 'root' ? FOLDER_ID : 'Default Drive Root',
      message: hasServiceAccount
        ? 'Google Drive API Service Account is active and ready.'
        : 'Service Account credentials pending. Please set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    const { action, fileName, mimeType, base64Data, targetFolderId } = payload;

    // 1. Connection Ping Test
    if (action === 'ping') {
      const drive = getDriveClient();
      if (drive) {
        return res.status(200).json({
          success: true,
          message: 'Google Drive API (Service Account) is authenticated and ready!',
          mode: 'SERVICE_ACCOUNT',
        });
      }

      // Check Apps Script fallback
      const scriptUrl = payload.googleScriptUrl || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL;
      if (scriptUrl) {
        const gRes = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'ping' }),
        });
        const gData = await gRes.json();
        return res.status(200).json(gData);
      }

      return res.status(200).json({
        success: false,
        message: 'Google Drive credentials are not yet configured on the server.',
      });
    }

    // 2. File Upload Handling
    if (!base64Data || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing base64Data or fileName in request.' });
    }

    const drive = getDriveClient();

    // Strategy A: Direct Google Drive API (Service Account)
    if (drive) {
      const destinationFolder = targetFolderId || FOLDER_ID;
      const fileBuffer = Buffer.from(base64Data, 'base64');
      const stream = Readable.from(fileBuffer);

      // File Metadata in Google Drive
      const fileMetadata = {
        name: fileName,
        parents: destinationFolder && destinationFolder !== 'root' ? [destinationFolder] : undefined,
      };

      // Resumable / Streaming Media Upload
      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: stream,
      };

      const driveFile = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, size',
      });

      const fileId = driveFile.data.id;
      const webViewLink = driveFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      // Set permission so admin and respondents can view the uploaded proof
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permError) {
        console.warn('Google Drive permission warning:', permError.message);
      }

      return res.status(200).json({
        success: true,
        fileId: fileId,
        fileUrl: webViewLink,
        webViewLink: webViewLink,
        fileName: driveFile.data.name,
        mode: 'GOOGLE_DRIVE_API',
      });
    }

    // Strategy B: Fallback to Google Apps Script Web App if configured
    const scriptUrl = payload.googleScriptUrl || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL;
    if (scriptUrl) {
      const gRes = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const gData = await gRes.json();
      return res.status(200).json(gData);
    }

    return res.status(500).json({
      success: false,
      error: 'Google Drive API backend is not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY or connect Google Apps Script.',
    });
  } catch (error) {
    console.error('Google Drive Upload Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during Google Drive upload.',
    });
  }
}
