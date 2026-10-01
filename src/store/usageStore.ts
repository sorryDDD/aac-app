import { create } from 'zustand';
import { endUsageSession, saveButtonPress, startUsageSession } from '../services/usage';
import type { ButtonPress } from '../types/usage';

interface UsageState {
  activeSessionId?: string;
  starting: boolean;
  stopping: boolean;
  pending: number;
  saved: number;
  failed: number;
  revision: number;
  error?: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  record: (press: ButtonPress) => Promise<boolean>;
  clearError: () => void;
}

const pendingWrites = new Set<Promise<void>>();

export const useUsageStore = create<UsageState>((set, get) => ({
  starting: false,
  stopping: false,
  pending: 0,
  saved: 0,
  failed: 0,
  revision: 0,
  start: async () => {
    if (get().activeSessionId || get().starting || get().stopping || get().pending) return;
    set({ starting: true });
    try {
      const session = await startUsageSession();
      set((state) => ({ activeSessionId: session.id, starting: false, saved: 0, revision: state.revision + 1 }));
    } catch {
      set({ starting: false, error: '기록을 시작하지 못했습니다. 저장 공간과 브라우저 저장소 권한을 확인해 주세요.' });
    }
  },
  stop: async () => {
    const sessionId = get().activeSessionId;
    if (!sessionId || get().stopping) return;
    // Disable recording immediately. Previously submitted writes finish first.
    set({ activeSessionId: undefined, stopping: true });
    const endedAt = Date.now();
    try {
      await Promise.allSettled([...pendingWrites]);
      await endUsageSession(sessionId, endedAt);
      set((state) => ({ stopping: false, revision: state.revision + 1 }));
    } catch {
      set((state) => ({ stopping: false, revision: state.revision + 1,
        error: '기록은 중지했지만 종료 시각을 저장하지 못했습니다. 이미 저장된 버튼 누름은 내보낼 수 있습니다.' }));
    }
  },
  record: async (press) => {
    const sessionId = get().activeSessionId;
    if (!sessionId) return false;
    set((state) => ({ pending: state.pending + 1 }));
    const write = saveButtonPress(sessionId, press);
    pendingWrites.add(write);
    try {
      await write;
      set((state) => ({ pending: state.pending - 1, saved: state.saved + 1 }));
      return true;
    } catch {
      set((state) => ({ pending: state.pending - 1, failed: state.failed + 1,
        error: '버튼 누름 기록을 저장하지 못했습니다. 음성 재생은 계속됩니다. 저장 공간을 확인하고 기록을 내보내 주세요.' }));
      return false;
    } finally {
      pendingWrites.delete(write);
    }
  },
  clearError: () => set({ error: undefined })
}));
