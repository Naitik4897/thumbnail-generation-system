'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  authAtom,
  jobsAtom,
  filterTypeAtom,
  filterStatusAtom,
  paginationAtom,
  mediaStatsAtom,
} from '../state/atoms';
import { ApiClient } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { Navbar } from '../components/Navbar';
import { Dropzone } from '../components/Dropzone';
import { JobCard } from '../components/JobCard';
import { JobPreviewModal } from '../components/JobPreviewModal';
import { AuthModal } from '../components/AuthModal';
import { JobStatus } from '@repo/types';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  Loader2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function DashboardPage() {
  const [auth, setAuth] = useAtom(authAtom);
  const [jobs, setJobs] = useAtom(jobsAtom);
  const [filterType, setFilterType] = useAtom(filterTypeAtom);
  const [filterStatus, setFilterStatus] = useAtom(filterStatusAtom);
  const [pagination, setPagination] = useAtom(paginationAtom);
  const [stats, setStats] = useAtom(mediaStatsAtom);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Initialize Realtime WebSocket Connection
  useSocket();

  // Restore Authentication on page mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuth((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    ApiClient.getMe()
      .then((res) => {
        setAuth({
          user: res.data.user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setAuth({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      });
  }, [setAuth]);

  // Fetch paginated user jobs
  const fetchJobs = useCallback(
    async (page: number, type: string, status: string, limit: number = 8) => {
      if (!auth.isAuthenticated) {
        setJobs([]);
        return;
      }

      setIsLoadingJobs(true);
      try {
        const res = await ApiClient.getUserJobs({
          page,
          limit,
          mediaType: type,
          status,
        });
        setJobs(res.data.jobs);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load paginated jobs:', err);
      } finally {
        setIsLoadingJobs(false);
      }
    },
    [auth.isAuthenticated, setJobs, setPagination, setStats]
  );

  useEffect(() => {
    fetchJobs(pagination.page, filterType, filterStatus, pagination.limit);
  }, [fetchJobs, pagination.page, filterType, filterStatus, pagination.limit]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      <Navbar onOpenAuth={() => setIsAuthModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Media Processing Pipeline
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              BullMQ & Redis backed asynchronous job queue with Per-User FIFO concurrency and instant 128×128 thumbnail generation.
            </p>
          </div>

          {/* Quick Stats - Global user counts across all pages */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Queued</span>
              <span className="text-base font-bold text-amber-400">{stats.queued}</span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Processing</span>
              <span className="text-base font-bold text-indigo-400">{stats.processing}</span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completed</span>
              <span className="text-base font-bold text-emerald-400">{stats.completed}</span>
            </div>
          </div>
        </div>

        {/* Dropzone */}
        <Dropzone
          onRequireAuth={() => setIsAuthModalOpen(true)}
          onUploadSuccess={() => fetchJobs(1, filterType, filterStatus, pagination.limit)}
        />

        {/* Media Jobs Dashboard */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Generated Thumbnails</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                {pagination.total} Total
              </span>
            </div>

            {/* Filter & Limit Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Media Type Filter */}
              <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-medium">
                {(['ALL', 'IMAGE', 'VIDEO'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setFilterType(type);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className={`px-3 py-1 rounded-md transition ${
                      filterType === type
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type === 'ALL' ? 'All Types' : type === 'IMAGE' ? 'Images' : 'Videos'}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as any);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="QUEUED">Queued</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>

              {/* Items Per Page */}
              <select
                value={pagination.limit}
                onChange={(e) => {
                  setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }));
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
              >
                <option value="8">8 per page</option>
                <option value="16">16 per page</option>
                <option value="24">24 per page</option>
              </select>
            </div>
          </div>

          {/* Job Cards Grid */}
          {isLoadingJobs ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-sm">Loading your thumbnails...</p>
            </div>
          ) : jobs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {jobs.slice(0, pagination.limit).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {/* Pagination Navigation Bar */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-200">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-semibold text-slate-200">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-semibold text-indigo-400">{pagination.total}</span> thumbnails
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition ${
                          pagination.page === pageNum
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 bg-slate-900/30 border border-slate-800/60 rounded-2xl flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-300">No media jobs found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {!auth.isAuthenticated
                  ? 'Please sign in to upload images/videos and view your live processing jobs.'
                  : 'Drop some images or videos in the upload area above to start thumbnail processing!'}
              </p>
              {!auth.isAuthenticated && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                >
                  Sign In to Get Started
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      <JobPreviewModal />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
