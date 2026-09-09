import React, { useState, useRef, useEffect } from 'react';
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
  Settings,
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
  const [activeTab, setActiveTab] = useState<'drive_upload' | 'drive_link'>('drive_upload');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hyperlinkInput, setHyperlinkInput] = useState('');
  const [hyperlinkLabel, setHyperlinkLabel] = useState('');
  const [scriptUrlInput, setScriptUrlInput] = useState('');
  const [showScriptConfig, setShowScriptConfig] = useState(false);
  const [hasScriptUrl, setHasScriptUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUrl = localStorage.getItem('GOOGLE_SCRIPT_URL') || (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL;
    if (savedUrl) {
      setHasScriptUrl(true);
      setScriptUrlInput(savedUrl);
    }
  }, []);

  const handleSaveScriptUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptUrlInput.trim()) {
      localStorage.removeItem('GOOGLE_SCRIPT_URL');
      setHasScriptUrl(false);
      setSuccessMsg('Google Apps Script URL cleared.');
      return;
    }
    localStorage.setItem('GOOGLE_SCRIPT_URL', scriptUrlInput.trim());
    setHasScriptUrl(true);
    setShowScriptConfig(false);
    setSuccessMsg('Google Apps Script URL saved! Direct uploads will go directly to datacollection0709@gmail.com Drive.');
  };

  // Filter docs attached to this field
  const fieldDocs = documents.filter((d) => (d.fieldCode || (d as any).field?.code) === fieldCode);
  const isLimitReached = fieldDocs.length >= MAX_PROOFS_PER_FIELD;

  // Direct File Upload Handler (Official Google Drive upload via Apps Script)
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
      setSuccessMsg(`"${file.name}" uploaded to Google Drive! Saved and ready for Excel.`);
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

  // Google Drive Link Handler (Official Google Drive link pasted)
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

      const linkTitle = hyperlinkLabel.trim() || (driveMatch ? 'Google Drive Document' : 'Proof Document Link');

      await api.addHyperlinkProof({
        submissionId,
        fieldCode,
        yearCode: yearCode !== 'all' ? yearCode : undefined,
        fileName: linkTitle,
        hyperlink: finalUrl,
      });

      setSuccessMsg(`Google Drive proof "${linkTitle}" saved! Direct link will appear in Excel.`);
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
      title="Upload File to Google Drive"
      description={`${fieldCode}: ${fieldLabel} — Official Google Drive Upload (No Third-Party Bots)`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Informational Guidance Alert */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
          <CheckCircle2 className="w-4.5 h-4.5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Official Google Drive Storage:</strong> All documents and photos are stored on Google Drive (Admin: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">datacollection0709@gmail.com</code>). In Excel, the file link is placed directly in Column F with zero embedded images.
          </span>
        </div>

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

        {/* Method Selection Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('drive_upload')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'drive_upload'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Upload via Official Google Drive</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drive_link')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'drive_link'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Paste Google Drive Link</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: OFFICIAL GOOGLE DRIVE UPLOAD WORKFLOW */}
        {/* ==================================================== */}
        {activeTab === 'drive_upload' && (
          <div className="space-y-4">
            {/* Step 1: Open Google Drive */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-xl border border-blue-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    <span>Official Google Drive Upload</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    1. Click <strong>Open Google Drive</strong> • 2. Upload file directly in Google Drive • 3. Click <strong>Share → Copy link</strong> • 4. Paste link below.
                  </p>
                </div>
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition-all flex-shrink-0"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Direct In-App File Upload Option */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-brand-600" />
                  <span>Or Upload Directly From Device</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowScriptConfig(!showScriptConfig)}
                  className="text-[11px] text-brand-600 hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>{hasScriptUrl ? 'Drive API Connected' : 'Configure Drive Webhook'}</span>
                </button>
              </div>

              {showScriptConfig && (
                <form onSubmit={handleSaveScriptUrl} className="mb-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                  <p className="text-[11px] text-slate-600">
                    To upload directly to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">datacollection0709@gmail.com</code>'s Google Drive without opening a new tab, paste your official <strong>Google Apps Script Web App URL</strong> (from <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">google_apps_script.js</code>):
                  </p>
                  <input
                    type="text"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={scriptUrlInput}
                    onChange={(e) => setScriptUrlInput(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-slate-300 font-mono outline-none focus:border-brand-500"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowScriptConfig(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      Save Google Script URL
                    </Button>
                  </div>
                </form>
              )}

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
                className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center bg-white"
              >
                <div className="flex flex-col items-center justify-center">
                  <p className="text-xs text-slate-700 font-medium mb-2">
                    {isUploading ? 'Uploading file directly to Google Drive...' : 'Drag and drop your photo or PDF here, or click to browse'}
                  </p>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isUploading || isLimitReached}
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  >
                    {isUploading ? 'Uploading to Drive...' : 'Choose File to Upload'}
                  </Button>

                  <p className="text-[10px] text-slate-400 mt-2">
                    Photos (JPG, PNG, WEBP) or PDF documents • Max 10 MB • 100% Google Drive
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Link Input directly in Tab 1 */}
            <form onSubmit={handleAddHyperlink} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-brand-600" />
                <span>Paste Link from Google Drive</span>
              </h4>

              <div>
                <input
                  type="text"
                  required
                  placeholder="https://drive.google.com/file/d/..."
                  value={hyperlinkInput}
                  onChange={(e) => setHyperlinkInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-brand-500 outline-none bg-white font-mono"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Document Title (e.g. Classroom Photo, Invoice)"
                  value={hyperlinkLabel}
                  onChange={(e) => setHyperlinkLabel(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 focus:border-brand-500 outline-none bg-white"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUploading || isLimitReached}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Save Proof Link
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: PASTE GOOGLE DRIVE LINK */}
        {/* ==================================================== */}
        {activeTab === 'drive_link' && (
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
                Document Title / Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Geotagged Classroom Photo, DELNET Subscription Receipt"
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
        )}

        {/* ==================================================== */}
        {/* ATTACHED GOOGLE DRIVE PROOFS LIST */}
        {/* ==================================================== */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Attached Proofs for {fieldCode} ({fieldDocs.length})
          </h4>

          {fieldDocs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No proofs attached yet for this indicator. Upload a file to Google Drive above.
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
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          {targetUrl || 'Google Drive File'}
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
                          <span>Open in Drive</span>
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
