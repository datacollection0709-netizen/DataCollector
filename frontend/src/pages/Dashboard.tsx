import React from 'react';
import {
  Building2,
  BookOpen,
  FlaskConical,
  Wifi,
  Accessibility,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Upload,
  Calendar,
  Layers,
  Clock,
} from 'lucide-react';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';

interface DashboardProps {
  submission: any;
  progress: any;
  onNavigateSection: (sectionCode: string) => void;
  onNavigateReview: () => void;
  onExportExcel: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  submission,
  progress,
  onNavigateSection,
  onNavigateReview,
  onExportExcel,
}) => {
  const sectionsMeta = [
    {
      code: '3.1',
      title: 'Physical Infrastructure & Facilities',
      desc: 'Classrooms, laboratories, canteen, sports field, and campus amenities.',
      icon: Building2,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      code: '3.2',
      title: 'Library & Digital Resources Expenditure',
      desc: 'Financial expenditure on e-books, journals, and non-salary total.',
      icon: BookOpen,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      code: '3.3',
      title: 'Research Facilities & Subscriptions',
      desc: 'Consortia memberships (N-LIST, DELNET), specialized software, labs.',
      icon: FlaskConical,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      code: '3.4',
      title: 'IT Infrastructure & Digital Campus',
      desc: 'Internet bandwidth (MBPS), student-computer ratio, and VR facilities.',
      icon: Wifi,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      code: '3.5',
      title: 'Barrier-Free Campus & Divyangjan Access',
      desc: 'Ramps, lifts, accessible washrooms, assistive screen readers (JAWS).',
      icon: Accessibility,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
  ];

  const overall = progress?.overallPercentage ?? 0;
  const completedFields = progress?.completedRequiredFields ?? 0;
  const totalRequired = progress?.totalRequiredFields ?? 0;
  const docsCount = progress?.documentsCount ?? submission?.documents?.length ?? 0;
  const missingProofs = progress?.missingRequiredProofs?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-brand-50 text-brand-700 border border-brand-200">
                ATTRIBUTE 3
              </span>
              <StatusBadge status={submission?.status || 'DRAFT'} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Infrastructure and Learning Resources
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive institutional audit covering academic years 2023–24, 2024–25, and 2025–26.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            >
              Export Excel Workbook
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateReview}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Final Review & Submit
            </Button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-700">Overall Progress</span>
            <span className="text-xs font-bold text-slate-900 font-mono">{overall}% Complete</span>
          </div>
          <ProgressBar value={overall} size="md" />
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Completed Fields</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {completedFields} <span className="text-xs text-slate-400 font-normal">/ {totalRequired}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Uploaded Proofs</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {docsCount} <span className="text-xs text-slate-400 font-normal">files attached</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${
            missingProofs > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
          }`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Missing Proofs</div>
            <div className={`text-lg font-bold font-mono ${missingProofs > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {missingProofs} <span className="text-xs text-slate-400 font-normal">required</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Last Saved</div>
            <div className="text-xs font-semibold text-slate-800">
              {submission?.updatedAt ? new Date(submission.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </div>
            <div className="text-[10px] text-slate-400">Autosave Active</div>
          </div>
        </div>
      </div>

      {/* Sections Cards Grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Attribute 3 Sections
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionsMeta.map((sec) => {
            const Icon = sec.icon;
            const secProg = progress?.sectionProgress?.find((p: any) => p.sectionCode === sec.code);
            const pct = secProg?.percentage ?? 0;
            const isComplete = pct === 100;

            return (
              <div
                key={sec.code}
                className="bg-white rounded-xl border border-slate-200 hover:border-brand-400 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 font-mono font-bold text-xs flex items-center justify-center border border-brand-200">
                        {sec.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 leading-tight">
                        {sec.title}
                      </h3>
                    </div>

                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">{pct}%</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {sec.desc}
                  </p>
                </div>

                <div>
                  <ProgressBar value={pct} size="sm" className="mb-4" />

                  <Button
                    variant={isComplete ? 'outline' : 'primary'}
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => onNavigateSection(sec.code)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    <span>{isComplete ? 'Review Section' : 'Continue Data Entry'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
