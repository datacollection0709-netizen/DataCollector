/**
 * Attribute 3 Data Collection - Google Apps Script Backend
 * 
 * Target Admin Email: datacollection0709@gmail.com
 * 
 * DEPLOYMENT INSTRUCTIONS FOR ADMIN:
 * 1. Log in to your Google Account (datacollection0709@gmail.com).
 * 2. Go to https://script.google.com/ and click "New Project".
 * 3. Title the project "Attribute 3 Backend - Data Collection".
 * 4. Replace the entire default code in Code.gs with this file's code.
 * 5. Click the Save icon.
 * 6. Click "Deploy" -> "New deployment" in the top right.
 * 7. Click the Gear icon next to "Select type" and select "Web app".
 * 8. Set Description: "Attribute 3 Form Webhook".
 * 9. Set "Execute as": "Me (datacollection0709@gmail.com)".
 * 10. Set "Who has access": "Anyone".
 * 11. Click "Deploy" and authorize permissions when prompted.
 * 12. Copy the "Web app URL" (ends in /exec).
 * 13. Paste the URL into frontend/.env as VITE_GOOGLE_SCRIPT_URL=<YOUR_COPIED_URL>.
 */

var ADMIN_EMAIL = "datacollection0709@gmail.com";
var ROOT_FOLDER_NAME = "Attribute 3 Submitted Proofs";
var SPREADSHEET_NAME = "Attribute 3 Form Submissions";

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        message: "Google Drive connection active for " + ADMIN_EMAIL,
        email: ADMIN_EMAIL
      });
    } else if (action === 'uploadFile') {
      return handleFileUpload(payload);
    } else if (action === 'submitForm') {
      return handleFormSubmit(payload);
    } else {
      return jsonResponse({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doGet(e) {
  return jsonResponse({
    success: true,
    message: "Attribute 3 API is running for " + ADMIN_EMAIL
  });
}

function handleFileUpload(payload) {
  var fileName = payload.fileName || 'Uploaded_Document';
  var mimeType = payload.mimeType || 'application/octet-stream';
  var base64Data = payload.base64Data;
  var userName = payload.userName || 'Unknown User';
  var department = payload.department || 'Unknown Dept';

  // Find or create root folder
  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  
  // Find or create department/user subfolder
  var subFolderName = department + " - " + userName;
  var userFolder = getOrCreateFolder(rootFolder, subFolderName);

  // Decode file data and store
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  var file = userFolder.createFile(blob);
  
  // Set sharing so admin and frontend can view
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return jsonResponse({
    success: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    folderUrl: userFolder.getUrl()
  });
}

function handleFormSubmit(payload) {
  var userName = payload.userName || 'Unknown User';
  var department = payload.department || 'Unknown Dept';
  var submissionData = payload.submissionData || [];
  var documents = payload.documents || [];
  var adminEmail = payload.adminEmail || ADMIN_EMAIL;

  // Find or create Root Folder and User Folder
  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  var userFolder = getOrCreateFolder(rootFolder, department + " - " + userName);

  // Prepare a readable summary of documents
  var docsSummary = documents.map(function(d) {
    return d.originalFileName + " (" + d.fileUrl + ")";
  }).join("\n");

  // Find or create the Spreadsheet
  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  var spreadsheet;
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    // Put spreadsheet in the root folder for easy access
    DriveApp.getRootFolder().removeFile(DriveApp.getFileById(spreadsheet.getId()));
    rootFolder.addFile(DriveApp.getFileById(spreadsheet.getId()));
  }

  // 1. MASTER LOG SHEET
  var masterSheet = spreadsheet.getSheetByName("Master Submissions Log");
  if (!masterSheet) {
    masterSheet = spreadsheet.getSheets()[0];
    masterSheet.setName("Master Submissions Log");
  }

  if (masterSheet.getLastRow() === 0) {
    masterSheet.appendRow([
      "Timestamp",
      "User Name",
      "Department",
      "Email Notified",
      "Documents Count",
      "Drive Proofs Folder",
      "Document Links"
    ]);
    var headerRange = masterSheet.getRange(1, 1, 1, 7);
    headerRange.setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");
    masterSheet.setColumnWidth(6, 300);
    masterSheet.setColumnWidth(7, 400);
  }

  masterSheet.appendRow([
    new Date().toLocaleString(),
    userName,
    department,
    adminEmail,
    documents.length,
    userFolder.getUrl(),
    docsSummary
  ]);

  // 2. DETAILED SHEET FOR THIS SUBMITTER
  var safeSheetName = (userName + " - " + department).substring(0, 30);
  var userSheet = spreadsheet.getSheetByName(safeSheetName);
  if (userSheet) {
    spreadsheet.deleteSheet(userSheet);
  }
  userSheet = spreadsheet.insertSheet(safeSheetName);

  // Build header
  userSheet.appendRow([
    "Sr. No.",
    "Field Code",
    "Year",
    "Reported Value",
    "Status / Remarks",
    "Proof File Links"
  ]);
  userSheet.getRange(1, 1, 1, 6).setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");
  userSheet.setColumnWidth(4, 200);
  userSheet.setColumnWidth(5, 250);
  userSheet.setColumnWidth(6, 350);

  // Index documents by field code
  var docMap = {};
  for (var i = 0; i < documents.length; i++) {
    var d = documents[i];
    var fc = d.fieldCode || (d.field ? d.field.code : '');
    if (fc) {
      if (!docMap[fc]) docMap[fc] = [];
      docMap[fc].push(d.originalFileName + ": " + d.fileUrl);
    }
  }

  // Populate data
  if (Array.isArray(submissionData)) {
    for (var j = 0; j < submissionData.length; j++) {
      var item = submissionData[j];
      var fCode = item.fieldCode || (item.field ? item.field.code : '—');
      var yCode = item.yearCode || (item.year ? item.year.code : '—');
      var valDisplay = '—';

      if (item.isNotApplicable) {
        valDisplay = 'N/A';
      } else if (item.numericValue !== null && item.numericValue !== undefined) {
        valDisplay = String(item.numericValue);
      } else if (item.textValue) {
        valDisplay = item.textValue;
      }

      var proofs = (docMap[fCode] || []).join("\n");
      userSheet.appendRow([
        j + 1,
        fCode,
        yCode,
        valDisplay,
        item.remarks || '',
        proofs
      ]);
    }
  }

  // 3. SEND AUTOMATED EMAIL TO datacollection0709@gmail.com
  try {
    var emailSubject = "New Attribute 3 Submission: " + userName + " (" + department + ")";
    var emailHtml = "<div style='font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
      + "<h2 style='color: #1e3a8a; margin-top: 0;'>New Attribute 3 Form Submission</h2>"
      + "<p>A new institutional data collection report has been submitted.</p>"
      + "<table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>"
      + "<tr><td style='padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;'>Submitter</td><td style='padding: 8px; border: 1px solid #e2e8f0;'>" + userName + "</td></tr>"
      + "<tr><td style='padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;'>Department</td><td style='padding: 8px; border: 1px solid #e2e8f0;'>" + department + "</td></tr>"
      + "<tr><td style='padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;'>Timestamp</td><td style='padding: 8px; border: 1px solid #e2e8f0;'>" + new Date().toLocaleString() + "</td></tr>"
      + "<tr><td style='padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;'>Attached Documents</td><td style='padding: 8px; border: 1px solid #e2e8f0;'>" + documents.length + " Files</td></tr>"
      + "</table>"
      + "<p style='margin-bottom: 20px;'>"
      + "<a href='" + spreadsheet.getUrl() + "' style='display: inline-block; padding: 10px 18px; background: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;'>Open Google Sheet</a>"
      + "<a href='" + userFolder.getUrl() + "' style='display: inline-block; padding: 10px 18px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;'>Open Drive Proofs Folder</a>"
      + "</p>"
      + "<h3 style='color: #334155;'>Attached Documents:</h3>"
      + "<ul>"
      + documents.map(function(d) {
          return "<li><a href='" + d.fileUrl + "'>" + d.originalFileName + "</a></li>";
        }).join("")
      + "</ul>"
      + "<hr style='border: none; border-top: 1px solid #e2e8f0; margin-top: 25px;' />"
      + "<p style='font-size: 11px; color: #64748b;'>Automated notification sent to " + adminEmail + "</p>"
      + "</div>";

    MailApp.sendEmail({
      to: adminEmail,
      subject: emailSubject,
      htmlBody: emailHtml
    });
  } catch (emailErr) {
    Logger.log("Email Notification Warning: " + emailErr.toString());
  }

  return jsonResponse({
    success: true,
    message: "Submission saved to Google Sheets and email notification sent to " + adminEmail,
    spreadsheetUrl: spreadsheet.getUrl(),
    folderUrl: userFolder.getUrl()
  });
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
