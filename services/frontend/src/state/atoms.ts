import { atom } from 'jotai';
import { MediaJobDTO, UserDTO } from '@repo/types';

export interface AuthState {
  user: UserDTO | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const authAtom = atom<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
});

export const jobsAtom = atom<MediaJobDTO[]>([]);

export const isUploadingAtom = atom<boolean>(false);

export const socketConnectedAtom = atom<boolean>(false);

export const selectedJobAtom = atom<MediaJobDTO | null>(null);

export const filterTypeAtom = atom<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
export const filterStatusAtom = atom<'ALL' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('ALL');

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export const paginationAtom = atom<PaginationState>({
  page: 1,
  limit: 8,
  total: 0,
  totalPages: 1,
  hasMore: false,
});

export interface MediaStatsState {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export const mediaStatsAtom = atom<MediaStatsState>({
  queued: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  total: 0,
});
