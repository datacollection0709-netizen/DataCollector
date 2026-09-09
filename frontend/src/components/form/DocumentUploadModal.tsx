import React, { useState, useRef } from 'react';
import {
  X,
  Info,
  Loader2,
  FolderOpen,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Plus,
  Clock,
} from 'lucide-react';
import { api } from '../../api/client';

interface DocumentInfo {
  id: string;
  fieldCode: string;
  yearCode?: string | null;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  fileUrl?: string;
  dataUrl?: string;
  hyperlink?: string;
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  fieldCode: string;
  fieldLabel: string;
  yearCode?: string;
  documents: DocumentInfo[];
  onDocumentChange: () => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit matching Google Drive
const MAX_PROOFS_PER_FIELD = 3;

// Official Google Drive Triangular Logo
const GoogleDriveLogo = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

// Green-to-Blue Gradient Cloud Illustration with Upward Arrow
const GoogleCloudUploadIllustration = () => (
  <svg width="150" height="98" viewBox="0 0 150 98" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3">
    <defs>
      <linearGradient id="cloudGreenBlue" x1="10%" y1="60%" x2="90%" y2="40%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="50%" stopColor="#6EE7B7" />
        <stop offset="100%" stopColor="#93C5FD" />
      </linearGradient>
    </defs>
    <path
      d="M110 44C108 28 94 16 77 16C63 16 51 24 46 36C41 33 35 31 29 31C15 31 3.5 42.5 3.5 56.5C3.5 70.5 15 82 29 82H112C126 82 137.5 70.5 137.5 56.5C137.5 43.5 126 33 113 33C112 33 111 33.3 110 33.7"
      fill="url(#cloudGreenBlue)"
      stroke="#1E293B"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M74 70V44M74 44L61 57M74 44L87 57"
      stroke="#1E293B"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  submissionId,
  fieldCode,
  fieldLabel,
  yearCode = 'all',
  documents,
  onDocumentChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'mydrive' | 'recent'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [driveLinkLabel, setDriveLinkLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter docs attached to this field
  const fieldDocs = documents.filter((d) => (d.fieldCode || (d as any).field?.code) === fieldCode);
  const isLimitReached = fieldDocs.length >= MAX_PROOFS_PER_FIELD;

  // Handle direct file upload via Browse button
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (fieldDocs.length >= MAX_PROOFS_PER_FIELD) {
      setErrorMsg(`Maximum ${MAX_PROOFS_PER_FIELD} files allowed per indicator. Remove an existing file to upload a new one.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const currentMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`File size exceeds 10 MB limit (Current: ${currentMb} MB).`);
      return;
    }

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMsg('Unsupported format. Please select a photo (JPG, PNG, WEBP) or PDF document.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploading(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('submissionId', submissionId);
      formData.append('fieldCode', fieldCode);
      if (yearCode && yearCode !== 'all') {
        formData.append('yearCode', yearCode);
      }
      formData.append('dataUrl', dataUrl);

      await api.uploadDocument(formData);
      setSuccessMsg(`"${file.name}" uploaded to My Drive and linked!`);
      onDocumentChange();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle My Drive paste link
  const handleAddDriveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveLinkInput.trim()) {
      setErrorMsg('Please enter a valid Google Drive link.');
      return;
    }

    if (fieldDocs.length >= MAX_PROOFS_PER_FIELD) {
      setErrorMsg(`Maximum ${MAX_PROOFS_PER_FIELD} files allowed per indicator.`);
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    try {
      let finalUrl = driveLinkInput.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }

      const driveMatch = finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || finalUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        const fileId = driveMatch[1];
        finalUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      }

      const linkTitle = driveLinkLabel.trim() || (driveMatch ? 'Google Drive Document' : 'Proof Document');

      await api.addHyperlinkProof({
        submissionId,
        fieldCode,
        yearCode: yearCode !== 'all' ? yearCode : undefined,
        fileName: linkTitle,
        hyperlink: finalUrl,
      });

      setSuccessMsg(`"${linkTitle}" from My Drive linked successfully!`);
      setDriveLinkInput('');
      setDriveLinkLabel('');
      onDocumentChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link Google Drive file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to remove "${fileName}"?`)) return;
    try {
      await api.deleteDocument(docId);
      onDocumentChange();
      setSuccessMsg(`Removed "${fileName}".`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete file.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Styled as Official Google Drive Insert File */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <GoogleDriveLogo />
              <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">
                Insert file
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs: Upload | My Drive | Recent */}
          <div className="flex items-center gap-8 px-6 border-b border-slate-200 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 font-medium transition-all relative ${
                activeTab === 'upload'
                  ? 'text-[#1a73e8] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload
              {activeTab === 'upload' && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1a73e8] rounded-t-sm" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mydrive')}
              className={`pb-2.5 font-medium transition-all relative ${
                activeTab === 'mydrive'
                  ? 'text-[#1a73e8] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Drive
              {activeTab === 'mydrive' && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1a73e8] rounded-t-sm" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('recent')}
              className={`pb-2.5 font-medium transition-all relative ${
                activeTab === 'recent'
                  ? 'text-[#1a73e8] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recent
              {activeTab === 'recent' && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1a73e8] rounded-t-sm" />
              )}
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Feedback Notifications */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google Drive Information Callout */}
            <div className="flex items-start gap-3 p-3.5 bg-[#f0f4f9] rounded-xl text-slate-700 text-xs leading-relaxed border border-slate-200/50">
              <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <p>
                Upload 1 supported file. Max 10 MB. A copy of the selected file will be sent. Once submitted, files cannot be edited or removed.
              </p>
            </div>

            {/* TAB 1: UPLOAD (EXACT GOOGLE DRIVE MATCH) */}
            {activeTab === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center transition-all ${
                    dragActive
                      ? 'border-[#1a73e8] bg-blue-50/40'
                      : 'border-slate-300 hover:border-slate-400 bg-white'
                  }`}
                >
                  <GoogleCloudUploadIllustration />

                  <button
                    type="button"
                    disabled={isUploading || isLimitReached}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white px-8 py-2.5 text-sm font-medium shadow-xs transition-all disabled:opacity-50"
                  >
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to Drive...</span>
                      </span>
                    ) : (
                      <span>Browse</span>
                    )}
                  </button>

                  <p className="text-xs text-slate-600 mt-4">
                    or drag a file to upload to <strong className="text-slate-800 font-semibold">My Drive</strong> and select
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: MY DRIVE */}
            {activeTab === 'mydrive' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      <span>Google Drive (datacollection0709@gmail.com)</span>
                    </h4>
                    <p className="text-[11px] text-blue-800/80 mt-0.5">
                      Open your drive to upload or select files, then paste the file link below.
                    </p>
                  </div>
                  <a
                    href="https://drive.google.com/drive/my-drive"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-2xs flex-shrink-0"
                  >
                    <span>Open My Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <form onSubmit={handleAddDriveLink} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Paste Google Drive Link *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://drive.google.com/file/d/..."
                      value={driveLinkInput}
                      onChange={(e) => setDriveLinkInput(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      File Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Geotagged Classroom Photo"
                      value={driveLinkLabel}
                      onChange={(e) => setDriveLinkLabel(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading || isLimitReached}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium transition-all shadow-2xs disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Select & Attach from Drive</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: RECENT */}
            {activeTab === 'recent' && (
              <div>
                {documents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No recent files uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {documents.slice(0, 8).map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="truncate font-medium text-slate-800">{doc.originalFileName}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{doc.fieldCode}</span>
                        </div>
                        {doc.hyperlink && (
                          <a
                            href={doc.hyperlink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-[11px] font-medium flex items-center gap-0.5 flex-shrink-0"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ATTACHED PROOFS LIST */}
            {fieldDocs.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2 text-xs font-semibold text-slate-700">
                  <span>Selected Files for {fieldCode}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {fieldDocs.length} / {MAX_PROOFS_PER_FIELD} attached
                  </span>
                </div>

                <div className="space-y-2">
                  {fieldDocs.map((doc, idx) => {
                    const targetUrl = doc.hyperlink || (doc.fileUrl && doc.fileUrl !== '#' ? doc.fileUrl : null);
                    return (
                      <div
                        key={doc.id || idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">
                              {doc.originalFileName}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {doc.fileSize > 0 ? `${(doc.fileSize / 1024).toFixed(1)} KB • ` : ''}Google Drive Proof
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {targetUrl && (
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md"
                            >
                              <span>Open in Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id, doc.originalFileName)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
