import React, { useState } from 'react';
import { Building2, Shield, UserCheck, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuick = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await quickLogin(role);
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-900/50 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Attribute 3 Portal
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Institutional Data Collection & NAAC Infrastructure Audit System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@institution.edu"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2 font-semibold shadow-md"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              One-Click Demo Profiles
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuick('DATA_ENTRY')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-center transition-all group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center text-slate-700 group-hover:text-brand-600 mb-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] font-semibold text-slate-800">Data Officer</div>
                <div className="text-[9px] text-slate-400">entry@inst.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('REVIEWER')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-center transition-all group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center text-slate-700 group-hover:text-amber-600 mb-1.5">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] font-semibold text-slate-800">Reviewer</div>
                <div className="text-[9px] text-slate-400">reviewer@inst.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('ADMIN')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-center transition-all group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-slate-700 group-hover:text-emerald-600 mb-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] font-semibold text-slate-800">Admin</div>
                <div className="text-[9px] text-slate-400">admin@inst.edu</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
          <p>Protected by Enterprise Role-Based Access Control</p>
          <p>Apex Institute of Technology & Science Accreditation System</p>
        </div>
      </div>
    </div>
  );
};
