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
  Mail,
  Sparkles,
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
      gradient: 'from-blue-500/10 to-indigo-500/10 text-blue-600',
    },
    {
      code: '3.2',
      title: 'Library & Digital Resources Expenditure',
      desc: 'Financial expenditure on e-books, journals, and non-salary total.',
      icon: BookOpen,
      gradient: 'from-emerald-500/10 to-teal-500/10 text-emerald-600',
    },
    {
      code: '3.3',
      title: 'Research Facilities & Subscriptions',
      desc: 'Consortia memberships (N-LIST, DELNET), specialized software, labs.',
      icon: FlaskConical,
      gradient: 'from-purple-500/10 to-violet-500/10 text-purple-600',
    },
    {
      code: '3.4',
      title: 'IT Infrastructure & Digital Campus',
      desc: 'Internet bandwidth (MBPS), student-computer ratio, and VR facilities.',
      icon: Wifi,
      gradient: 'from-sky-500/10 to-cyan-500/10 text-sky-600',
    },
    {
      code: '3.5',
      title: 'Barrier-Free Campus & Divyangjan Access',
      desc: 'Ramps, lifts, accessible washrooms, assistive screen readers (JAWS).',
      icon: Accessibility,
      gradient: 'from-amber-500/10 to-orange-500/10 text-amber-600',
    },
  ];

  const overall = progress?.overallPercentage ?? 0;
  const completedFields = progress?.completedRequiredFields ?? 0;
  const totalRequired = progress?.totalRequiredFields ?? 0;
  const docsCount = progress?.documentsCount ?? submission?.documents?.length ?? 0;
  const missingProofs = progress?.missingRequiredProofs?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-brand-50 text-brand-700 border border-brand-200/60">
                ATTRIBUTE 3 PORTAL
              </span>
              <StatusBadge status={submission?.status || 'DRAFT'} />
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                <Mail className="w-3 h-3 text-slate-400" />
                Admin: datacollection0709@gmail.com
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Infrastructure & Learning Resources
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Academic audit portal covering 2023–24, 2024–25, and 2025–26. Enter indicator metrics and generate official institutional Excel reports.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            >
              Export Excel Report
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateReview}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Audit & Review
            </Button>
          </div>
        </div>

        {/* Overall Completion Metric */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Total Completion</span>
              <span className="text-xs text-slate-400">({completedFields} of {totalRequired} entries)</span>
            </div>
            <span className="text-xs font-bold text-slate-900 font-mono">{overall}% Complete</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 via-sky-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Completed Entries</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {completedFields} <span className="text-xs text-slate-400 font-normal">/ {totalRequired}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Uploaded Proofs</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {docsCount} <span className="text-xs text-slate-400 font-normal">files attached</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Target Mailbox</div>
            <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]" title="datacollection0709@gmail.com">
              datacollection0709
            </div>
            <div className="text-[10px] text-slate-400">@gmail.com</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Last Saved</div>
            <div className="text-xs font-semibold text-slate-800">
              {submission?.updatedAt
                ? new Date(submission.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now'}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Autosave Active</div>
          </div>
        </div>
      </div>

      {/* Sections Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Attribute 3 Sections
          </h2>
          <span className="text-xs text-slate-400">Click any section to begin or edit</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionsMeta.map((sec) => {
            const Icon = sec.icon;
            const secProg = progress?.sectionProgress?.find((p: any) => p.sectionCode === sec.code);
            const pct = secProg?.percentage ?? 0;
            const isComplete = pct === 100;

            return (
              <div
                key={sec.code}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-brand-400 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 font-mono font-bold text-xs flex items-center justify-center border border-brand-200/60">
                        {sec.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 leading-tight">
                        {sec.title}
                      </h3>
                    </div>

                    {isComplete ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-semibold text-slate-400">{pct}%</span>
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
                    <span>{isComplete ? 'Review Indicators' : 'Enter Data'}</span>
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
