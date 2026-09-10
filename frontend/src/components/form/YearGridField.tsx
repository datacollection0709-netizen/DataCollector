import React, { useState } from 'react';
import {
  HelpCircle,
  Upload,
  CheckCircle2,
  MessageSquare,
  Ban,
  ChevronUp,
  FileText,
  Paperclip,
  Sparkles,
} from 'lucide-react';
import { DocumentUploadModal } from './DocumentUploadModal';

interface YearGridFieldProps {
  field: {
    id: string;
    code: string;
    label: string;
    description?: string;
    fieldType: string;
    unit?: string;
    required: boolean;
    proofRequired: boolean;
    remarksAllowed: boolean;
    validationRules?: any;
  };
  years: { id: string; code: string }[];
  values: Record<
    string,
    {
      isNotApplicable?: boolean;
      numericValue?: number | null;
      textValue?: string | null;
      ratioNumerator?: number | null;
      ratioDenominator?: number | null;
      remarks?: string | null;
    }
  >;
  onChange: (yearCode: string, fieldCode: string, updates: any) => void;
  submissionId: string;
  documents: any[];
  onDocumentChange: () => void;
}

export const YearGridField: React.FC<YearGridFieldProps> = ({
  field,
  years,
  values,
  onChange,
  submissionId,
  documents,
  onDocumentChange,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);

  // Documents attached to this field
  const fieldDocs = documents.filter((d) => (d.fieldCode || d.field?.code) === field.code);
  const hasProof = fieldDocs.length > 0;

  // Format currency display
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '';
    return Number(val).toLocaleString('en-IN');
  };

  // Check if all years are filled or N/A
  const isAllNA = years.every((y) => values[y.code]?.isNotApplicable);
  const isFullyAnswered = years.every((y) => {
    const v = values[y.code];
    if (!v) return false;
    if (v.isNotApplicable) return true;
    if (field.fieldType === 'BOOLEAN') return v.textValue === 'Yes' || v.textValue === 'No';
    if (field.fieldType === 'RATIO') return !!(v.ratioNumerator && v.ratioDenominator);
    if (field.fieldType === 'NUMBER' || field.fieldType === 'DECIMAL' || field.fieldType === 'CURRENCY' || field.fieldType === 'PERCENTAGE') {
      return v.numericValue !== null && v.numericValue !== undefined && !isNaN(v.numericValue);
    }
    return !!(v.textValue && v.textValue.trim() !== '');
  });

  // Toggle all years to N/A or restore
  const toggleAllNA = () => {
    const nextNA = !isAllNA;
    years.forEach((y) => {
      onChange(y.code, field.code, {
        isNotApplicable: nextNA,
        textValue: nextNA ? 'N/A' : null,
        numericValue: null,
      });
    });
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-5 sm:p-6 bg-white shadow-sm hover:shadow-md ${
        isFullyAnswered
          ? 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/20 to-white'
          : isAllNA
          ? 'border-amber-200/70 bg-amber-50/10'
          : 'border-slate-200/80 hover:border-brand-300'
      }`}
    >
      {/* Top Row: Code Badge, Title, Unit, and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums bg-slate-100 text-slate-700 border border-slate-200 flex-shrink-0">
            {field.code}
          </span>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-slate-800 tracking-tight">
                {field.label}
              </h3>
              {field.unit && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {field.unit}
                </span>
              )}
              {isFullyAnswered && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Answered
                </span>
              )}
            </div>

            {field.description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {field.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls: N/A, Proofs, Remarks */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          {/* N/A Toggle Button */}
          <button
            type="button"
            onClick={toggleAllNA}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isAllNA
                ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200'
            }`}
            title="Mark this facility as Not Applicable"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>{isAllNA ? 'Marked N/A' : 'Set N/A'}</span>
          </button>

          {/* Document Proof Button */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              hasProof
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-sm'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {hasProof ? (
              <>
                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                <span>{fieldDocs.length} Proof{fieldDocs.length > 1 ? 's' : ''} Attached</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload File</span>
              </>
            )}
          </button>

          {/* Remarks Toggle */}
          {field.remarksAllowed && (
            <button
              type="button"
              onClick={() => setShowRemarks(!showRemarks)}
              className={`p-1.5 rounded-xl border transition-all ${
                showRemarks || years.some((y) => values[y.code]?.remarks)
                  ? 'bg-brand-50 text-brand-600 border-brand-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-transparent'
              }`}
              title="Add Contextual Notes / Remarks"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Year-Wise Modern Inputs Grid */}
      {isAllNA ? (
        <div className="py-4 px-4 rounded-xl bg-amber-50/50 border border-dashed border-amber-200 text-center text-amber-800 text-xs font-medium flex items-center justify-center gap-2">
          <Ban className="w-4 h-4 text-amber-600" />
          <span>This indicator is currently marked as <strong>Not Applicable</strong> for your institution. Click "Marked N/A" above to re-enable data entry.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {years.map((year) => {
            const val = values[year.code] || {};
            const isYearNA = val.isNotApplicable ?? false;

            return (
              <div
                key={year.code}
                className={`p-3.5 rounded-xl border transition-all ${
                  isYearNA
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-slate-50/60 hover:bg-white focus-within:bg-white border-slate-200 hover:border-slate-300 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10'
                }`}
              >
                {/* Year Card Header */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold tracking-wide text-slate-700 tabular-nums">
                    {year.code}
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-200/50 px-1.5 py-0.5 rounded transition-colors text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={isYearNA}
                      onChange={(e) => {
                        const next = e.target.checked;
                        onChange(year.code, field.code, {
                          isNotApplicable: next,
                          textValue: next ? 'N/A' : null,
                          numericValue: null,
                        });
                      }}
                      className="w-3 h-3 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                    />
                    <span>N/A</span>
                  </label>
                </div>

                {/* Input Renderers */}
                {isYearNA ? (
                  <div className="py-2.5 text-center text-xs text-slate-400 font-medium bg-white rounded-lg border border-dashed border-slate-200">
                    N/A
                  </div>
                ) : field.fieldType === 'NUMBER' || field.fieldType === 'DECIMAL' ? (
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:border-brand-500">
                    <input
                      type="number"
                      step={field.fieldType === 'DECIMAL' ? '0.01' : '1'}
                      min="0"
                      placeholder="0"
                      value={val.numericValue !== null && val.numericValue !== undefined ? val.numericValue : ''}
                      onChange={(e) => {
                        const num = e.target.value === '' ? null : parseFloat(e.target.value);
                        onChange(year.code, field.code, {
                          numericValue: num,
                          textValue: e.target.value,
                          isNotApplicable: false,
                        });
                      }}
                      className="w-full bg-transparent border-0 py-2 px-3 text-right font-sans tabular-nums text-sm sm:text-base font-semibold text-slate-900 focus:ring-0 outline-none placeholder:text-slate-300 placeholder:font-normal"
                    />
                    {field.unit && (
                      <div className="pr-3 pl-1 text-xs text-slate-400 select-none whitespace-nowrap">
                        {field.unit.split(' ')[0]}
                      </div>
                    )}
                  </div>
                ) : field.fieldType === 'CURRENCY' ? (
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:border-brand-500">
                    <div className="pl-3 pr-1 text-sm font-semibold text-slate-400 select-none">
                      ₹
                    </div>
                    <input
                      type="text"
                      placeholder="0"
                      value={formatCurrency(val.numericValue)}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        const num = clean === '' ? null : parseInt(clean, 10);
                        onChange(year.code, field.code, {
                          numericValue: num,
                          textValue: clean ? `₹ ${parseInt(clean, 10).toLocaleString('en-IN')}` : null,
                          isNotApplicable: false,
                        });
                      }}
                      className="w-full bg-transparent border-0 py-2 px-3 text-right font-sans tabular-nums text-sm sm:text-base font-semibold text-slate-900 focus:ring-0 outline-none placeholder:text-slate-300 placeholder:font-normal"
                    />
                  </div>
                ) : field.fieldType === 'PERCENTAGE' ? (
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:border-brand-500">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      value={val.numericValue !== null && val.numericValue !== undefined ? val.numericValue : ''}
                      onChange={(e) => {
                        const num = e.target.value === '' ? null : parseFloat(e.target.value);
                        onChange(year.code, field.code, {
                          numericValue: num,
                          textValue: num !== null ? `${num.toFixed(2)}%` : null,
                          isNotApplicable: false,
                        });
                      }}
                      className="w-full bg-transparent border-0 py-2 px-3 text-right font-sans tabular-nums text-sm sm:text-base font-semibold text-slate-900 focus:ring-0 outline-none placeholder:text-slate-300 placeholder:font-normal"
                    />
                    <div className="pr-3 pl-1 text-xs font-bold text-slate-400 select-none">
                      %
                    </div>
                  </div>
                ) : field.fieldType === 'RATIO' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white border border-slate-200 rounded-lg p-1.5 focus-within:border-brand-500">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold text-center">Students</span>
                        <input
                          type="number"
                          placeholder="Students"
                          value={val.ratioNumerator ?? ''}
                          onChange={(e) => {
                            const n = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            const denom = val.ratioDenominator;
                            let text = null;
                            if (n && denom) {
                              text = `1:${Math.round(n / denom)} (${n})`;
                            }
                            onChange(year.code, field.code, {
                              ratioNumerator: n,
                              textValue: text || val.textValue,
                              numericValue: n && denom ? Math.round(n / denom) : null,
                            });
                          }}
                          className="w-full text-center font-sans tabular-nums text-xs sm:text-sm font-semibold text-slate-900 border-0 p-0 focus:ring-0 outline-none"
                        />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-1.5 focus-within:border-brand-500">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold text-center">Computers</span>
                        <input
                          type="number"
                          placeholder="Computers"
                          value={val.ratioDenominator ?? ''}
                          onChange={(e) => {
                            const d = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            const num = val.ratioNumerator;
                            let text = null;
                            if (num && d) {
                              text = `1:${Math.round(num / d)} (${num})`;
                            }
                            onChange(year.code, field.code, {
                              ratioDenominator: d,
                              textValue: text || val.textValue,
                              numericValue: num && d ? Math.round(num / d) : null,
                            });
                          }}
                          className="w-full text-center font-sans tabular-nums text-xs sm:text-sm font-semibold text-slate-900 border-0 p-0 focus:ring-0 outline-none"
                        />
                      </div>
                    </div>
                    {val.textValue && (
                      <div className="text-[11px] font-sans tabular-nums text-center font-semibold text-brand-700 bg-brand-50/80 py-1 rounded-md border border-brand-200/50">
                        Ratio: {val.textValue}
                      </div>
                    )}
                  </div>
                ) : field.fieldType === 'BOOLEAN' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(year.code, field.code, {
                          textValue: 'Yes',
                          numericValue: 1,
                          isNotApplicable: false,
                        })
                      }
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        val.textValue === 'Yes'
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(year.code, field.code, {
                          textValue: 'No',
                          numericValue: 0,
                          isNotApplicable: false,
                        })
                      }
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        val.textValue === 'No'
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter details..."
                    value={val.textValue || ''}
                    onChange={(e) =>
                      onChange(year.code, field.code, {
                        textValue: e.target.value,
                        isNotApplicable: false,
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Remarks Drawer */}
      {showRemarks && field.remarksAllowed && (
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              Optional Auditor Notes & Explanations
            </span>
            <button
              type="button"
              onClick={() => setShowRemarks(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={2}
            placeholder="Add context or notes for the reviewer..."
            value={years.map((y) => values[y.code]?.remarks).filter(Boolean)[0] || ''}
            onChange={(e) => {
              const text = e.target.value;
              years.forEach((y) => {
                onChange(y.code, field.code, { remarks: text });
              });
            }}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-none placeholder:text-slate-400"
          />
        </div>
      )}

      {/* Proof Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        submissionId={submissionId}
        fieldCode={field.code}
        fieldLabel={field.label}
        documents={documents}
        onDocumentChange={onDocumentChange}
      />
    </div>
  );
};
