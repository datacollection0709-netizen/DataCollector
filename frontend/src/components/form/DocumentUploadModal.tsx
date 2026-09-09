import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { proofStorage } from '../../utils/imageStorage';

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
const MAX_PROOFS_PER_FIELD = 3; // Max 3 photos/proofs

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
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
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

  // File Upload Handler (Photos & PDFs <= 2 MB)
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check count limit (Max 3)
    if (fieldDocs.length >= MAX_PROOFS_PER_FIELD) {
      setErrorMsg(`Maximum ${MAX_PROOFS_PER_FIELD} photos/proofs allowed per indicator. Please remove an existing proof to upload a new one.`);
      return;
    }

    // Check file size (Max 2 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const currentMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`File size exceeds the 2 MB limit (Current: ${currentMb} MB). Please compress or select an image under 2 MB.`);
      return;
    }

    // Check file format (Photos & PDFs)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMsg('Unsupported format. Please upload photos (JPG, PNG, WEBP) or PDF documents (max 2 MB).');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploading(true);

    try {
      // Read file as Base64 Data URL for IndexedDB and Excel embedding
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
      setSuccessMsg(`"${file.name}" uploaded successfully! (Embedded in Excel)`);
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

  // Hyperlink Handler (Strategy 3: Google Drive / Web Link)
  const handleAddHyperlink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hyperlinkInput.trim()) {
      setErrorMsg('Please enter a valid URL or Google Drive link.');
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

      const linkTitle = hyperlinkLabel.trim() || 'Google Drive / Cloud Proof Link';

      await api.addHyperlinkProof({
        submissionId,
        fieldCode,
        yearCode: yearCode !== 'all' ? yearCode : undefined,
        fileName: linkTitle,
        hyperlink: finalUrl,
      });

      setSuccessMsg(`Hyperlink "${linkTitle}" saved and linked!`);
      setHyperlinkInput('');
      setHyperlinkLabel('');
      onDocumentChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save hyperlink.');
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
      title="Audit Proofs & Visual Evidence"
      description={`${fieldCode}: ${fieldLabel} — Maximum 3 proofs (Photos/PDFs up to 2 MB, or Drive Hyperlinks)`}
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
            <span className="font-semibold text-slate-700">Attached Proofs:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                isLimitReached
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-brand-50 text-brand-700 border border-brand-200'
              }`}
            >
              {fieldDocs.length} / {MAX_PROOFS_PER_FIELD} proofs
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {isLimitReached ? 'Limit reached (Max 3)' : `Can add ${MAX_PROOFS_PER_FIELD - fieldDocs.length} more`}
          </span>
        </div>

        {/* Method Selector Tabs */}
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
            <ImageIcon className="w-4 h-4" />
            <span>Upload Photo / PDF (Max 2 MB)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'link'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Add Hyperlink / Drive URL</span>
          </button>
        </div>

        {/* TAB 1: FILE UPLOAD DROPZONE */}
        {activeTab === 'upload' && (
          <div>
            {isLimitReached ? (
              <div className="p-6 text-center rounded-xl bg-amber-50/60 border border-dashed border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="font-semibold">Maximum 3 photos/proofs already uploaded for this indicator.</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  To upload a new photo, please delete one of the existing proofs below.
                </p>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-brand-500 bg-brand-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
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
                  <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mb-2.5">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <UploadCloud className="w-6 h-6" />
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-800">
                    {isUploading ? 'Compressing & storing proof...' : 'Drag and drop your photo or PDF here'}
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2.5"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Local File
                  </Button>

                  <p className="text-[11px] text-slate-500 mt-2">
                    JPG, PNG, WEBP, or PDF • <strong>Max 2 MB per file</strong> • Auto-embedded into Excel
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HYPERLINK (STRATEGY 3) */}
        {activeTab === 'link' && (
          <form onSubmit={handleAddHyperlink} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link Title / Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Geotagged Classroom Photos on Google Drive"
                value={hyperlinkLabel}
                onChange={(e) => setHyperlinkLabel(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-brand-500 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hyperlink URL (Google Drive, Cloud Storage, or Institutional Link) *
              </label>
              <input
                type="text"
                required
                placeholder="https://drive.google.com/drive/folders/..."
                value={hyperlinkInput}
                onChange={(e) => setHyperlinkInput(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-brand-500 outline-none bg-white font-mono"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUploading || isLimitReached}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Hyperlink Proof
            </Button>
          </form>
        )}

        {/* ATTACHED PROOFS LIST WITH THUMBNAILS */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Uploaded Proofs for {fieldCode} ({fieldDocs.length})
          </h4>

          {fieldDocs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No proofs attached yet for this indicator.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {fieldDocs.map((doc, idx) => {
                const isImg =
                  doc.mimeType?.startsWith('image/') ||
                  doc.dataUrl?.startsWith('data:image/') ||
                  /\.(jpg|jpeg|png|webp)$/i.test(doc.originalFileName || '');
                const isPdf = doc.mimeType === 'application/pdf' || doc.originalFileName?.endsWith('.pdf');
                const isLink = !!doc.hyperlink;

                return (
                  <div
                    key={doc.id || idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-brand-300 transition-all flex flex-col justify-between"
                  >
                    {/* Visual Preview / Icon with click-to-view */}
                    <div
                      onClick={() => {
                        const target = doc.hyperlink || doc.dataUrl || doc.fileUrl;
                        if (target && target !== '#') {
                          window.open(target, '_blank');
                        }
                      }}
                      className="relative mb-2 w-full h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100 cursor-pointer group hover:opacity-90 transition-opacity"
                      title="Click to open full view"
                    >
                      {isImg && (doc.dataUrl || doc.fileUrl) ? (
                        <img
                          src={doc.dataUrl || doc.fileUrl}
                          alt={doc.originalFileName}
                          className="w-full h-full object-cover"
                        />
                      ) : isPdf ? (
                        <div className="flex flex-col items-center justify-center text-rose-600">
                          <FileText className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold font-mono uppercase bg-rose-50 px-1.5 py-0.5 rounded text-rose-700">
                            PDF Document
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-brand-600 p-2 text-center">
                          <Link2 className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-500 truncate max-w-full">
                            Hyperlink
                          </span>
                        </div>
                      )}
                      <span className="absolute top-1 left-1 bg-slate-900/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open View</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={doc.originalFileName}>
                        {doc.originalFileName}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{doc.fileSize > 0 ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Cloud Link'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const target = doc.hyperlink || doc.dataUrl || doc.fileUrl;
                            if (target && target !== '#') {
                              window.open(target, '_blank');
                            }
                          }}
                          className="text-brand-600 hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.originalFileName)}
                      className="mt-2.5 w-full py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors flex items-center justify-center gap-1 border border-rose-100"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
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
