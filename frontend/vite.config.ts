import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { google } from 'googleapis';
import { Readable } from 'stream';

const DEFAULT_FOLDER_ID = '1nS-cyfFHwhqEIE-uwq0k0WUzTkUWaAQz';
const BUILTIN_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'data-collection-508116',
  private_key_id: 'ff2bdf0e4bf3430bd81a1a5d456808c9a0541c73',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCNTALHjweZqcs\nHPKCXk/vI5rncKf68YQM7z6wow+fYlyb+gM8Uw4pCyHEyxzfPpYmaPnu7+DyxdY0\nyrZptfsp5Nwib+LOYLiM5VcgoJ7lVKUcjLOBQlT/P4X3T5JiptUC59HQGQEbvJ9B\nff/ou/bUrHJA2TYXjIgQ8M8f8DfQ06z9a3TF2pAc6xJ6YWJA1L0ueFKdXXub2RwZ\nDbcgWJJV5mvxM34mO1utPzK2ZWm+/O6ss7/NRjWMRwnp+MFJ6dJX9GQhSaG/XzYM\n16v7p4NZBa6FEoGu61XZBMEP/QGMuW/FKIqClLH+53ElkRpCkF8yZgKzEjuGDaRE\nKmXVm4YPAgMBAAECggEAV/pyVkcPIxKL3t8KOWbyPTpa/Ue6wWLR2G41bx2fgSu1\nGm/rMVPK0WsalCUTYkrfCG178/M1a6WWAXpnooHvUy47T1pyW93THPj0PHKnKOrs\nlX9j/kWHbc5gKQYiIZDEZLmSAfyh1OfhGXE0EkG8cuHgLGJ6L7bZGRuOKUDQeEfx\nau8WevyobXHhdr3FBhR7/jSJuUwwR3XLeGpeSESzCt7vF8SWYtH9OYl9FGykjTzP\nSMcOKILAPTiGKb75Vj9K0gCLP0oeZNmIaM0q/84xYwcUuzjawusaQV9sGsB35RxH\ntZaHo/5z9TBeFaoaUn2WpIS6BEG55wDeNxniQ/RewQKBgQD0vi1LGXpKieDANGR1\nZDEYNtszAL4BUoAqtaFfbbcBkvKFfARGJZx2c6Y6bK76YlXDBiFZQzHSO7mrr4b+\nfEgKhr1vuAJX6NwFGvl0Wn3g32K59EdeWvmZ17J/UGu7uNYLxkkCYQorgKl62xcp\npNYQqhYp7TEHjTBe7SwGaCVsrwKBgQDLI/b8vVyT4pLatsehVjTkvlq0CUC1gHRh\nitSYCPh4oVdw9V9iSxm7/JGBgryx/9W8weT0fYjL/qfYW7N3Iw96bP+NNRLHXig6\nVQHSfm28OrQxuVUecwwv+gd+Y/I0LjxRe9cYxc2cTZb/eU4B20BsZpFoyjF6rBKF\n3SmPkdOUoQKBgQCE2DmTmwezL/XrvkSNJ84yO4xtuchoxVRGWoJ2XwJH+3Binjdf\nsAimjw26hsXPqNKuYkR1xDBl0f9tPoCC4Ajmlc57tqCnAQF0T/j5fCj5h6d6Eisu\n/yiepeMAkjF4GtMsXvvAK9YuWM8lnYiMFSoQr5IKPfIwDCYmUIxmCd/OhwKBgH9z\nWx0LObBXMUgj8XAaBCmX/JSEUaMOqvYgAm45Apu8rn3ilSu4brbxKeGVwwnyt4ks\nJZf3wwIqDejC8ABJcQagqF1R9Sw8uQSQHQqR5At60V95JhxqljTrrBPyZR2z/Igr\nKLMUN4Jfc+NpmjWz9+GLIKQcZ5rNpvlx3weCuLrBAoGBAJZHYd4OvQXeX0790Bor\nl/5IoVlvl/6/muz0b8zeQZRNuANN76W/7KeE8Dx5ow87X+eQ+RRf3fvRmKsjLH0v\nki1emV9wxn90x3fUnXPk4HmRgEJWhGsCurSc0LyjCGMvJ83/uTy7/vy39E7fnCpO\nDsk6OWoApvjy0kjMTM7o9qsM\n-----END PRIVATE KEY-----\n',
  client_email: 'drive-uploader@data-collection-508116.iam.gserviceaccount.com',
};

function googleDriveDevMiddleware(): Plugin {
  return {
    name: 'google-drive-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/upload', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          try {
            const auth = new google.auth.GoogleAuth({
              credentials: BUILTIN_SERVICE_ACCOUNT,
              scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
            });
            const drive = google.drive({ version: 'v3', auth });
            const payload = body ? JSON.parse(body) : {};

            if (payload.action === 'ping') {
              try {
                await drive.files.list({ pageSize: 1 });
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'Google Drive Service Account active' }));
                return;
              } catch (pingErr: any) {
                const errMsg = pingErr.message || String(pingErr);
                const needsApiEnable = errMsg.includes('has not been used in project') || errMsg.includes('is disabled');
                res.writeHead(200);
                res.end(
                  JSON.stringify({
                    success: false,
                    needsApiEnable,
                    enableUrl:
                      'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=895735407205',
                    message: errMsg,
                  })
                );
                return;
              }
            }

            const { fileName, mimeType, base64Data } = payload;
            if (!base64Data || !fileName) {
              res.writeHead(400);
              res.end(JSON.stringify({ success: false, error: 'Missing file data' }));
              return;
            }

            const fileBuffer = Buffer.from(base64Data, 'base64');
            const stream = Readable.from(fileBuffer);

            const driveFile = await drive.files.create({
              requestBody: {
                name: fileName,
                parents: [DEFAULT_FOLDER_ID],
              },
              media: {
                mimeType: mimeType || 'application/octet-stream',
                body: stream,
              },
              fields: 'id, name, webViewLink, webContentLink',
            });

            const fileId = driveFile.data.id;
            const fileUrl = driveFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

            try {
              await drive.permissions.create({
                fileId: fileId!,
                requestBody: { role: 'reader', type: 'anyone' },
              });
            } catch (e) {}

            res.writeHead(200);
            res.end(
              JSON.stringify({
                success: true,
                fileId,
                fileUrl,
                webViewLink: fileUrl,
                fileName: driveFile.data.name,
              })
            );
          } catch (err: any) {
            const errMsg = err.message || String(err);
            const needsApiEnable = errMsg.includes('has not been used in project') || errMsg.includes('is disabled');
            res.writeHead(500);
            res.end(
              JSON.stringify({
                success: false,
                error: errMsg,
                needsApiEnable,
                enableUrl:
                  'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=895735407205',
                serviceAccountEmail: BUILTIN_SERVICE_ACCOUNT.client_email,
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), googleDriveDevMiddleware()],
  server: {
    port: 5173,
  },
});
