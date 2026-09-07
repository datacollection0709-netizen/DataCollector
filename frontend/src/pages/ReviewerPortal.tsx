import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertCircle,
  FileSpreadsheet,
  Building,
  User,
  Calendar,
  Send,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { api } from '../api/client';

interface ReviewerPortalProps {
  onExportExcel: () => void;
  onRefreshAll: () => void;
}

export const ReviewerPortal: React.FC<ReviewerPortalProps> = ({ onExportExcel, onRefreshAll }) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.getSubmissions();
      if (res.success) {
        setSubmissions(res.submissions);
        if (res.submissions.length > 0) {
          // Fetch full detail of first submission
          const detail = await api.getSubmissionById(res.submissions[0].id);
          setSelectedSub(detail.submission);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleSelectSubmission = async (id: string) => {
    try {
      const detail = await api.getSubmissionById(id);
      setSelectedSub(detail.submission);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAction = async () => {
    if (!selectedSub || !showActionModal) return;

    if (showActionModal === 'REJECT' && !actionReason.trim()) {
      alert('A detailed reason is mandatory when requesting corrections / rejecting.');
      return;
    }

    setIsProcessing(true);
    try {
      await api.reviewSubmission(selectedSub.id, showActionModal, actionReason);
      setShowActionModal(null);
      setActionReason('');
      await loadSubmissions();
      onRefreshAll();
    } catch (err: any) {
      alert('Review action failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newComment.trim()) return;

    try {
      const res = await api.addComment(selectedSub.id, newComment);
      if (res.success) {
        setSelectedSub({
          ...selectedSub,
          comments: [res.comment, ...(selectedSub.comments || [])],
        });
        setNewComment('');
      }
    } catch (err: any) {
      alert('Failed to post comment: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Loading Institutional Submissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200">
              COMMITTEE REVIEW PORTAL
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Institutional Submissions Review
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inspect data entries, examine uploaded proofs, provide feedback, and certify accreditation data.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportExcel}
          leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
        >
          Export Excel Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Submissions List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            All Submissions ({submissions.length})
          </h3>

          <div className="space-y-2">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => handleSelectSubmission(sub.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedSub?.id === sub.id
                    ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-xs text-slate-800 truncate">
                    {sub.organization?.name}
                  </span>
                  <StatusBadge status={sub.status} />
                </div>

                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>Created by: {sub.creator?.name}</div>
                  <div>Submitted: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Drafting'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {sub._count?.values ?? 0} values &bull; {sub._count?.documents ?? 0} proofs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Selected Submission Detail */}
        {selectedSub && (
          <div className="lg:col-span-2 space-y-4">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedSub.organization?.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Org Code: {selectedSub.organization?.code}</span>
                    <span>&bull;</span>
                    <span>Status: <StatusBadge status={selectedSub.status} /></span>
                  </div>
                </div>

                {/* Approve / Reject Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowActionModal('REJECT')}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Request Corrections
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setShowActionModal('APPROVE')}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Approve Attribute 3
                  </Button>
                </div>
              </div>

              {/* Rejection Reason Banner if previously rejected */}
              {selectedSub.rejectionReason && (
                <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900 mb-1">
                    <AlertCircle className="w-4 h-4" /> Active Correction Request Note:
                  </div>
                  <p>{selectedSub.rejectionReason}</p>
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500 text-[11px]">Values Recorded</div>
                  <div className="text-base font-bold text-slate-800 font-mono mt-0.5">
                    {selectedSub.values?.length || 0}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500 text-[11px]">Proofs Attached</div>
                  <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                    {selectedSub.documents?.length || 0} files
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500 text-[11px]">Review Comments</div>
                  <div className="text-base font-bold text-slate-800 font-mono mt-0.5">
                    {selectedSub.comments?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Supporting Documents List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Supporting Evidence & Uploaded Proofs ({selectedSub.documents?.length || 0})
              </h3>

              {selectedSub.documents?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No proofs uploaded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedSub.documents?.map((doc: any) => (
                    <div key={doc.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800">{doc.originalFileName}</div>
                        <div className="text-[11px] text-slate-400">
                          Field: {doc.field?.code} ({doc.field?.label}) &bull; Year: {doc.year?.code || 'All Years'} &bull; {(doc.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <a
                        href={api.downloadDocumentUrl(doc.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 hover:bg-slate-100 text-slate-700"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review Comments & Feedback Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Review Comments & Institutional Notes
              </h3>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type an audit note or correction comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-500 outline-none"
                />
                <Button type="submit" size="sm" variant="primary" rightIcon={<Send className="w-3.5 h-3.5" />}>
                  Post
                </Button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedSub.comments?.map((c: any) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-700 mb-1">
                      <span>{c.author?.name} ({c.author?.role})</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve / Reject Modal */}
      <Modal
        isOpen={showActionModal !== null}
        onClose={() => setShowActionModal(null)}
        title={showActionModal === 'APPROVE' ? 'Approve Attribute 3 Submission' : 'Request Corrections / Reject'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {showActionModal === 'APPROVE'
              ? 'Are you satisfied that all institutional indicators, financial figures, and supporting proofs are complete and compliant?'
              : 'Please specify the exact fields, missing proofs, or figures that require revision by the institutional data officer:'}
          </p>

          {showActionModal === 'REJECT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Correction Request (Mandatory)
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Please re-verify the student computer ratio for 2024-25 and attach the official laboratory list..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowActionModal(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={showActionModal === 'APPROVE' ? 'success' : 'danger'}
              size="sm"
              onClick={handleAction}
              isLoading={isProcessing}
            >
              {showActionModal === 'APPROVE' ? 'Confirm Approval' : 'Submit Correction Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
