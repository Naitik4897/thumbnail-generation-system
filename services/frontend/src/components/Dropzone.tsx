'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAtom, useSetAtom } from 'jotai';
import { authAtom, isUploadingAtom, jobsAtom, mediaStatsAtom, paginationAtom } from '../state/atoms';
import { ApiClient } from '../lib/api';
import { UploadCloud, File, Film, Image as ImageIcon, X, Loader2, Sparkles } from 'lucide-react';

interface DropzoneProps {
  onRequireAuth: () => void;
  onUploadSuccess?: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onRequireAuth, onUploadSuccess }) => {
  const [auth] = useAtom(authAtom);
  const [isUploading, setIsUploading] = useAtom(isUploadingAtom);
  const setJobs = useSetAtom(jobsAtom);
  const [pagination, setPagination] = useAtom(paginationAtom);
  const setStats = useSetAtom(mediaStatsAtom);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setErrorMsg(null);
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'video/*': ['.mp4', '.mov', '.mkv', '.webm', '.avi'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!auth.isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const response = await ApiClient.uploadFiles(selectedFiles);
      const newJobs = response.data.jobs;

      // Update global metrics stats atom
      setStats((prev) => ({
        ...prev,
        queued: prev.queued + newJobs.length,
        total: prev.total + newJobs.length,
      }));

      // Update pagination state and limit displayed jobs on page 1
      setPagination((prev) => ({
        ...prev,
        page: 1,
        total: prev.total + newJobs.length,
        totalPages: Math.ceil((prev.total + newJobs.length) / prev.limit) || 1,
      }));

      // Prepend newly queued jobs into the Jotai store limited to page limit
      setJobs((prev) => {
        const existingMap = new Map(prev.map((j) => [j.id, j]));
        const mergedNew = newJobs.map((nj) => {
          const existing = existingMap.get(nj.id);
          return existing ? { ...nj, ...existing } : nj;
        });
        const newIds = new Set(newJobs.map((j) => j.id));
        const filteredPrev = prev.filter((j) => !newIds.has(j.id));
        return [...mergedNew, ...filteredPrev].slice(0, pagination.limit);
      });

      setSelectedFiles([]);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Upload Images & Videos
        </h2>
        <p className="text-sm text-slate-400">
          Upload media files to instantly queue 128×128 thumbnail extraction. Videos auto-extract the exact midpoint frame!
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
            : 'border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-800/40 bg-slate-950/40'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-200">
              {isDragActive ? 'Drop your files here...' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports PNG, JPG, WEBP, MP4, MOV, MKV (Up to 100MB per file)
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files List Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Selected Files ({selectedFiles.length})
            </span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-rose-400 hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => {
              const isVideo = file.type.startsWith('video/');
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-sm"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                      {isVideo ? <Film className="w-4 h-4 text-purple-400" /> : <ImageIcon className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Upload Action Button */}
      <div className="mt-5 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Queueing Files...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>Process {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : 'Files'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
