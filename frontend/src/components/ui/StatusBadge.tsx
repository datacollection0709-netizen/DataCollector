import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Check, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const configs = {
    DRAFT: {
      label: 'Draft In Progress',
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Clock,
    },
    SUBMITTED: {
      label: 'Submitted for Review',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: CheckCircle2,
    },
    UNDER_REVIEW: {
      label: 'Under Committee Review',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertCircle,
    },
    APPROVED: {
      label: 'Accreditation Approved',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: Check,
    },
    REJECTED: {
      label: 'Corrections Requested',
      color: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: XCircle,
    },
  };

  const config = configs[status] || configs.DRAFT;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};
