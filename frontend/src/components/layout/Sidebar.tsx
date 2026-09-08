import React from 'react';
import {
  LayoutDashboard,
  Building,
  BookOpen,
  FlaskConical,
  Wifi,
  Accessibility,
  CheckSquare,
  FileSpreadsheet,
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  progress?: {
    overallPercentage: number;
    sectionProgress: {
      sectionCode: string;
      percentage: number;
      missingFieldCodes: string[];
    }[];
    missingRequiredProofs: any[];
  };
  submissionStatus?: string;
  onExportExcel: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  progress,
  submissionStatus,
  onExportExcel,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();

  const sections = [
    { code: '3.1', title: '3.1 Infrastructure', icon: Building },
    { code: '3.2', title: '3.2 Library Expenditure', icon: BookOpen },
    { code: '3.3', title: '3.3 Research Resources', icon: FlaskConical },
    { code: '3.4', title: '3.4 IT Infrastructure', icon: Wifi },
    { code: '3.5', title: '3.5 Divyangjan Campus', icon: Accessibility },
  ];

  const overall = progress?.overallPercentage ?? 0;
  const isElevated = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out md:sticky md:top-16 md:self-start md:z-30 md:h-[calc(100vh-4rem)] md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Overall Completion Metric Card */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-lg md:hidden shadow-sm border border-slate-200"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center justify-between mb-2 mt-1">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Attribute 3 Progress
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              overall === 100
                ? 'bg-emerald-100 text-emerald-800'
                : overall >= 50
                ? 'bg-brand-100 text-brand-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {overall}%
          </span>
        </div>
        <ProgressBar value={overall} size="sm" />

        <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
          <span>Status:</span>
          <span className="font-semibold text-slate-800">{submissionStatus || 'DRAFT'}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-brand-50 text-brand-700 font-semibold'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>Dashboard Overview</span>
        </button>

        {/* Section Header */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Form Sections
          </span>
        </div>

        {/* Sections 3.1 to 3.5 */}
        {sections.map((s) => {
          const Icon = s.icon;
          const secProg = progress?.sectionProgress?.find((p) => p.sectionCode === s.code);
          const pct = secProg?.percentage ?? 0;
          const hasMissing = (secProg?.missingFieldCodes?.length ?? 0) > 0;

          return (
            <button
              key={s.code}
              type="button"
              onClick={() => setActiveTab(s.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors group ${
                activeTab === s.code
                  ? 'bg-brand-50 text-brand-800 font-semibold border-l-4 border-brand-600 rounded-l-none'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    activeTab === s.code ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{s.title}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 pl-2">
                {pct === 100 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 font-medium">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}

        {/* Review & Final Submit */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Submission
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('review')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
            activeTab === 'review'
              ? 'bg-brand-50 text-brand-700 font-semibold'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Review & Submit</span>
          </div>
          {overall < 100 && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">
              Needs Work
            </span>
          )}
        </button>


      </nav>

      {/* Export to Excel Button in Sidebar Footer */}
      <div className="p-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onExportExcel}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Excel Report</span>
        </button>
      </div>
    </aside>
  );
};
