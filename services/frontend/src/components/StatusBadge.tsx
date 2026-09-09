'use client';

import React from 'react';
import { JobStatus } from '@repo/types';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: JobStatus;
  progress?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, progress }) => {
  switch (status) {
    case JobStatus.QUEUED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Queued
        </span>
      );

    case JobStatus.PROCESSING:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          Processing {progress ? `(${progress}%)` : ''}
        </span>
      );

    case JobStatus.COMPLETED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Completed
        </span>
      );

    case JobStatus.FAILED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          Failed
        </span>
      );

    default:
      return null;
  }
};
