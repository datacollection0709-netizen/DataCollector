/**
 * Google Apps Script Backend Code and Deployment Instructions
 * Used for 1-click copying inside the DocumentUploadModal and Google Drive Settings
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Attribute 3 Data Collection - Google Apps Script Backend
 * Target Admin Email: datacollection0709@gmail.com
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

  // Find or create root folder in Google Drive
  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  
  // Find or create department/user subfolder
  var subFolderName = department + " - " + userName;
  var userFolder = getOrCreateFolder(rootFolder, subFolderName);

  // Decode file data and store
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  var file = userFolder.createFile(blob);
  
  // Set sharing so anyone with link can view (admin & auditors)
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

  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  var userFolder = getOrCreateFolder(rootFolder, department + " - " + userName);

  var docsSummary = documents.map(function(d) {
    return (d.originalFileName || d.fileName) + " (" + d.fileUrl + ")";
  }).join("\\n");

  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  var spreadsheet;
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    DriveApp.getRootFolder().removeFile(DriveApp.getFileById(spreadsheet.getId()));
    rootFolder.addFile(DriveApp.getFileById(spreadsheet.getId()));
  }

  // Master Log Sheet
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

  return jsonResponse({
    success: true,
    message: "Submission saved to Google Sheets and Drive",
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
`;

export const DEPLOYMENT_STEPS = [
  {
    step: 1,
    title: 'Open Google Apps Script',
    desc: 'Log in to datacollection0709@gmail.com and open script.google.com, then click "New Project".',
    link: 'https://script.google.com/',
  },
  {
    step: 2,
    title: 'Paste Code & Save',
    desc: 'Delete the default Code.gs content, paste the code copied from below, and click the Save icon.',
  },
  {
    step: 3,
    title: 'Deploy as Web App',
    desc: 'Click Deploy → New deployment. Select "Web app", set Execute as: "Me", and Who has access: "Anyone".',
  },
  {
    step: 4,
    title: 'Paste Web App URL',
    desc: 'Authorize permissions when prompted, copy the Web App URL (ends with /exec), and paste it below.',
  },
];
