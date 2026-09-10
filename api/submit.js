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
    const {
      userName,
      department,
      submissionData,
      documents = [],
      adminEmail = 'datacollection0709@gmail.com',
      driveExcelUrl,
      excelBase64,
      excelFileName = 'Resource_Survey_Report.xlsx',
    } = req.body;

    // Filter populated values
    const filledValues = (submissionData || []).filter(
      (v) => v.numericValue !== null || v.textValue || v.isNotApplicable
    );

    const summaryText = filledValues
      .map((v) => {
        const val = v.isNotApplicable ? 'N/A' : (v.numericValue !== null && v.numericValue !== undefined ? v.numericValue : (v.textValue || '—'));
        return `• [${v.fieldCode}] (${v.yearCode}): ${val}`;
      })
      .join('\n');

    const proofsSummary = (documents || []).map((d, i) => {
      const link = d.hyperlink || d.fileUrl || 'Embedded in Excel';
      return `${i + 1}. [${d.fieldCode}] ${d.originalFileName || d.fileName || 'Proof'}: ${link}`;
    }).join('\n') || 'None attached';

    // Forward to FormSubmit to deliver directly to datacollection0709@gmail.com with Excel attached
    try {
      if (excelBase64) {
        const formData = new FormData();
        const buffer = Buffer.from(excelBase64, 'base64');
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        formData.append('attachment', blob, excelFileName);
        formData.append('_subject', `Resource Survey Institutional Excel Report: ${userName || 'Officer'} (${department || 'Dept'})`);
        formData.append('Submitter_Name', userName || 'Institutional Officer');
        formData.append('Department', department || 'Department');
        formData.append('Total_Answered_Entries', String(filledValues.length));
        formData.append('Attached_Proofs_Count', String(documents.length));
        if (driveExcelUrl) {
          formData.append('Google_Drive_Excel_Report', driveExcelUrl);
        }
        formData.append('Proofs_and_Links', proofsSummary);
        formData.append(
          'Message',
          driveExcelUrl
            ? `The official institutional Excel report (.xlsx) has been generated and uploaded to Google Drive:\n${driveExcelUrl}\n\nPlease click the link above to view or download the complete workbook.`
            : 'The official institutional Excel report (.xlsx) has been generated and downloaded.'
        );
        formData.append('Summary_Data', summaryText);

        await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://datacollector.vercel.app',
            'Referer': 'https://datacollector.vercel.app/',
          },
          body: formData,
        });
      }
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
