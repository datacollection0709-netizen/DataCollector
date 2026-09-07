import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
  uploaderName?: string;
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

  // Filter docs attached to this field (and optionally year)
  const fieldDocs = documents.filter((d) => d.fieldCode === fieldCode);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Client-side file size check (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 15 MB limit. Please upload a smaller file or compress it.');
      return;
    }

    // Client-side file type check
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMsg('Unsupported file format. Please upload PDF, Word document, Excel spreadsheet, or JPG/PNG image.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('submissionId', submissionId);
      formData.append('fieldCode', fieldCode);
      if (yearCode && yearCode !== 'all') {
        formData.append('yearCode', yearCode);
      }

      await api.uploadDocument(formData);
      setSuccessMsg(`"${file.name}" uploaded and linked successfully.`);
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

  const handleDelete = async (docId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to remove the document "${fileName}"?`)) return;

    try {
      await api.deleteDocument(docId);
      onDocumentChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete document.');
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
      title="Supporting Document Repository"
      description={`Upload official proofs & audit evidence for ${fieldCode}: ${fieldLabel}`}
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

        {/* Dropzone */}
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
            accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mb-3">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <p className="text-sm font-medium text-slate-800">
              {isUploading ? 'Uploading file to secure storage...' : 'Drag and drop your file here, or'}
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2.5"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>

            <p className="text-xs text-slate-400 mt-2">
              Supported: PDF, DOCX, XLSX, JPG, PNG (Max 15 MB)
            </p>
          </div>
        </div>

        {/* Attached Documents List */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Attached Proofs ({fieldDocs.length})
          </h4>

          {fieldDocs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">No supporting documents uploaded for this field yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
              {fieldDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-slate-800 truncate">{doc.originalFileName}</div>
                      <div className="text-[11px] text-slate-400">
                        {(doc.fileSize / 1024).toFixed(1)} KB &bull; {doc.yearCode || 'All Years'} &bull; Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={api.downloadDocumentUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded transition-colors"
                      title="Download / View document"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.originalFileName)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
