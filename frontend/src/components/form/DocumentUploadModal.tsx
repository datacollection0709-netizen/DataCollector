import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Loader2,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
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

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit
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
  <svg width="140" height="90" viewBox="0 0 150 98" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3">
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
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

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
      setErrorMsg(`File size exceeds 2 MB limit (Current: ${currentMb} MB).`);
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
      setSuccessMsg(`"${file.name}" uploaded directly to Google Drive folder "Proofs" and linked!`);
      onDocumentChange();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload document to Google Drive.');
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
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <GoogleDriveLogo />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-semibold text-slate-800 tracking-tight">
                    Insert file
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Drive Connected
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-sm">
                  {fieldCode} • {fieldLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {/* Status Messages */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="flex-1 leading-relaxed">{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-500 hover:text-rose-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span className="flex-1 leading-relaxed">{successMsg}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMsg(null)}
                  className="text-emerald-500 hover:text-emerald-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Folder storage info */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span>
                Files upload directly into Google Drive folder <strong>Proofs</strong> (datacollection0709@gmail.com). Max 2 MB per file.
              </span>
            </div>

            {/* Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                dragActive
                  ? 'border-[#1a73e8] bg-blue-50/50 scale-[1.005]'
                  : 'border-slate-300 bg-slate-50/30 hover:bg-slate-50/70 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={isUploading || isLimitReached}
                className="hidden"
                id="gdrive-file-input"
              />

              <GoogleCloudUploadIllustration />

              {isUploading ? (
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-blue-500 text-white font-medium text-xs shadow-md">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to Drive...</span>
                </div>
              ) : isLimitReached ? (
                <div className="text-center">
                  <p className="text-xs font-semibold text-amber-700">
                    Maximum {MAX_PROOFS_PER_FIELD} files attached for this indicator
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Remove an existing file below to upload another.
                  </p>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="gdrive-file-input"
                    className="cursor-pointer inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-md transition-colors select-none"
                  >
                    Browse
                  </label>
                  <p className="text-xs text-slate-500 mt-2.5">
                    or drag a file to upload directly to Google Drive
                  </p>
                </>
              )}
            </div>

            {/* Attached Proofs List */}
            {fieldDocs.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span>Selected Files for {fieldCode}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {fieldDocs.length} / {MAX_PROOFS_PER_FIELD} attached
                  </span>
                </div>

                <div className="space-y-2">
                  {fieldDocs.map((doc) => {
                    const driveUrl = doc.fileUrl || doc.hyperlink;
                    const sizeFormatted =
                      doc.fileSize > 1024 * 1024
                        ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(doc.fileSize / 1024)} KB`;

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {doc.originalFileName}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{sizeFormatted}</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">Google Drive Proof</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {driveUrl && (
                            <a
                              href={driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                              <span>Open in Drive</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id, doc.originalFileName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50/80 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
