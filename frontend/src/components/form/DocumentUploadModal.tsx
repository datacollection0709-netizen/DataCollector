import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link2,
  ExternalLink,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const MAX_PROOFS_PER_FIELD = 3; // Max 3 proofs per field

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
  const [activeTab, setActiveTab] = useState<'upload' | 'drive'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hyperlinkInput, setHyperlinkInput] = useState('');
  const [hyperlinkLabel, setHyperlinkLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter docs attached to this field
  const fieldDocs = documents.filter((d) => (d.fieldCode || (d as any).field?.code) === fieldCode);
  const isLimitReached = fieldDocs.length >= MAX_PROOFS_PER_FIELD;

  // Direct File Upload Handler (Photos & PDFs up to 10 MB)
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check count limit (Max 3)
    if (fieldDocs.length >= MAX_PROOFS_PER_FIELD) {
      setErrorMsg(`Maximum ${MAX_PROOFS_PER_FIELD} files allowed per indicator. Please remove an existing file to upload a new one.`);
      return;
    }

    // Check file size (Max 10 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const currentMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`File size exceeds 10 MB (Current: ${currentMb} MB). Please select a file under 10 MB.`);
      return;
    }

    // Check file format
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMsg('Unsupported format. Please upload photos (JPG, PNG, WEBP) or PDF documents.');
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
      setSuccessMsg(`"${file.name}" uploaded successfully! Link saved and ready for Excel.`);
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

  // Google Drive Link Handler
  const handleAddHyperlink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hyperlinkInput.trim()) {
      setErrorMsg('Please enter a valid Google Drive file link.');
      return;
    }

    if (fieldDocs.length >= MAX_PROOFS_PER_FIELD) {
      setErrorMsg(`Maximum ${MAX_PROOFS_PER_FIELD} proofs allowed per indicator.`);
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    try {
      let finalUrl = hyperlinkInput.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }

      // Auto-detect Google Drive file ID to normalize URL
      const driveMatch = finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || finalUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        const fileId = driveMatch[1];
        finalUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      }

      const linkTitle = hyperlinkLabel.trim() || (driveMatch ? 'Google Drive Proof Document' : 'Proof Document Link');

      await api.addHyperlinkProof({
        submissionId,
        fieldCode,
        yearCode: yearCode !== 'all' ? yearCode : undefined,
        fileName: linkTitle,
        hyperlink: finalUrl,
      });

      setSuccessMsg(`Google Drive proof "${linkTitle}" saved! It is clickable and openable in Excel.`);
      setHyperlinkInput('');
      setHyperlinkLabel('');
      onDocumentChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Google Drive proof.');
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
      setErrorMsg(err.message || 'Failed to delete proof.');
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Verification File / Proof"
      description={`${fieldCode}: ${fieldLabel} — Maximum 3 proof files`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Alerts */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Counter Badge */}
        <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Attached Files:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                isLimitReached
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-brand-50 text-brand-700 border border-brand-200'
              }`}
            >
              {fieldDocs.length} / {MAX_PROOFS_PER_FIELD} files
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {isLimitReached ? 'Limit reached (Max 3)' : `Can add ${MAX_PROOFS_PER_FIELD - fieldDocs.length} more`}
          </span>
        </div>

        {/* Method Tabs: Upload File (Default) & Paste Google Drive Link */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File (Photo / PDF)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'drive'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Paste Google Drive Link</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: UPLOAD FILE OPTION (PRIMARY & DEFAULT) */}
        {/* ==================================================== */}
        {activeTab === 'upload' && (
          <div>
            {isLimitReached ? (
              <div className="p-6 text-center rounded-xl bg-amber-50/60 border border-dashed border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="font-semibold">Maximum 3 files already uploaded for this indicator.</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  To upload a new file, please delete one of the existing files below.
                </p>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-brand-500 bg-brand-50/50'
                    : 'border-slate-300 hover:border-brand-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <div className="flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mb-3 shadow-inner">
                    {isUploading ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : (
                      <UploadCloud className="w-7 h-7" />
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    {isUploading ? 'Uploading file...' : 'Upload Verification File'}
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 max-w-sm">
                    Drag and drop your photo or PDF here, or click the button below to browse from your device.
                  </p>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  >
                    {isUploading ? 'Uploading...' : 'Choose File to Upload'}
                  </Button>

                  <p className="text-[11px] text-slate-400 mt-3">
                    JPG, PNG, WEBP, or PDF • <strong>Max 10 MB</strong> • Stored as clickable link in Excel
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: PASTE GOOGLE DRIVE LINK OPTION */}
        {/* ==================================================== */}
        {activeTab === 'drive' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-semibold text-blue-900">Have a file already in Google Drive?</p>
                <p className="text-[11px] text-blue-700 mt-0.5">Upload to Drive, copy the share link, and paste it below.</p>
              </div>
              <a
                href="https://drive.google.com/drive/my-drive"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all flex-shrink-0"
              >
                <span>Open Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <form onSubmit={handleAddHyperlink} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Drive File Link *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://drive.google.com/file/d/..."
                  value={hyperlinkInput}
                  onChange={(e) => setHyperlinkInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-brand-500 outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proof Title / Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Geotagged Classroom Photo, DELNET Certificate"
                  value={hyperlinkLabel}
                  onChange={(e) => setHyperlinkLabel(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-brand-500 outline-none bg-white"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isUploading || isLimitReached}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Save Google Drive Proof
              </Button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* ATTACHED PROOFS LIST WITH OPEN DRIVE BUTTONS */}
        {/* ==================================================== */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Attached Files for {fieldCode} ({fieldDocs.length})
          </h4>

          {fieldDocs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No files attached yet for this indicator. Click <strong>Choose File to Upload</strong> above.
            </div>
          ) : (
            <div className="space-y-2">
              {fieldDocs.map((doc, idx) => {
                const targetUrl = doc.hyperlink || (doc.fileUrl && doc.fileUrl !== '#' ? doc.fileUrl : null);
                const isPdf = doc.mimeType === 'application/pdf' || doc.originalFileName?.endsWith('.pdf');

                return (
                  <div
                    key={doc.id || idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-brand-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                        {isPdf ? (
                          <FileText className="w-5 h-5 text-rose-600" />
                        ) : (
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate" title={doc.originalFileName}>
                          {doc.originalFileName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {doc.fileSize > 0 ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Cloud File'} • Attached {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {targetUrl && (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors"
                        >
                          <span>Open File</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id, doc.originalFileName)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
