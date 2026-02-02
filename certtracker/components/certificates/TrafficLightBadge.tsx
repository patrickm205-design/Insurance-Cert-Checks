import React from 'react';

type Status = 'green' | 'yellow' | 'red' | 'gray';

interface TrafficLightBadgeProps {
  status: Status;
  humanApproved?: boolean;
}

export default function TrafficLightBadge({ status, humanApproved = false }: TrafficLightBadgeProps) {
  const getLabel = () => {
    if (status === 'green' && humanApproved) return 'Approved';
    if (status === 'green' && !humanApproved) return 'Ready for Approval';
    if (status === 'yellow') return 'Needs Review';
    if (status === 'red') return 'Issues Found';
    return 'Not Uploaded';
  };

  const getStyles = () => {
    switch (status) {
      case 'green':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'yellow':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          dot: 'bg-red-500'
        };
      default: // gray
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          border: 'border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  const styles = getStyles();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${styles.bg} ${styles.text} border ${styles.border} text-sm font-medium`}>
      <div className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {getLabel()}
    </span>
  );
}
