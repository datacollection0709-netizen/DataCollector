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
} from 'lucide-react';
import { YearGridField } from '../components/form/YearGridField';
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
  const formDataRef = useRef<Record<string, any>>({});
  const isDirtyRef = useRef<boolean>(false);
  const refreshTimerRef = useRef<any>(null);

  // Initialize form data from submission values
  const initFormData = useCallback(() => {
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
  }, [submission?.values]);

  useEffect(() => {
    initFormData();
  }, [submission?.id, sectionCode, initFormData]);

  // Flush save on unmount or before switching sections
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
  }, [submission?.id, onRefreshSubmission]);

  // Immediate save helper
  const saveCurrentDraft = useCallback(
    async (dataToSave = formDataRef.current) => {
      if (!submission?.id) return;
      setIsSaving(true);
      try {
        const payloadValues = Object.values(dataToSave);
        if (payloadValues.length > 0) {
          const res = await api.saveDraft(submission.id, payloadValues);
          if (res.success) {
            setLastSavedTime(
              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            );
            isDirtyRef.current = false;
            setIsDirty(false);
            onRefreshSubmission();
          }
        }
      } catch (err: any) {
        console.error('Save error:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [submission?.id, onRefreshSubmission]
  );

  // Handle value change with instant saving
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

    // Immediately persist to localStorage so data can NEVER be lost
    if (submission?.id) {
      api.saveDraft(submission.id, Object.values(nextData));
    }

    // Debounce the parent refresh to keep typing smooth
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      onRefreshSubmission();
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      isDirtyRef.current = false;
      setIsDirty(false);
    }, 400);
  };

  const sectionCodes = ['3.1', '3.2', '3.3', '3.4', '3.5'];
  const currentIndex = sectionCodes.indexOf(sectionCode);
  const prevCode = currentIndex > 0 ? sectionCodes[currentIndex - 1] : null;
  const nextCode = currentIndex < sectionCodes.length - 1 ? sectionCodes[currentIndex + 1] : null;

  const handleNext = async () => {
    await saveCurrentDraft(formData);
    if (nextCode) {
      onNavigateSection(nextCode);
    } else {
      onNavigateReview();
    }
  };

  const handlePrev = async () => {
    await saveCurrentDraft(formData);
    if (prevCode) {
      onNavigateSection(prevCode);
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
      if (field.fieldType === 'RATIO') return !!(v.ratioNumerator && v.ratioDenominator);
      if (field.fieldType === 'NUMBER' || field.fieldType === 'DECIMAL' || field.fieldType === 'CURRENCY' || field.fieldType === 'PERCENTAGE') {
        return v.numericValue !== null && v.numericValue !== undefined && !isNaN(v.numericValue);
      }
      return !!(v.textValue && String(v.textValue).trim() !== '');
    });
  };

  const completedFieldsCount = (section.fields || []).filter(isFieldComplete).length;
  const sectionPercentage = totalFields > 0 ? Math.round((completedFieldsCount / totalFields) * 100) : 0;
  const pendingCount = totalFields - completedFieldsCount;

  // Filter fields if user wants to see pending only
  const displayedFields = filterPendingOnly
    ? (section.fields || []).filter((f: any) => !isFieldComplete(f))
    : (section.fields || []);

  return (
    <div className="space-y-6">
      {/* Fresh, Airy Section Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-mono font-bold text-base flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0">
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
              </div>
              {section.description && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                  {section.description}
                </p>
              )}
            </div>
          </div>

          {/* Autosave Status Indicator */}
          <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0">
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                  <span className="text-brand-700 font-semibold">Saving changes...</span>
                </>
              ) : isDirty ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-700">Unsaved edits</span>
                </>
              ) : lastSavedTime ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-600">Saved ({lastSavedTime})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cloud Ready</span>
                </>
              )}
            </div>

            {nextCode ? (
              <Button variant="primary" size="sm" onClick={handleNext} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Next
              </Button>
            ) : (
              <Button variant="success" size="sm" onClick={handleNext} rightIcon={<CheckSquare className="w-3.5 h-3.5" />}>
                Review & Submit
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar & Smart Filter Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          {/* Fast Toggle: All vs Pending Only */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setFilterPendingOnly(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                !filterPendingOnly
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Questions ({totalFields})
            </button>
            <button
              type="button"
              onClick={() => setFilterPendingOnly(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                filterPendingOnly
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Pending Only</span>
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

      {/* Completion Banner if all indicators in this section are answered */}
      {sectionPercentage === 100 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              ✓
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-950">
                All {totalFields} indicators in Section {section.code} are answered!
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Ready to proceed to the next attribute section.
              </p>
            </div>
          </div>
          {nextCode && (
            <Button variant="success" size="sm" onClick={handleNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Continue to {nextCode}
            </Button>
          )}
        </div>
      )}

      {/* Fields List */}
      <div className="space-y-4">
        {displayedFields.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Pending Indicators!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Every question in this section has been answered. You can toggle "All Questions" to review or proceed to the next section.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFilterPendingOnly(false)}
                className="text-xs text-brand-600 font-semibold hover:underline"
              >
                View all indicators
              </button>
            </div>
          </div>
        ) : (
          displayedFields.map((field: any) => {
            const fieldValues: Record<string, any> = {};
            years.forEach((y) => {
              fieldValues[y.code] = formData[`${field.code}_${y.code}`] || {};
            });

            return (
              <YearGridField
                key={field.code}
                field={field}
                years={years}
                values={fieldValues}
                onChange={handleFieldChange}
                submissionId={submission?.id}
                documents={submission?.documents || []}
                onDocumentChange={onRefreshSubmission}
              />
            );
          })
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        {prevCode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Previous ({prevCode})
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {nextCode ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Continue to {nextCode}
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              onClick={onNavigateReview}
              rightIcon={<CheckSquare className="w-3.5 h-3.5" />}
            >
              Final Review & Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
