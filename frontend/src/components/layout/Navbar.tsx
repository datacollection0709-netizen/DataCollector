import React from 'react';
import { Building2, LogOut, Menu, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

interface NavbarProps {
  submissionId?: string;
  onToggleSidebar?: () => void;
  onDataCleared?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onDataCleared }) => {
  const { user, logout } = useAuth();

  const handleClearDepartment = async () => {
    const dept = user?.organizationName || 'this department';
    if (
      window.confirm(
        `Are you sure you want to clear all entered data for ${dept}? This will reset this department's form back to a blank state.`
      )
    ) {
      await api.clearCurrentDepartmentData();
      if (onDataCleared) {
        onDataCleared();
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <header className="w-full bg-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Institution */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 -ml-1.5 mr-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg md:hidden transition-colors"
                title="Toggle Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-900/40 flex-shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  Resource Survey
                </span>
              </div>
            </div>
          </div>

          {/* Department Session & Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {user && (
              <div className="hidden sm:flex flex-col text-right pr-1">
                <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                  {user.name}
                </span>
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {user.organizationName}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleClearDepartment}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800 hover:border-slate-700"
              title="Reset all entered values for this department back to blank"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Clear Data</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors border border-slate-700"
              title="Switch to another department or officer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Dept / Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
