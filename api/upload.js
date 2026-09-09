/**
 * Production Google Drive API v3 Backend Route
 * Architecture: Google Cloud Service Account -> Central Google Drive Folder
 * Target Folder ID: 1nS-cyfFHwhqEIE-uwq0k0WUzTkUWaAQz
 * Service Account: drive-uploader@data-collection-508116.iam.gserviceaccount.com
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

// Central Google Drive Folder provided by admin
const DEFAULT_FOLDER_ID = '1nS-cyfFHwhqEIE-uwq0k0WUzTkUWaAQz';

// Service Account Credentials provided by admin
const BUILTIN_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'data-collection-508116',
  private_key_id: 'ff2bdf0e4bf3430bd81a1a5d456808c9a0541c73',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCNTALHjweZqcs\nHPKCXk/vI5rncKf68YQM7z6wow+fYlyb+gM8Uw4pCyHEyxzfPpYmaPnu7+DyxdY0\nyrZptfsp5Nwib+LOYLiM5VcgoJ7lVKUcjLOBQlT/P4X3T5JiptUC59HQGQEbvJ9B\nff/ou/bUrHJA2TYXjIgQ8M8f8DfQ06z9a3TF2pAc6xJ6YWJA1L0ueFKdXXub2RwZ\nDbcgWJJV5mvxM34mO1utPzK2ZWm+/O6ss7/NRjWMRwnp+MFJ6dJX9GQhSaG/XzYM\n16v7p4NZBa6FEoGu61XZBMEP/QGMuW/FKIqClLH+53ElkRpCkF8yZgKzEjuGDaRE\nKmXVm4YPAgMBAAECggEAV/pyVkcPIxKL3t8KOWbyPTpa/Ue6wWLR2G41bx2fgSu1\nGm/rMVPK0WsalCUTYkrfCG178/M1a6WWAXpnooHvUy47T1pyW93THPj0PHKnKOrs\nlX9j/kWHbc5gKQYiIZDEZLmSAfyh1OfhGXE0EkG8cuHgLGJ6L7bZGRuOKUDQeEfx\nau8WevyobXHhdr3FBhR7/jSJuUwwR3XLeGpeSESzCt7vF8SWYtH9OYl9FGykjTzP\nSMcOKILAPTiGKb75Vj9K0gCLP0oeZNmIaM0q/84xYwcUuzjawusaQV9sGsB35RxH\ntZaHo/5z9TBeFaoaUn2WpIS6BEG55wDeNxniQ/RewQKBgQD0vi1LGXpKieDANGR1\nZDEYNtszAL4BUoAqtaFfbbcBkvKFfARGJZx2c6Y6bK76YlXDBiFZQzHSO7mrr4b+\nfEgKhr1vuAJX6NwFGvl0Wn3g32K59EdeWvmZ17J/UGu7uNYLxkkCYQorgKl62xcp\npNYQqhYp7TEHjTBe7SwGaCVsrwKBgQDLI/b8vVyT4pLatsehVjTkvlq0CUC1gHRh\nitSYCPh4oVdw9V9iSxm7/JGBgryx/9W8weT0fYjL/qfYW7N3Iw96bP+NNRLHXig6\nVQHSfm28OrQxuVUecwwv+gd+Y/I0LjxRe9cYxc2cTZb/eU4B20BsZpFoyjF6rBKF\n3SmPkdOUoQKBgQCE2DmTmwezL/XrvkSNJ84yO4xtuchoxVRGWoJ2XwJH+3Binjdf\nsAimjw26hsXPqNKuYkR1xDBl0f9tPoCC4Ajmlc57tqCnAQF0T/j5fCj5h6d6Eisu\n/yiepeMAkjF4GtMsXvvAK9YuWM8lnYiMFSoQr5IKPfIwDCYmUIxmCd/OhwKBgH9z\nWx0LObBXMUgj8XAaBCmX/JSEUaMOqvYgAm45Apu8rn3ilSu4brbxKeGVwwnyt4ks\nJZf3wwIqDejC8ABJcQagqF1R9Sw8uQSQHQqR5At60V95JhxqljTrrBPyZR2z/Igr\nKLMUN4Jfc+NpmjWz9+GLIKQcZ5rNpvlx3weCuLrBAoGBAJZHYd4OvQXeX0790Bor\nl/5IoVlvl/6/muz0b8zeQZRNuANN76W/7KeE8Dx5ow87X+eQ+RRf3fvRmKsjLH0v\nki1emV9wxn90x3fUnXPk4HmRgEJWhGsCurSc0LyjCGMvJ83/uTy7/vy39E7fnCpO\nDsk6OWoApvjy0kjMTM7o9qsM\n-----END PRIVATE KEY-----\n',
  client_email: 'drive-uploader@data-collection-508116.iam.gserviceaccount.com',
};

function getDriveClient() {
  let credentials = BUILTIN_SERVICE_ACCOUNT;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.warn('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY, using built-in account');
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
  });

  return {
    drive: google.drive({ version: 'v3', auth }),
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID,
    email: credentials.client_email,
  };
}

export default async function handler(req, res) {
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

  if (req.method === 'GET') {
    const { folderId, email } = getDriveClient();
    return res.status(200).json({
      success: true,
      serviceAccount: email,
      targetFolderId: folderId,
      message: 'Google Drive API Backend is configured and ready.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || {};
    const { action, fileName, mimeType, base64Data, targetFolderId } = payload;
    const { drive, folderId, email } = getDriveClient();

    // 1. Connection Ping Check
    if (action === 'ping') {
      try {
        const listRes = await drive.files.list({
          pageSize: 1,
          fields: 'files(id, name)',
        });
        return res.status(200).json({
          success: true,
          message: `Google Drive API is connected to service account (${email})`,
          email,
          folderId,
        });
      } catch (pingErr) {
        const errMsg = pingErr.message || String(pingErr);
        const needsApiEnable = errMsg.includes('has not been used in project') || errMsg.includes('is disabled');
        return res.status(200).json({
          success: false,
          needsApiEnable,
          enableUrl: 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=895735407205',
          message: errMsg,
          email,
        });
      }
    }

    // 2. Real File Upload to Google Drive Folder
    if (!base64Data || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing file content or filename.' });
    }

    const destinationFolder = targetFolderId || folderId;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const stream = Readable.from(fileBuffer);

    const fileMetadata = {
      name: fileName,
      parents: destinationFolder ? [destinationFolder] : undefined,
    };

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    };

    const driveFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = driveFile.data.id;
    const fileUrl = driveFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

    // Make viewable to anyone with link (auditors, admin, viewers)
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn('Drive permission warning:', permErr.message);
    }

    return res.status(200).json({
      success: true,
      fileId,
      fileUrl,
      webViewLink: fileUrl,
      fileName: driveFile.data.name,
      folderId: destinationFolder,
    });
  } catch (error) {
    console.error('Google Drive Upload Error:', error);
    const errMsg = error.message || String(error);
    const needsApiEnable = errMsg.includes('has not been used in project') || errMsg.includes('is disabled');
    const notShared = errMsg.includes('File not found') || errMsg.includes('notFound');

    return res.status(500).json({
      success: false,
      error: errMsg,
      needsApiEnable,
      notShared,
      enableUrl: 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=895735407205',
      serviceAccountEmail: 'drive-uploader@data-collection-508116.iam.gserviceaccount.com',
      folderId: DEFAULT_FOLDER_ID,
    });
  }
}
