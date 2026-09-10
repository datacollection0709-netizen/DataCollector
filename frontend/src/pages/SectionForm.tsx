import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  CheckSquare,
  Sparkles,
  Filter,
  CheckCircle,
  Clock,
  Table,
  LayoutGrid,
  FileSpreadsheet,
  Upload,
  Ban,
  MessageSquare,
  Paperclip,
  Info,
  ExternalLink,
  Layers,
  Zap,
} from 'lucide-react';
import { YearGridField } from '../components/form/YearGridField';
import { DocumentUploadModal } from '../components/form/DocumentUploadModal';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';

interface SectionFormProps {
  sectionCode: string;
  attribute: any;
  years: any[];
  submission: any;
  progress: any;
  onRefreshSubmission: () => void;
  onNavigateSection: (code: string) => void;
  onNavigateReview: () => void;
}

export const SectionForm: React.FC<SectionFormProps> = ({
  sectionCode,
  attribute,
  years,
  submission,
  progress,
  onRefreshSubmission,
  onNavigateSection,
  onNavigateReview,
}) => {
  const section = attribute?.sections?.find((s: any) => s.code === sectionCode);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [filterPendingOnly, setFilterPendingOnly] = useState<boolean>(false);
  const [selectedUploadField, setSelectedUploadField] = useState<any | null>(null);
  const [activeRemarkField, setActiveRemarkField] = useState<string | null>(null);
  const [isPreFilling, setIsPreFilling] = useState(false);

  const formDataRef = useRef<Record<string, any>>({});
  const isDirtyRef = useRef<boolean>(false);
  const refreshTimerRef = useRef<any>(null);

  // Initialize form data on mount or when section changes
  useEffect(() => {
    if (submission?.values) {
      const initial: Record<string, any> = {};
      for (const val of submission.values) {
        const fCode = val.field?.code || val.fieldCode;
        const yCode = val.year?.code || val.yearCode;
        if (!fCode || !yCode) continue;
        const key = `${fCode}_${yCode}`;
        initial[key] = {
          fieldCode: fCode,
          yearCode: yCode,
          isNotApplicable: val.isNotApplicable,
          numericValue: val.numericValue,
          textValue: val.textValue,
          ratioNumerator: val.ratioNumerator,
          ratioDenominator: val.ratioDenominator,
          remarks: val.remarks,
        };
      }
      setFormData(initial);
      formDataRef.current = initial;
      isDirtyRef.current = false;
      setIsDirty(false);
    }
  }, [sectionCode, submission?.id]);

  // Flush save on unmount or section switch
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && submission?.id) {
        const payloadValues = Object.values(formDataRef.current);
        if (payloadValues.length > 0) {
          api.saveDraft(submission.id, payloadValues);
          onRefreshSubmission();
        }
      }
    };
  }, [sectionCode, submission?.id]);

  // Handle value change with instant synchronous saving
  const handleFieldChange = (yearCode: string, fieldCode: string, updates: any) => {
    const key = `${fieldCode}_${yearCode}`;
    const prev = formDataRef.current[key] || { fieldCode, yearCode };
    const nextVal = { ...prev, ...updates };

    const nextData = { ...formDataRef.current, [key]: nextVal };

    // Section 3.2 Percentage auto-computation
    if (fieldCode === '3.2.1a' || fieldCode === '3.2.2') {
      const expKey = `3.2.1a_${yearCode}`;
      const totKey = `3.2.2_${yearCode}`;
      const expVal = fieldCode === '3.2.1a' ? updates.numericValue : nextData[expKey]?.numericValue;
      const totVal = fieldCode === '3.2.2' ? updates.numericValue : nextData[totKey]?.numericValue;

      if (typeof expVal === 'number' && typeof totVal === 'number' && totVal > 0) {
        const pct = Number(((expVal / totVal) * 100).toFixed(2));
        const pctKey = `3.2.1_${yearCode}`;
        nextData[pctKey] = {
          ...(nextData[pctKey] || { fieldCode: '3.2.1', yearCode }),
          numericValue: pct,
          textValue: `${pct}%`,
          isNotApplicable: false,
        };
      }
    }

    formDataRef.current = nextData;
    isDirtyRef.current = true;
    setFormData(nextData);
    setIsDirty(true);

    // Persist synchronously to localStorage
    if (submission?.id) {
      api.saveDraft(submission.id, Object.values(nextData));
    }

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      isDirtyRef.current = false;
      setIsDirty(false);
    }, 200);
  };

  // Toggle All NA for a field
  const handleToggleNA = (field: any) => {
    const isCurrentlyNA = years.every((y) => formDataRef.current[`${field.code}_${y.code}`]?.isNotApplicable);
    const nextNA = !isCurrentlyNA;

    const nextData = { ...formDataRef.current };
    years.forEach((y) => {
      const key = `${field.code}_${y.code}`;
      nextData[key] = {
        ...(nextData[key] || { fieldCode: field.code, yearCode: y.code }),
        isNotApplicable: nextNA,
        textValue: nextNA ? 'N/A' : null,
        numericValue: null,
      };
    });

    formDataRef.current = nextData;
    setFormData(nextData);
    if (submission?.id) {
      api.saveDraft(submission.id, Object.values(nextData));
      onRefreshSubmission();
    }
  };

  // 1-Click Auto-Fill for ALL 5 Sections
  const handleAutoFillAllSections = async () => {
    if (!submission?.id) return;
    setIsPreFilling(true);
    try {
      await api.prefillAllSections(submission.id);
      onRefreshSubmission();
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (e: any) {
      alert('Pre-fill error: ' + e.message);
    } finally {
      setIsPreFilling(false);
    }
  };

  const sectionCodes = ['3.1', '3.2', '3.3', '3.4', '3.5'];
  const currentIndex = sectionCodes.indexOf(sectionCode);
  const prevCode = currentIndex > 0 ? sectionCodes[currentIndex - 1] : null;
  const nextCode = currentIndex < sectionCodes.length - 1 ? sectionCodes[currentIndex + 1] : null;

  const handleNext = async () => {
    if (submission?.id) {
      await api.saveDraft(submission.id, Object.values(formDataRef.current));
      onRefreshSubmission();
    }
    if (nextCode) {
      onNavigateSection(nextCode);
    } else {
      onNavigateReview();
    }
  };

  const handlePrev = async () => {
    if (submission?.id) {
      await api.saveDraft(submission.id, Object.values(formDataRef.current));
      onRefreshSubmission();
    }
    if (prevCode) {
      onNavigateSection(prevCode);
    }
  };

  const handleQuickDownloadExcel = async () => {
    try {
      if (submission?.id) {
        await api.saveDraft(submission.id, Object.values(formDataRef.current));
        onRefreshSubmission();
      }
      await api.downloadExcel(submission?.id);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    }
  };

  if (!section) {
    return <div className="p-8 text-center text-slate-500">Section not found.</div>;
  }

  // Calculate section indicators completion
  const totalFields = section.fields?.length || 0;
  const isFieldComplete = (field: any) => {
    return years.every((y) => {
      const v = formData[`${field.code}_${y.code}`];
      if (!v) return false;
      if (v.isNotApplicable) return true;
      if (field.fieldType === 'BOOLEAN') return v.textValue === 'Yes' || v.textValue === 'No';
      if (field.fieldType === 'RATIO') return !!(v.ratioNumerator && v.ratioDenominator) || !!v.textValue;
      if (
        field.fieldType === 'NUMBER' ||
        field.fieldType === 'DECIMAL' ||
        field.fieldType === 'CURRENCY' ||
        field.fieldType === 'PERCENTAGE'
      ) {
        return v.numericValue !== null && v.numericValue !== undefined && !isNaN(v.numericValue);
      }
      return !!(v.textValue && String(v.textValue).trim() !== '');
    });
  };

  const completedFieldsCount = (section.fields || []).filter(isFieldComplete).length;
  const sectionPercentage = totalFields > 0 ? Math.round((completedFieldsCount / totalFields) * 100) : 0;
  const pendingCount = totalFields - completedFieldsCount;

  const displayedFields = filterPendingOnly
    ? (section.fields || []).filter((f: any) => !isFieldComplete(f))
    : (section.fields || []);

  const documents = submission?.documents || [];

  return (
    <div className="space-y-5">
      {/* Top Horizontal Section Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {sectionCodes.map((code) => {
          const isActive = code === sectionCode;
          const secMeta = attribute?.sections?.find((s: any) => s.code === code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => onNavigateSection(code)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-2xs ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 ring-2 ring-brand-500/20'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <span className={`font-mono font-bold ${isActive ? 'text-white' : 'text-brand-700'}`}>
                {code}
              </span>
              <span className="hidden sm:inline">{secMeta?.title?.split(' ')[0]}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onNavigateReview}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
        >
          <span>Review & Submit</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Section Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white font-mono font-bold text-base flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0">
              {section.code}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {section.title}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60">
                  {completedFieldsCount} of {totalFields} answered
                </span>
                {lastSavedTime && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Auto-saved {lastSavedTime}
                  </span>
                )}
              </div>
              {section.description && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                  {section.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap justify-end">
            {/* 1-Click Auto-Fill ALL Sections */}
            <button
              type="button"
              onClick={handleAutoFillAllSections}
              disabled={isPreFilling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-sm disabled:opacity-50"
              title="Instantly pre-fill all 5 sections with realistic NAAC metrics & photos"
            >
              {isPreFilling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
              )}
              <span>{isPreFilling ? 'Populating...' : '⚡ 1-Click Auto-Fill (All Sections)'}</span>
            </button>


            {nextCode ? (
              <Button variant="primary" size="sm" onClick={handleNext} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Next Section
              </Button>
            ) : (
              <Button variant="success" size="sm" onClick={handleNext} rightIcon={<CheckSquare className="w-3.5 h-3.5" />}>
                Review & Submit
              </Button>
            )}
          </div>
        </div>

        {/* View Switcher, Progress Bar & Filters */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
              <span className="text-slate-600">Section Completion</span>
              <span className="text-slate-900 font-bold font-mono">{sectionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${sectionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">


            {/* Filter Toggle: All vs Pending */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterPendingOnly(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  !filterPendingOnly ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({totalFields})
              </button>
              <button
                type="button"
                onClick={() => setFilterPendingOnly(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  filterPendingOnly ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Pending</span>
                {pendingCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold font-mono">
                    {pendingCount}
                  </span>
                ) : (
                  <span className="text-emerald-600 text-xs">✓</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: EFFORTLESS SPREADSHEET SHEET VIEW (Desktop) */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 w-16 text-center font-mono">Code</th>
                  <th className="py-3 px-4 min-w-[240px]">Facility / Indicator</th>
                  {years.map((y) => (
                    <th key={y.code} className="py-3 px-3 text-center w-36 font-mono font-bold text-slate-700">
                      {y.code}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center w-48">Proofs, Photos & Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedFields.length === 0 ? (
                  <tr>
                    <td colSpan={years.length + 3} className="py-12 text-center text-slate-400">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      All indicators in this section are answered!
                    </td>
                  </tr>
                ) : (
                  displayedFields.map((field: any, rIdx: number) => {
                    const isAllNA = years.every((y) => formData[`${field.code}_${y.code}`]?.isNotApplicable);
                    const fieldDocs = documents.filter((d: any) => (d.fieldCode || d.field?.code) === field.code);
                    const photoDocs = fieldDocs.filter((d: any) =>
                      d.mimeType?.startsWith('image/') || d.dataUrl?.startsWith('data:image/') || /\.(jpg|jpeg|png|webp)$/i.test(d.originalFileName || '')
                    );
                    const hasProof = fieldDocs.length > 0;
                    const isTextField = field.fieldType === 'TEXT' || field.fieldType === 'MULTI_SELECT';

                    return (
                      <tr
                        key={field.code}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        {/* Field Code */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-brand-700">
                          {field.code}
                        </td>

                        {/* Label & Description */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 text-xs sm:text-sm">{field.label}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {field.unit && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                {field.unit}
                              </span>
                            )}
                            {field.description && (
                              <span className="text-[10px] text-slate-400 truncate max-w-xs" title={field.description}>
                                {field.description}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3 Year Input Cells */}
                        {years.map((year) => {
                          const val = formData[`${field.code}_${year.code}`] || {};
                          const isNA = val.isNotApplicable ?? false;

                          return (
                            <td key={year.code} className="py-2.5 px-2 text-center">
                              {isNA ? (
                                <div className="py-1.5 px-2 rounded-lg bg-amber-50 text-amber-700 font-mono font-semibold text-xs border border-amber-200">
                                  N/A
                                </div>
                              ) : field.fieldType === 'BOOLEAN' ? (
                                <div className="flex justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleFieldChange(year.code, field.code, {
                                        textValue: 'Yes',
                                        numericValue: 1,
                                        isNotApplicable: false,
                                      })
                                    }
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                      val.textValue === 'Yes'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleFieldChange(year.code, field.code, {
                                        textValue: 'No',
                                        numericValue: 0,
                                        isNotApplicable: false,
                                      })
                                    }
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                      val.textValue === 'No'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : isTextField ? (
                                /* TEXT INPUT (Section 3.3 & 3.5): PRESERVE STRINGS CLEANLY! */
                                <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-brand-500 rounded-lg overflow-hidden transition-all shadow-2xs">
                                  <input
                                    type="text"
                                    placeholder="Enter details..."
                                    value={val.textValue || ''}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      handleFieldChange(year.code, field.code, {
                                        textValue: raw,
                                        numericValue: null,
                                        isNotApplicable: false,
                                      });
                                    }}
                                    className="w-full py-1.5 px-2.5 text-left text-xs text-slate-900 border-0 outline-none focus:ring-0"
                                  />
                                </div>
                              ) : (
                                /* NUMERIC / CURRENCY / PERCENTAGE INPUT */
                                <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-brand-500 rounded-lg overflow-hidden transition-all shadow-2xs">
                                  {field.fieldType === 'CURRENCY' && (
                                    <span className="pl-2 text-slate-400 font-bold text-xs select-none">₹</span>
                                  )}
                                  <input
                                    type="text"
                                    placeholder="0"
                                    value={
                                      val.numericValue !== null && val.numericValue !== undefined
                                        ? val.numericValue
                                        : val.textValue || ''
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const num = raw === '' ? null : parseFloat(raw.replace(/[^0-9.]/g, ''));
                                      handleFieldChange(year.code, field.code, {
                                        numericValue: isNaN(num as number) ? null : num,
                                        textValue: raw,
                                        isNotApplicable: false,
                                      });
                                    }}
                                    className="w-full py-1.5 px-2 text-right font-mono text-xs font-semibold text-slate-900 border-0 outline-none focus:ring-0"
                                  />
                                  {field.fieldType === 'PERCENTAGE' && (
                                    <span className="pr-2 text-slate-400 font-bold text-xs select-none">%</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Actions, Proof Photos & Hyperlinks */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Unified Clean Evidence Pill */}
                            <button
                              type="button"
                              onClick={() => setSelectedUploadField(field)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                hasProof
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                                  : 'bg-slate-50 text-slate-500 border border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-700'
                              }`}
                              title={hasProof ? `${fieldDocs.length} proof(s) attached. Click to manage/open.` : 'Attach photos, PDFs, or Drive links'}
                            >
                              {photoDocs.length > 0 ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>📷 {photoDocs.length} Photo{photoDocs.length > 1 ? 's' : ''}</span>
                                </>
                              ) : fieldDocs.some((d: any) => d.hyperlink) ? (
                                <>
                                  <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
                                  <span>Drive Link</span>
                                </>
                              ) : hasProof ? (
                                <>
                                  <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{fieldDocs.length} Proof{fieldDocs.length > 1 ? 's' : ''}</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3 text-slate-400" />
                                  <span>+ Proof / Link</span>
                                </>
                              )}
                            </button>

                            {/* Minimal Clean N/A Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleNA(field)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border ${
                                isAllNA
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
                                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:border-slate-300'
                              }`}
                              title="Toggle Not Applicable for this facility"
                            >
                              {isAllNA ? 'N/A' : 'Set N/A'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VIEW MODE 2: CARD VIEW (Mobile) */}
      <div className="block lg:hidden">
        <div className="space-y-4">
          {displayedFields.map((field: any) => {
            const fieldValues: Record<string, any> = {};
            years.forEach((y) => {
              fieldValues[y.code] = formData[`${field.code}_${y.code}`] || {};
            });

            return (
              <YearGridField
                key={field.id}
                field={field}
                years={years}
                values={fieldValues}
                onChange={handleFieldChange}
                submissionId={submission?.id}
                documents={documents}
                onDocumentChange={onRefreshSubmission}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {prevCode ? (
          <Button variant="outline" size="sm" onClick={handlePrev} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Previous: Section {prevCode}
          </Button>
        ) : (
          <div />
        )}

        {nextCode ? (
          <Button variant="primary" size="sm" onClick={handleNext} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Next: Section {nextCode}
          </Button>
        ) : (
          <Button variant="success" size="sm" onClick={handleNext} rightIcon={<CheckSquare className="w-3.5 h-3.5" />}>
            Proceed to Final Review & Submit
          </Button>
        )}
      </div>

      {/* Modal for Photo Proofs & Hyperlinks */}
      {selectedUploadField && (
        <DocumentUploadModal
          isOpen={true}
          onClose={() => setSelectedUploadField(null)}
          submissionId={submission?.id}
          fieldCode={selectedUploadField.code}
          fieldLabel={selectedUploadField.label}
          documents={documents}
          onDocumentChange={onRefreshSubmission}
        />
      )}
    </div>
  );
};
