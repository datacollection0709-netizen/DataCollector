import React from 'react';

interface ProgressBarProps {
  value: number; // 0 - 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  // Color gradient depending on completeness
  const getColor = (val: number) => {
    if (val === 100) return 'bg-emerald-500';
    if (val >= 60) return 'bg-brand-500';
    if (val >= 30) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-600">
          <span>Completion</span>
          <span className="font-semibold text-slate-800">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${heightClasses[size]} ${getColor(clamped)} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
