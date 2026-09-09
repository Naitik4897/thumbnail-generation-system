'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAtom, useSetAtom } from 'jotai';
import { authAtom, jobsAtom, mediaStatsAtom, socketConnectedAtom } from '../state/atoms';
import { JobProgressEvent, JobStatus, SOCKET_EVENTS } from '@repo/types';
import { API_BASE_URL, ApiClient } from '../lib/api';

export function useSocket() {
  const [auth] = useAtom(authAtom);
  const setJobs = useSetAtom(jobsAtom);
  const setSocketConnected = useSetAtom(socketConnectedAtom);
  const setStats = useSetAtom(mediaStatsAtom);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketConnected(false);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || API_BASE_URL;

    const socket = io(socketUrl, {
      auth: {
        token: auth.token,
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket Connected] Connected to Realtime Gateway');
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 [Socket Disconnected]');
      setSocketConnected(false);
    });

    // Realtime Job Progress / Completion Event Listener
    socket.on(SOCKET_EVENTS.JOB_UPDATED, (event: JobProgressEvent) => {
      console.log(`[Socket Realtime Update] Job ${event.jobId} -> ${event.status} (${event.progress}%)`);

      setJobs((prevJobs) => {
        const index = prevJobs.findIndex((j) => j.id === event.jobId);
        if (index === -1) {
          return prevJobs;
        }

        const oldStatus = prevJobs[index].status;
        if (oldStatus !== event.status) {
          if (event.status === JobStatus.PROCESSING) {
            setStats((prev) => ({
              ...prev,
              queued: Math.max(0, prev.queued - 1),
              processing: prev.processing + 1,
            }));
          } else if (event.status === JobStatus.COMPLETED) {
            setStats((prev) => ({
              ...prev,
              processing: Math.max(0, prev.processing - 1),
              completed: prev.completed + 1,
            }));
          } else if (event.status === JobStatus.FAILED) {
            setStats((prev) => ({
              ...prev,
              processing: Math.max(0, prev.processing - 1),
              failed: prev.failed + 1,
            }));
          }
        }

        const updated = [...prevJobs];
        updated[index] = {
          ...updated[index],
          status: event.status,
          progress: event.progress,
          thumbnailUrl: event.thumbnailUrl || updated[index].thumbnailUrl,
          thumbnailFilePath: event.thumbnailFilePath || updated[index].thumbnailFilePath,
          errorMessage: event.errorMessage || updated[index].errorMessage,
          durationInSeconds: event.durationInSeconds || updated[index].durationInSeconds,
          extractedFrameTimestamp: event.extractedFrameTimestamp || updated[index].extractedFrameTimestamp,
          updatedAt: new Date().toISOString(),
        };
        return updated;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [auth.isAuthenticated, auth.token, setJobs, setSocketConnected, setStats]);

  return { socket: socketRef.current };
}
