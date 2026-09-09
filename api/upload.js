// Vercel Serverless Function: /api/upload
// Proxies file uploads and pings to Google Apps Script to eliminate client-side CORS issues

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const googleScriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;

  if (req.method === 'GET') {
    if (!googleScriptUrl) {
      return res.status(200).json({
        connected: false,
        message: 'Google Apps Script URL is not configured on the server.',
      });
    }
    try {
      const gRes = await fetch(googleScriptUrl);
      const data = await gRes.json();
      return res.status(200).json({ connected: true, scriptData: data });
    } catch (err) {
      return res.status(200).json({ connected: false, error: err.toString() });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    const targetUrl = payload.googleScriptUrl || googleScriptUrl;

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'No Google Apps Script Web App URL provided or configured.',
      });
    }

    const gRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const data = await gRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.toString() });
  }
}
