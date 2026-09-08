import React, { useState } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Upload,
  Send,
  Building2,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../api/client';

interface ReviewSubmissionProps {
  submission: any;
  attribute: any;
  years: any[];
  progress: any;
  onRefreshSubmission: () => void;
  onNavigateSection: (code: string) => void;
  onExportExcel: () => void;
}

export const ReviewSubmission: React.FC<ReviewSubmissionProps> = ({
  submission,
  attribute,
  years,
  progress,
  onRefreshSubmission,
  onNavigateSection,
  onExportExcel,
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleCollapse = (code: string) => {
    setCollapsedSections((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Map values
  const valueMap = new Map<string, any>();
  if (submission?.values) {
    for (const v of submission.values) {
      const fCode = v.field?.code || v.fieldCode;
      const yCode = v.year?.code || v.yearCode;
      if (fCode && yCode) {
        valueMap.set(`${fCode}_${yCode}`, v);
      }
    }
  }

  // Map docs
  const docMap = new Map<string, any[]>();
  if (submission?.documents) {
    for (const d of submission.documents) {
      const fCode = d.field?.code || d.fieldCode;
      if (!fCode) continue;
      const list = docMap.get(fCode) || [];
      list.push(d);
      docMap.set(fCode, list);
    }
  }

  const overall = progress?.overallPercentage ?? 0;
  const isReadyToSubmit = overall === 100 && (progress?.missingRequiredProofs?.length ?? 0) === 0;

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitForReview(submission.id);
      setSubmitSuccess(true);
      setShowConfirmModal(false);
      onRefreshSubmission();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-brand-50 text-brand-700 border border-brand-200">
                FINAL AUDIT & REVIEW
              </span>
              <StatusBadge status={submission?.status || 'DRAFT'} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Attribute 3: Comprehensive Review
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify all institutional indicators, proof attachments, and calculations across 2023–24, 2024–25, and 2025–26.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            >
              Export Excel Report
            </Button>
          </div>
        </div>

        {/* Missing Proofs Alert */}
        {progress?.missingRequiredProofs?.length > 0 && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-xs uppercase tracking-wider">
                {progress.missingRequiredProofs.length} Mandatory Supporting Proof(s) Missing:
              </div>
              <ul className="text-xs list-disc list-inside mt-1 space-y-0.5 text-rose-800">
                {progress.missingRequiredProofs.map((p: any) => (
                  <li key={p.fieldCode}>
                    <span className="font-semibold font-mono">{p.fieldCode}</span>: {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          {submitError && (
            <span className="text-rose-600 text-sm font-medium mr-auto">{submitError}</span>
          )}
          {submitSuccess && (
            <span className="text-emerald-600 text-sm font-medium mr-auto">Successfully submitted to Google Sheets!</span>
          )}
          <Button
            onClick={handleFinalSubmit}
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Submit to Admin
          </Button>
        </div>
      </div>

      {/* Sections Review Accordions */}
      <div className="space-y-4">
        {attribute?.sections?.map((sec: any) => {
          const isCollapsed = collapsedSections[sec.code];
          const secProg = progress?.sectionProgress?.find((p: any) => p.sectionCode === sec.code);
          const isComplete = (secProg?.percentage ?? 0) === 100;

          return (
            <div key={sec.code} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Accordion Header */}
              <div
                onClick={() => toggleCollapse(sec.code)}
                className="flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer transition-colors border-b border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 font-mono font-bold text-xs flex items-center justify-center">
                    {sec.code}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{sec.title}</h3>
                    <span className="text-[11px] text-slate-500">{sec.fields?.length} Indicators</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5" /> Incomplete ({secProg?.percentage ?? 0}%)
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateSection(sec.code);
                    }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-800 px-2 py-1 hover:bg-brand-50 rounded"
                  >
                    Edit
                  </button>

                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Table Body */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-20 font-mono">Sr. No.</th>
                        <th className="py-2.5 px-3 min-w-[240px]">Facility / Resource</th>
                        <th className="py-2.5 px-3 text-center w-28 font-mono">2023–24</th>
                        <th className="py-2.5 px-3 text-center w-28 font-mono">2024–25</th>
                        <th className="py-2.5 px-3 text-center w-28 font-mono">2025–26</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Attached Proofs & Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sec.fields?.map((field: any) => {
                        const v1 = valueMap.get(`${field.code}_2023-24`);
                        const v2 = valueMap.get(`${field.code}_2024-25`);
                        const v3 = valueMap.get(`${field.code}_2025-26`);
                        const docs = docMap.get(field.code) || [];

                        const renderCell = (v: any) => {
                          if (!v) return <span className="text-slate-300">—</span>;
                          if (v.isNotApplicable) return <span className="font-mono text-slate-400">-----</span>;

                          if (field.fieldType === 'CURRENCY') {
                            return (
                              <span className="font-mono font-medium">
                                {v.numericValue !== null ? `₹ ${v.numericValue.toLocaleString('en-IN')}` : '—'}
                              </span>
                            );
                          }
                          if (field.fieldType === 'PERCENTAGE') {
                            return (
                              <span className="font-mono font-medium">
                                {v.numericValue !== null ? `${v.numericValue.toFixed(2)}%` : '—'}
                              </span>
                            );
                          }
                          if (field.fieldType === 'RATIO') {
                            return <span className="font-mono font-medium">{v.textValue || '—'}</span>;
                          }
                          if (field.fieldType === 'NUMBER') {
                            return <span className="font-mono">{v.numericValue ?? '—'}</span>;
                          }
                          return <span>{v.textValue || '—'}</span>;
                        };

                        return (
                          <tr key={field.code} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                              {field.code}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-800">{field.label}</div>
                              {field.unit && <div className="text-[10px] text-slate-400">Unit: {field.unit}</div>}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-slate-50/30">{renderCell(v1)}</td>
                            <td className="py-2.5 px-3 text-center">{renderCell(v2)}</td>
                            <td className="py-2.5 px-3 text-center bg-slate-50/30">{renderCell(v3)}</td>
                            <td className="py-2.5 px-3">
                              {docs.length > 0 ? (
                                <div className="space-y-1">
                                  {docs.map((d: any) => (
                                    <div key={d.id} className="flex items-center gap-1.5 text-brand-600">
                                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span className="truncate max-w-[200px]" title={d.originalFileName}>
                                        {d.originalFileName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : field.proofRequired ? (
                                <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Mandatory proof missing
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Optional proof</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
};
