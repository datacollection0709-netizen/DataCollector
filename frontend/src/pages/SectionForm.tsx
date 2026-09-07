import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  CheckSquare,
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
  // Find current section
  const section = attribute?.sections?.find((s: any) => s.code === sectionCode);

  // Local state for all field values: key = `${fieldCode}_${yearCode}`
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // Initialize form data from submission values
  useEffect(() => {
    if (submission?.values) {
      const initial: Record<string, any> = {};
      for (const val of submission.values) {
        const key = `${val.field.code}_${val.year.code}`;
        initial[key] = {
          fieldCode: val.field.code,
          yearCode: val.year.code,
          isNotApplicable: val.isNotApplicable,
          numericValue: val.numericValue,
          textValue: val.textValue,
          ratioNumerator: val.ratioNumerator,
          ratioDenominator: val.ratioDenominator,
          remarks: val.remarks,
        };
      }
      setFormData(initial);
      setIsDirty(false);
    }
  }, [submission?.id, sectionCode]);

  // Autosave function
  const saveCurrentDraft = useCallback(
    async (dataToSave = formData) => {
      if (!submission?.id) return;
      setIsSaving(true);
      try {
        const payloadValues = Object.values(dataToSave);
        if (payloadValues.length > 0) {
          const res = await api.saveDraft(submission.id, payloadValues);
          if (res.success) {
            setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setIsDirty(false);
            onRefreshSubmission();
          }
        }
      } catch (err: any) {
        console.error('Autosave error:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [submission?.id, formData, onRefreshSubmission]
  );

  // Debounced autosave
  const triggerDebouncedSave = (updatedData: Record<string, any>) => {
    setIsDirty(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveCurrentDraft(updatedData);
    }, 2000);
  };

  // Handle value change for a field & year
  const handleFieldChange = (yearCode: string, fieldCode: string, updates: any) => {
    const key = `${fieldCode}_${yearCode}`;
    const prev = formData[key] || { fieldCode, yearCode };
    const nextVal = { ...prev, ...updates };

    const nextData = { ...formData, [key]: nextVal };

    // Smart calculation: Section 3.2 Percentage auto-computation
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

    setFormData(nextData);
    triggerDebouncedSave(nextData);
  };

  // Section navigation helpers
  const sectionCodes = ['3.1', '3.2', '3.3', '3.4', '3.5'];
  const currentIndex = sectionCodes.indexOf(sectionCode);
  const prevCode = currentIndex > 0 ? sectionCodes[currentIndex - 1] : null;
  const nextCode = currentIndex < sectionCodes.length - 1 ? sectionCodes[currentIndex + 1] : null;

  const handleNext = async () => {
    await saveCurrentDraft();
    if (nextCode) {
      onNavigateSection(nextCode);
    } else {
      onNavigateReview();
    }
  };

  const handlePrev = async () => {
    await saveCurrentDraft();
    if (prevCode) {
      onNavigateSection(prevCode);
    }
  };

  if (!section) {
    return <div className="p-8 text-center text-slate-500">Section not found.</div>;
  }

  const secProg = progress?.sectionProgress?.find((p: any) => p.sectionCode === sectionCode);
  const pct = secProg?.percentage ?? 0;

  return (
    <div className="space-y-6">
      {/* Sticky Action & Autosave Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm sticky top-20 z-30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 font-mono font-bold text-sm flex items-center justify-center border border-brand-200 flex-shrink-0">
            {section.code}
          </span>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {section.title}
            </h1>
            <p className="text-xs text-slate-500">
              {section.fields?.length} indicators &bull; {pct}% Complete
            </p>
          </div>
        </div>

        {/* Right controls: Autosave status & buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                <span>Saving draft...</span>
              </>
            ) : isDirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved changes</span>
              </>
            ) : lastSavedTime ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved at {lastSavedTime}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>All saved</span>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => saveCurrentDraft()}
            disabled={isSaving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Draft
          </Button>

          {nextCode ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Save & Next
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              onClick={handleNext}
              rightIcon={<CheckSquare className="w-3.5 h-3.5" />}
            >
              Review & Submit
            </Button>
          )}
        </div>
      </div>

      {/* Description Banner */}
      {section.description && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Section Scope:</span> {section.description}
        </div>
      )}

      {/* Year-Wise Fields List */}
      <div className="space-y-4">
        {section.fields?.map((field: any) => {
          // Extract values for all years for this field
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
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {prevCode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Previous Section
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveCurrentDraft()}
            disabled={isSaving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Draft
          </Button>

          {nextCode ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Save & Continue to {nextCode}
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              onClick={onNavigateReview}
              rightIcon={<CheckSquare className="w-3.5 h-3.5" />}
            >
              Proceed to Final Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
