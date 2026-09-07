import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SectionForm } from './pages/SectionForm';
import { ReviewSubmission } from './pages/ReviewSubmission';

import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { api } from './api/client';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Application Data State
  const [attribute, setAttribute] = useState<any | null>(null);
  const [years, setYears] = useState<any[]>([]);
  const [submission, setSubmission] = useState<any | null>(null);
  const [progress, setProgress] = useState<any | null>(null);
  const [appLoading, setAppLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [attrRes, subRes] = await Promise.all([
        api.getAttribute('3'),
        api.getCurrentSubmission(),
      ]);

      if (attrRes.success) {
        setAttribute(attrRes.attribute);
        setYears(attrRes.years);
      }

      if (subRes.success) {
        setSubmission(subRes.submission);
        setProgress(subRes.progress);
      }
    } catch (err: any) {
      console.error('Data initialization error:', err);
      setErrorMsg(err.message || 'Failed to initialize Attribute 3 data.');
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleExportExcel = async () => {
    if (!submission?.id) return;
    try {
      await api.downloadExcel(submission.id, `Attribute_3_${submission.organization?.code || 'Export'}.xlsx`);
    } catch (err: any) {
      alert('Excel export error: ' + err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm font-medium text-slate-300">Authenticating Institutional Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (appLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium text-slate-600">Loading Attribute 3 Workbooks & Config...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar submissionId={submission?.id} onExportExcel={handleExportExcel} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          progress={progress}
          submissionStatus={submission?.status}
          onExportExcel={handleExportExcel}
        />

        <main className="flex-1 p-6 lg:p-8 max-w-5xl overflow-y-auto">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              submission={submission}
              progress={progress}
              onNavigateSection={(code) => setActiveTab(code)}
              onNavigateReview={() => setActiveTab('review')}
              onExportExcel={handleExportExcel}
            />
          )}

          {['3.1', '3.2', '3.3', '3.4', '3.5'].includes(activeTab) && (
            <SectionForm
              sectionCode={activeTab}
              attribute={attribute}
              years={years}
              submission={submission}
              progress={progress}
              onRefreshSubmission={loadData}
              onNavigateSection={(code) => setActiveTab(code)}
              onNavigateReview={() => setActiveTab('review')}
            />
          )}

          {activeTab === 'review' && (
            <ReviewSubmission
              submission={submission}
              attribute={attribute}
              years={years}
              progress={progress}
              onRefreshSubmission={loadData}
              onNavigateSection={(code) => setActiveTab(code)}
              onExportExcel={handleExportExcel}
            />
          )}


        </main>
      </div>
    </div>
  );
};
