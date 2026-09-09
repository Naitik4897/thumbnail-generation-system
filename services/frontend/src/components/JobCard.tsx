'use client';

import React from 'react';
import Image from 'next/image';
import { useSetAtom } from 'jotai';
import { selectedJobAtom } from '../state/atoms';
import { JobStatus, MediaJobDTO, MediaType } from '@repo/types';
import { StatusBadge } from './StatusBadge';
import { ApiClient } from '../lib/api';
import { Download, Eye, Film, Image as ImageIcon, Clock, ExternalLink } from 'lucide-react';

interface JobCardProps {
  job: MediaJobDTO;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const setSelectedJob = useSetAtom(selectedJobAtom);

  const isVideo = job.mediaType === MediaType.VIDEO;
  const isCompleted = job.status === JobStatus.COMPLETED;
  const isFailed = job.status === JobStatus.FAILED;

  const thumbnailUrl = ApiClient.getThumbnailUrl(job.id, job.thumbnailUrl);
  const downloadUrl = ApiClient.getDownloadUrl(job.id, 'thumbnail');

  const formatSeconds = (sec?: number | null) => {
    if (sec == null) return '00:00';
    const mins = Math.floor(sec / 60);
    const remainingSecs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition duration-200 shadow-md flex flex-col justify-between">
      <div className="p-4">
        {/* Header: File Name & Type */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 truncate">
            <div className="p-1.5 rounded bg-slate-800 text-slate-300">
              {isVideo ? <Film className="w-3.5 h-3.5 text-purple-400" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-400" />}
            </div>
            <p className="text-sm font-semibold text-slate-200 truncate" title={job.originalFileName}>
              {job.originalFileName}
            </p>
          </div>
          <StatusBadge status={job.status} progress={job.progress} />
        </div>

        {/* 128x128 Centered Thumbnail Preview Area */}
        <div className="flex justify-center my-3">
          <div className="w-32 h-32 rounded-lg bg-slate-950 border border-slate-800/80 overflow-hidden relative flex items-center justify-center group shadow-inner">
            {isCompleted ? (
              <>
                <img
                  src={`${thumbnailUrl}${thumbnailUrl.includes('?') ? '&' : '?'}v=${new Date(job.updatedAt).getTime()}`}
                  alt={job.originalFileName}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  onClick={() => setSelectedJob(job)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
              </>
            ) : isFailed ? (
              <div className="text-center p-2">
                <p className="text-rose-400 text-xs font-medium">Generation Failed</p>
                <p className="text-slate-500 text-[10px] mt-1 line-clamp-2">{job.errorMessage || 'Unknown error'}</p>
              </div>
            ) : (
              // Processing / Queued Skeleton Animation
              <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 animate-pulse">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin mb-2" />
                <span className="text-[10px] text-slate-400 font-medium">
                  {job.status === JobStatus.QUEUED ? 'Waiting in Queue...' : `Generating... ${job.progress}%`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Video Midpoint Info */}
        {isVideo && isCompleted && job.durationInSeconds != null && (
          <div className="my-2 p-2 rounded bg-purple-500/5 border border-purple-500/10 text-[11px] text-purple-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              Midpoint Frame:
            </span>
            <span className="font-semibold">
              {formatSeconds(job.extractedFrameTimestamp)} / {formatSeconds(job.durationInSeconds)}
            </span>
          </div>
        )}

        {/* File Metadata info */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span>{(job.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
          <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 bg-slate-950/50 border-t border-slate-800/80 flex items-center gap-2">
        <button
          onClick={() => setSelectedJob(job)}
          disabled={!isCompleted}
          className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>

        <a
          href={isCompleted ? downloadUrl : '#'}
          download={isCompleted}
          className={`py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition flex items-center justify-center gap-1.5 ${
            !isCompleted ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Save 128×128
        </a>
      </div>
    </div>
  );
};
