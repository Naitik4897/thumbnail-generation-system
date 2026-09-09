'use client';

import React from 'react';
import { useAtom } from 'jotai';
import { selectedJobAtom } from '../state/atoms';
import { ApiClient } from '../lib/api';
import { MediaType } from '@repo/types';
import { StatusBadge } from './StatusBadge';
import { X, Download, Film, Image as ImageIcon, Calendar, HardDrive, Clock, CheckCircle } from 'lucide-react';

export const JobPreviewModal: React.FC = () => {
  const [selectedJob, setSelectedJob] = useAtom(selectedJobAtom);

  if (!selectedJob) return null;

  const isVideo = selectedJob.mediaType === MediaType.VIDEO;
  const thumbnailUrl = ApiClient.getThumbnailUrl(selectedJob.id, selectedJob.thumbnailUrl);
  const downloadThumbUrl = ApiClient.getDownloadUrl(selectedJob.id, 'thumbnail');
  const downloadOrigUrl = ApiClient.getDownloadUrl(selectedJob.id, 'original');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate pr-4">
            <div className="p-1.5 rounded bg-slate-800 text-slate-300">
              {isVideo ? <Film className="w-4 h-4 text-purple-400" /> : <ImageIcon className="w-4 h-4 text-blue-400" />}
            </div>
            <h3 className="font-semibold text-slate-200 truncate">{selectedJob.originalFileName}</h3>
          </div>
          <button
            onClick={() => setSelectedJob(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Centered Native 128x128 Thumbnail View */}
          <div className="relative p-2 bg-slate-950 rounded-xl border border-slate-800 shadow-inner mb-6">
            <img
              src={thumbnailUrl}
              alt={selectedJob.originalFileName}
              className="w-32 h-32 object-cover rounded-lg shadow-md border border-slate-800"
            />
            <div className="absolute -bottom-2.5 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-[10px] text-indigo-300 font-mono">
              128 × 128 px
            </div>
          </div>

          {/* Details Table */}
          <div className="w-full bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                Status
              </span>
              <StatusBadge status={selectedJob.status} progress={selectedJob.progress} />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                Original File Size
              </span>
              <span className="text-slate-200 font-medium">
                {(selectedJob.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>

            {isVideo && selectedJob.durationInSeconds != null && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Video Extracted Midpoint
                </span>
                <span className="text-purple-300 font-mono font-medium">
                  {selectedJob.extractedFrameTimestamp?.toFixed(1)}s / {selectedJob.durationInSeconds.toFixed(1)}s
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Created At
              </span>
              <span className="text-slate-300">
                {new Date(selectedJob.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex gap-3">
          <a
            href={downloadOrigUrl}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Original
          </a>

          <a
            href={downloadThumbUrl}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            Download 128×128
          </a>
        </div>
      </div>
    </div>
  );
};
