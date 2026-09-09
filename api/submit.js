// Vercel Serverless Function: /api/submit
export default async function handler(req, res) {
  // Set CORS headers
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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { userName, department, submissionData, documents = [], adminEmail = 'datacollection0709@gmail.com' } = req.body;

    // Filter populated values
    const filledValues = (submissionData || []).filter(
      (v) => v.numericValue !== null || v.textValue || v.isNotApplicable
    );

    const summaryText = filledValues
      .map((v) => {
        const val = v.isNotApplicable ? 'N/A' : (v.numericValue !== null && v.numericValue !== undefined ? v.numericValue : (v.textValue || '—'));
        return `[${v.fieldCode}] (${v.yearCode}): ${val}`;
      })
      .join('\n');

    const proofsSummary = (documents || []).map((d, i) => {
      const link = d.hyperlink || d.fileUrl || 'Embedded in Excel';
      return `${i + 1}. [${d.fieldCode}] ${d.originalFileName || d.fileName || 'Proof'}: ${link}`;
    }).join('\n') || 'None attached';

    // Forward to FormSubmit to deliver directly to datacollection0709@gmail.com
    try {
      await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://datacollector.vercel.app',
          'Referer': 'https://datacollector.vercel.app/',
        },
        body: JSON.stringify({
          _subject: `New Attribute 3 Audit Submission: ${userName} (${department})`,
          Submitter: userName || 'Institutional Officer',
          Department: department || 'Department',
          Total_Answered_Entries: filledValues.length,
          Attached_Proofs_Count: documents.length,
          Proofs_And_Links: proofsSummary,
          Submission_Summary: summaryText,
        }),
      });
    } catch (err) {
      console.warn('FormSubmit forwarding error:', err);
    }

    return res.status(200).json({
      success: true,
      message: `Submission successfully received and dispatched to ${adminEmail}`,
      recordedCount: filledValues.length,
      documentsCount: documents.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.toString() });
  }
}
