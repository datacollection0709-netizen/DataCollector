import React, { useState, useEffect } from 'react';
import { Building2, UserCheck, LogOut, Shield, Wifi, WifiOff, FileSpreadsheet, Activity, Menu } from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { api } from '../../api/client';

interface NavbarProps {
  submissionId?: string;
  onExportExcel?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ submissionId, onExportExcel, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExcelExport = async () => {
    if (!submissionId) return;
    setIsExporting(true);
    try {
      if (onExportExcel) {
        onExportExcel();
      } else {
        await api.downloadExcel(submissionId);
      }
    } catch (err: any) {
      alert('Failed to export Excel: ' + err.message);
    } finally {
      setIsExporting(false);
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
                  Attribute 3
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded">
                  Institutional Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[220px] sm:max-w-md">
                {user?.organizationName || 'Apex Institute of Technology & Science'}
              </p>
            </div>
          </div>

          {/* Right Controls: Network status, Export, User & Demo Switcher */}
          <div className="flex items-center gap-3">
            {/* Network connectivity badge (Prompt Item 28) */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/50 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online' : 'Offline (Saved Locally)'}</span>
            </div>

            {/* Google Drive Status Badge */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
              title="Google Drive Active: datacollection0709@gmail.com (Folder: Proofs)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Drive Connected</span>
            </div>

            {/* Quick Export Excel */}
            {submissionId && (
              <button
                type="button"
                onClick={handleExcelExport}
                disabled={isExporting}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50"
                title="Export entire Attribute 3 workbook as Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Generating...' : 'Export Excel'}</span>
              </button>
            )}



            {/* Current user pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{user?.name}</div>
                <div className="text-[10px] font-mono text-brand-400 uppercase tracking-wide">
                  {user?.role}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
