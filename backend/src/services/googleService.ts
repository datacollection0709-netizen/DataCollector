import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Define the scopes needed for Google Sheets and Google Drive
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

// Placeholder for Google Service interaction
export class GoogleService {
  private static getAuthClient() {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      console.warn('WARNING: credentials.json not found. Google integration will not work.');
      return null;
    }

    return new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: SCOPES,
    });
  }

  private static async shareFileWithAdmin(drive: any, fileId: string) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;
    
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: adminEmail,
        },
        sendNotificationEmail: true,
      });
      console.log(`Successfully shared file ${fileId} with ${adminEmail}`);
    } catch (err) {
      console.error(`Failed to share file ${fileId} with admin ${adminEmail}:`, err);
    }
  }

  static async uploadExcelAsSpreadsheet(filePath: string, sheetTitle: string, referenceSheetId?: string) {
    const auth = this.getAuthClient();
    if (!auth) return null;

    const drive = google.drive({ version: 'v3', auth });

    let parents: string[] = [];
    if (referenceSheetId) {
      try {
        const refFile = await drive.files.get({ fileId: referenceSheetId, fields: 'parents' });
        if (refFile.data.parents && refFile.data.parents.length > 0) {
          parents = [refFile.data.parents[0]];
        }
      } catch (err) {
        console.warn('Could not get parent folder of reference sheet:', err);
      }
    }

    try {
      const response = await drive.files.create({
        requestBody: {
          name: sheetTitle,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: parents.length > 0 ? parents : undefined,
        },
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: fs.createReadStream(filePath),
        },
        fields: 'id, webViewLink',
      });

      if (response.data.id) {
        await this.shareFileWithAdmin(drive, response.data.id);
      }

      return response.data;
    } catch (error) {
      console.error('Error uploading Excel to Google Drive as Spreadsheet:', error);
      return null;
    }
  }

  static async uploadToDrive(filePath: string, fileName: string, mimeType: string) {
    const auth = this.getAuthClient();
    if (!auth) return null;

    const drive = google.drive({ version: 'v3', auth });
    
    try {
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
        },
        media: {
          mimeType,
          body: fs.createReadStream(filePath),
        },
        fields: 'id, webViewLink',
      });
      
      if (response.data.id) {
        await this.shareFileWithAdmin(drive, response.data.id);
      }

      return response.data;
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      return null;
    }
  }
}
