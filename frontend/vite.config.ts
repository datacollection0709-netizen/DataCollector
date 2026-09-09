import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwPPjyGSXSguHLXASQikEL6KMCfHQE-huVsn2icQ1cNExLt5bpD6bfmbwh44V10vCo5/exec';

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
            const gRes = await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: body || JSON.stringify({ action: 'ping' }),
            });
            const data = await gRes.json();
            res.writeHead(200);
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: err.message || String(err) }));
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
