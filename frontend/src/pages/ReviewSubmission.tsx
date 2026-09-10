import React, { useState, useEffect } from 'react';
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
  Mail,
  ExternalLink,
  Image as ImageIcon,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);
  const [driveExcelUrl, setDriveExcelUrl] = useState<string | null>(null);

  useEffect(() => {
    onRefreshSubmission();
  }, []);

  const toggleCollapse = (code: string) => {
    setCollapsedSections((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Map values strictly from current department's submission (ZERO fallback to other departments)
  const valueMap = new Map<string, any>();
  const user = api.getLocalUser();
  const deptKey = api.getDeptKey(user?.organizationName);
  const subsStr = localStorage.getItem('attribute3_submissions');
  const subs = subsStr ? JSON.parse(subsStr) : {};
  const targetSub = subs[deptKey] || (submission?.id && subs[submission.id]) || submission;
  const valuesSource = targetSub?.values || [];

  for (const v of valuesSource) {
    if (!v) continue;
    const fCode = v.field?.code || v.fieldCode;
    const yCode = v.year?.code || v.yearCode;
    if (fCode && yCode) {
      valueMap.set(`${fCode}_${yCode}`, v);
    }
  }

  // Map docs strictly from current department's submission
  const docMap = new Map<string, any[]>();
  const activeDocs = targetSub?.documents || [];
  for (const d of activeDocs) {
    const fCode = d.field?.code || d.fieldCode;
    if (!fCode) continue;
    const list = docMap.get(fCode) || [];
    list.push(d);
    docMap.set(fCode, list);
  }

  const overall = progress?.overallPercentage ?? 0;

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.submitForReview(submission?.id);
      setSubmitSuccess(true);
      if (res.driveExcelUrl) {
        setDriveExcelUrl(res.driveExcelUrl);
      }
      if (res.mailtoUrl) {
        setMailtoUrl(res.mailtoUrl);
      }
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Final Review
              </span>
              <span className="text-slate-300">•</span>
              <StatusBadge status={submission?.status || 'DRAFT'} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Resource Survey: Comprehensive Review
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review and verify all institutional metrics and attached evidence across 2023–24, 2024–25, and 2025–26.
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



        {/* Submit Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap">
          {submitError && (
            <span className="text-rose-600 text-xs font-semibold mr-auto bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              {submitError}
            </span>
          )}
          {submitSuccess && (
            <div className="mr-auto flex items-center gap-2 flex-wrap">
              <span className="text-emerald-700 text-xs font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Submitted & Excel Downloaded!
              </span>
              {driveExcelUrl && (
                <a
                  href={driveExcelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Excel in Google Drive</span>
                </a>
              )}
              {mailtoUrl && (
                <a
                  href={mailtoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open in Gmail (Direct Send)</span>
                </a>
              )}
            </div>
          )}

          <Button
            onClick={handleFinalSubmit}
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Submit
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
            <div key={sec.code} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Accordion Header */}
              <div
                onClick={() => toggleCollapse(sec.code)}
                className="flex items-center justify-between p-4 sm:p-5 bg-slate-50/50 hover:bg-slate-100/60 cursor-pointer transition-colors border-b border-slate-100"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Section {sec.code}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-500">{sec.fields?.length} Indicators</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-0.5">{sec.title}</h3>
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
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 px-2.5 py-1 hover:bg-brand-50 rounded-lg transition-colors"
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
                        <th className="py-2.5 px-3 w-20 tabular-nums">Sr. No.</th>
                        <th className="py-2.5 px-3 min-w-[220px]">Facility / Resource</th>
                        <th className="py-2.5 px-3 text-center w-28 tabular-nums">2023–24</th>
                        <th className="py-2.5 px-3 text-center w-28 tabular-nums">2024–25</th>
                        <th className="py-2.5 px-3 text-center w-28 tabular-nums">2025–26</th>
                        <th className="py-2.5 px-3 min-w-[220px]">Attached Proofs & Photos</th>
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
                          if (v.isNotApplicable) {
                            return (
                              <span className="tabular-nums font-semibold text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                                N/A
                              </span>
                            );
                          }

                          if (field.fieldType === 'CURRENCY') {
                            return (
                              <span className="tabular-nums font-medium">
                                {v.numericValue !== null && v.numericValue !== undefined
                                  ? `₹ ${Number(v.numericValue).toLocaleString('en-IN')}`
                                  : '—'}
                              </span>
                            );
                          }
                          if (field.fieldType === 'PERCENTAGE') {
                            return (
                              <span className="tabular-nums font-medium">
                                {v.numericValue !== null && v.numericValue !== undefined
                                  ? `${Number(v.numericValue).toFixed(2)}%`
                                  : '—'}
                              </span>
                            );
                          }
                          if (field.fieldType === 'RATIO') {
                            return <span className="tabular-nums font-medium">{v.textValue || '—'}</span>;
                          }
                          if (field.fieldType === 'BOOLEAN') {
                            const isYes = v.textValue === 'Yes' || v.numericValue === 1;
                            return (
                              <span
                                className={`font-semibold text-xs px-2 py-0.5 rounded ${
                                  isYes
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isYes ? 'Yes' : 'No'}
                              </span>
                            );
                          }
                          if (field.fieldType === 'NUMBER' || field.fieldType === 'DECIMAL') {
                            return <span className="tabular-nums">{v.numericValue ?? '—'}</span>;
                          }
                          return <span>{v.textValue || '—'}</span>;
                        };

                        return (
                          <tr key={field.code} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 tabular-nums font-semibold text-slate-600">
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
                                <div className="flex flex-wrap gap-2 items-center">
                                  {docs.map((d: any, dIdx: number) => {
                                    const isPhoto =
                                      d.mimeType?.startsWith('image/') ||
                                      d.dataUrl?.startsWith('data:image/') ||
                                      /\.(jpg|jpeg|png|webp)$/i.test(d.originalFileName || '');

                                    return (
                                      <div
                                        key={d.id || dIdx}
                                        onClick={() => {
                                          const target = d.hyperlink || d.dataUrl || d.fileUrl;
                                          if (target && target !== '#') {
                                            window.open(target, '_blank');
                                          }
                                        }}
                                        className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-[11px] cursor-pointer transition-colors"
                                        title="Click to open full view"
                                      >
                                        {isPhoto && d.dataUrl ? (
                                          <img
                                            src={d.dataUrl}
                                            alt="Proof"
                                            className="w-5 h-5 object-cover rounded flex-shrink-0"
                                          />
                                        ) : d.hyperlink ? (
                                          <ExternalLink className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                                        ) : (
                                          <FileText className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                        )}
                                        <span className="truncate max-w-[110px] font-medium text-slate-700">
                                          {d.originalFileName || d.fileName}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No proof attached</span>
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
