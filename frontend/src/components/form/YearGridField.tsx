import React, { useState } from 'react';
import { HelpCircle, Upload, CheckCircle2, AlertTriangle, MessageSquare, Ban, ChevronDown, ChevronUp } from 'lucide-react';
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
  values: Record<string, {
    isNotApplicable?: boolean;
    numericValue?: number | null;
    textValue?: string | null;
    ratioNumerator?: number | null;
    ratioDenominator?: number | null;
    remarks?: string | null;
  }>;
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
  const fieldDocs = documents.filter((d) => d.fieldCode === field.code);
  const hasProof = fieldDocs.length > 0;
  const isProofMissing = field.proofRequired && !hasProof;

  // Format currency display
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '';
    return val.toLocaleString('en-IN');
  };

  const varianceWarning = null;

  // Helper to toggle Not Applicable for all years
  const toggleAllNA = () => {
    const isCurrentlyNA = years.every((y) => values[y.code]?.isNotApplicable);
    const newNA = !isCurrentlyNA;
    years.forEach((y) => {
      onChange(y.code, field.code, {
        isNotApplicable: newNA,
        textValue: newNA ? '-----' : null,
        numericValue: newNA ? null : null,
      });
    });
  };

  const isAllNA = years.every((y) => values[y.code]?.isNotApplicable);

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-all p-4 shadow-sm">
      {/* Header & Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-start gap-2.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
            {field.code}
          </span>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-800">{field.label}</span>
              {field.required && <span className="text-rose-500 font-bold">*</span>}
              {field.description && (
                <div className="relative group inline-block">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-20 w-64 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg">
                    {field.description}
                  </div>
                </div>
              )}
            </div>

            {field.unit && (
              <span className="text-[11px] text-slate-400">Unit: {field.unit}</span>
            )}
          </div>
        </div>

        {/* Action Pills: Proofs & Remarks & NA Toggle */}
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          {/* Not Applicable button */}
          <button
            type="button"
            onClick={toggleAllNA}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              isAllNA
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Mark facility as Not Applicable (e.g. Non-residential / No hostel)"
          >
            <Ban className="w-3 h-3" />
            {isAllNA ? 'Marked N/A' : 'Set N/A'}
          </button>

          {/* Proof upload button */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              hasProof
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : isProofMissing
                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 animate-pulse'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {hasProof ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{fieldDocs.length} Proof{fieldDocs.length > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>{field.proofRequired ? 'Proof Required' : 'Add Proof'}</span>
              </>
            )}
          </button>

          {/* Remarks toggle */}
          {field.remarksAllowed && (
            <button
              type="button"
              onClick={() => setShowRemarks(!showRemarks)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              title="Add or view remarks"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>


      {/* Year-Wise Grid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {years.map((year) => {
          const val = values[year.code] || {};
          const isNA = val.isNotApplicable ?? false;

          return (
            <div
              key={year.code}
              className={`p-2.5 rounded-md border ${
                isNA ? 'bg-slate-100 border-slate-200 opacity-65' : 'bg-slate-50/50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-700 font-mono">{year.code}</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNA}
                    onChange={(e) => {
                      const newNA = e.target.checked;
                      onChange(year.code, field.code, {
                        isNotApplicable: newNA,
                        textValue: newNA ? '-----' : null,
                        numericValue: newNA ? null : null,
                      });
                    }}
                    className="w-3 h-3 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-[10px] font-semibold uppercase text-slate-500">N/A</span>
                </label>
              </div>

              {/* Render appropriate input */}
              {isNA ? (
                <div className="py-2 text-center text-xs font-mono text-slate-400 font-medium tracking-widest bg-white rounded border border-dashed border-slate-300">
                  -----
                </div>
              ) : field.fieldType === 'NUMBER' || field.fieldType === 'DECIMAL' ? (
                <div className="relative">
                  <input
                    type="number"
                    step={field.fieldType === 'DECIMAL' ? '0.01' : '1'}
                    min="0"
                    placeholder="Enter value"
                    value={val.numericValue !== null && val.numericValue !== undefined ? val.numericValue : ''}
                    onChange={(e) => {
                      const num = e.target.value === '' ? null : parseFloat(e.target.value);
                      onChange(year.code, field.code, {
                        numericValue: num,
                        textValue: e.target.value,
                        isNotApplicable: false,
                      });
                    }}
                    className="table-cell-input text-right font-mono text-base"
                  />
                  {field.unit && (
                    <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 pointer-events-none">
                      {field.unit.split(' ')[0]}
                    </span>
                  )}
                </div>
              ) : field.fieldType === 'CURRENCY' ? (
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-semibold pointer-events-none">
                    ₹
                  </span>
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
                    className="table-cell-input pl-6 text-right font-mono font-medium text-base text-slate-800"
                  />
                </div>
              ) : field.fieldType === 'PERCENTAGE' ? (
                <div className="relative">
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
                    className="table-cell-input pr-7 text-right font-mono text-base"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-500 font-bold pointer-events-none">
                    %
                  </span>
                </div>
              ) : field.fieldType === 'RATIO' ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div>
                      <label className="text-slate-400 block text-[10px]">Students</label>
                      <input
                        type="number"
                        placeholder="Enrolled"
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
                        className="table-cell-input text-xs font-mono py-1 px-2"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">Computers</label>
                      <input
                        type="number"
                        placeholder="Available"
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
                        className="table-cell-input text-xs font-mono py-1 px-2"
                      />
                    </div>
                  </div>
                  {val.textValue && (
                    <div className="text-[11px] font-mono text-center font-semibold text-brand-700 bg-brand-50 py-0.5 rounded border border-brand-200">
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
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                      val.textValue === 'Yes'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                      val.textValue === 'No'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    No
                  </button>
                </div>
              ) : field.fieldType === 'MULTI_SELECT' ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Enter facilities..."
                    value={val.textValue || ''}
                    onChange={(e) =>
                      onChange(year.code, field.code, {
                        textValue: e.target.value,
                        isNotApplicable: false,
                      })
                    }
                    className="table-cell-input text-sm"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Virtual Labs', 'AR/VR', 'Media Center'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = val.textValue ? val.textValue.split(', ') : [];
                          const updated = current.includes(tag)
                            ? current.filter((t: string) => t !== tag)
                            : [...current, tag];
                          onChange(year.code, field.code, {
                            textValue: updated.join(', '),
                            isNotApplicable: false,
                          });
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          (val.textValue || '').includes(tag)
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
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
                  className="table-cell-input text-xs"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Remarks / Explanatory Notes Drawer */}
      {showRemarks && field.remarksAllowed && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Remarks / Contextual Notes</span>
            <button
              type="button"
              onClick={() => setShowRemarks(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            rows={2}
            placeholder="Add any specific context, operational notes, or explanations for the reviewer..."
            value={years.map((y) => values[y.code]?.remarks).filter(Boolean)[0] || ''}
            onChange={(e) => {
              const text = e.target.value;
              years.forEach((y) => {
                onChange(y.code, field.code, { remarks: text });
              });
            }}
            className="w-full text-xs p-2 rounded border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          />
        </div>
      )}

      {/* Proof upload modal */}
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
