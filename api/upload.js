/**
 * Production Google Drive Upload Handler (Vercel Serverless Function)
 * Deployed Web App: https://script.google.com/macros/s/AKfycbwPPjyGSXSguHLXASQikEL6KMCfHQE-huVsn2icQ1cNExLt5bpD6bfmbwh44V10vCo5/exec
 * Target Folder ID: 1nS-cyfFHwhqEIE-uwq0k0WUzTkUWaAQz
 * Target Google Account: datacollection0709@gmail.com
 */

const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  process.env.VITE_GOOGLE_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwPPjyGSXSguHLXASQikEL6KMCfHQE-huVsn2icQ1cNExLt5bpD6bfmbwh44V10vCo5/exec';

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
    try {
      const gRes = await fetch(GOOGLE_SCRIPT_URL);
      const data = await gRes.json();
      return res.status(200).json({
        success: true,
        connected: true,
        scriptData: data,
        endpoint: GOOGLE_SCRIPT_URL,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        error: err.toString(),
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || {};
    const targetUrl = payload.googleScriptUrl || GOOGLE_SCRIPT_URL;

    // Forward file upload payload to Google Apps Script
    const gRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const data = await gRes.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Google Drive Forwarding Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while saving to Google Drive.',
    });
  }
}
