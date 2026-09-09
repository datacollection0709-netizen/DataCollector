// Vercel Serverless Function: /api/submit
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { userName, department, submissionData, documents, adminEmail = 'datacollection0709@gmail.com' } = req.body;

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
          _subject: `New Attribute 3 Submission: ${userName} (${department})`,
          Submitter: userName,
          Department: department,
          Total_Filled: filledValues.length,
          Documents_Count: (documents || []).length,
          Summary: summaryText,
        }),
      });
    } catch (err) {
      console.warn('FormSubmit forwarding error:', err);
    }

    return res.status(200).json({
      success: true,
      message: `Submission received and routed to ${adminEmail}`,
      recordedCount: filledValues.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.toString() });
  }
}
