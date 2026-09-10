import React from 'react';
import {
  Building2,
  BookOpen,
  FlaskConical,
  Wifi,
  Accessibility,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';

interface DashboardProps {
  submission: any;
  progress: any;
  onNavigateSection: (sectionCode: string) => void;
  onNavigateReview: () => void;
  onExportExcel: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
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
    },
    {
      code: '3.2',
      title: 'Library & Digital Resources Expenditure',
      desc: 'Financial expenditure on e-books, journals, and non-salary total.',
      icon: BookOpen,
    },
    {
      code: '3.3',
      title: 'Research Facilities & Subscriptions',
      desc: 'Consortia memberships (N-LIST, DELNET), specialized software, labs.',
      icon: FlaskConical,
    },
    {
      code: '3.4',
      title: 'IT Infrastructure & Digital Campus',
      desc: 'Internet bandwidth (MBPS), student-computer ratio, and VR facilities.',
      icon: Wifi,
    },
    {
      code: '3.5',
      title: 'Barrier-Free Campus & Divyangjan Access',
      desc: 'Ramps, lifts, accessible washrooms, assistive screen readers (JAWS).',
      icon: Accessibility,
    },
  ];

  const overall = progress?.overallPercentage ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Attribute 3 Form
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Please enter the infrastructure and learning resources metrics below.
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
              Review & Submit
            </Button>
          </div>
        </div>

        {/* Overall Completion Metric */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Completion</span>
            </div>
            <span className="text-xs font-bold text-slate-900 font-mono">{overall}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sections Cards Grid */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionsMeta.map((sec) => {
            const secProg = progress?.sectionProgress?.find((p: any) => p.sectionCode === sec.code);
            const pct = secProg?.percentage ?? 0;
            const isComplete = pct === 100;

            return (
              <div
                key={sec.code}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-mono font-bold text-xs flex items-center justify-center border border-blue-200/60">
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
                    ) : null}
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
                    <span>{isComplete ? 'Review Section' : 'Enter Data'}</span>
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
