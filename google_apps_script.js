/**
 * Attribute 3 Data Collection - Google Apps Script Backend
 * 
 * INSTRUCTIONS FOR ADMIN:
 * 1. Go to https://script.google.com/ and create a "New Project".
 * 2. Name the project "Attribute 3 Backend".
 * 3. Delete the default code and paste this ENTIRE file into the editor.
 * 4. Click the "Save" (floppy disk) icon.
 * 5. Click "Deploy" -> "New deployment" in the top right.
 * 6. Click the gear icon next to "Select type" and choose "Web app".
 * 7. Under "Execute as", select "Me (<your email>)".
 * 8. Under "Who has access", select "Anyone".
 * 9. Click "Deploy" (you will be asked to Review Permissions and authorize your account).
 * 10. Copy the "Web app URL" provided and paste it into the React app's .env file as VITE_GOOGLE_SCRIPT_URL.
 */

// Configuration
var ROOT_FOLDER_NAME = "Attribute 3 Submitted Proofs";
var SPREADSHEET_NAME = "Attribute 3 Form Submissions";

function doPost(e) {
  try {
    // We expect the frontend to send a text/plain POST to bypass CORS preflight
    // The contents will be a stringified JSON object
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === 'uploadFile') {
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

// Handle CORS for simple GET requests if someone visits the URL directly
function doGet(e) {
  return jsonResponse({ success: true, message: "Attribute 3 API is running!" });
}

function handleFileUpload(payload) {
  var fileName = payload.fileName;
  var mimeType = payload.mimeType;
  var base64Data = payload.base64Data;
  var userName = payload.userName || 'Unknown User';
  var department = payload.department || 'Unknown Dept';

  // Find or create root folder
  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  
  // Find or create department subfolder
  var subFolderName = department + " - " + userName;
  var userFolder = getOrCreateFolder(rootFolder, subFolderName);

  // Decode file data
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);

  // Create file in user's folder
  var file = userFolder.createFile(blob);
  
  // Set sharing to "Anyone with the link can view" so the frontend can link it
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return jsonResponse({
    success: true,
    fileId: file.getId(),
    fileUrl: file.getUrl()
  });
}

function handleFormSubmit(payload) {
  var userName = payload.userName || 'Unknown User';
  var department = payload.department || 'Unknown Dept';
  var submissionData = payload.submissionData || {};
  var documents = payload.documents || [];

  // Prepare a readable summary of documents
  var docsSummary = documents.map(function(d) {
    return d.originalFileName + " (" + d.fileUrl + ")";
  }).join("\n");

  // Prepare a JSON string of all form values for robust storage
  var dataJson = JSON.stringify(submissionData);

  // Find or create the Spreadsheet
  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  var spreadsheet;
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
  }

  var sheet = spreadsheet.getSheets()[0];

  // If sheet is empty, add headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "User Name", "Department", "Documents Count", "Document Links", "Raw JSON Data"]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    sheet.setColumnWidth(5, 400); // Make links column wider
    sheet.setColumnWidth(6, 400); // Make JSON column wider
  }

  // Append new submission
  sheet.appendRow([
    new Date().toLocaleString(),
    userName,
    department,
    documents.length,
    docsSummary,
    dataJson
  ]);

  return jsonResponse({
    success: true,
    message: "Submission saved to spreadsheet successfully"
  });
}

// Helper: Find or create a folder within a parent folder
function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

// Helper: Return JSON response
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
