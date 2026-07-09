import { create } from 'zustand';
import type { AacButtonRecord, BoardItem, BoardRecord, ButtonFormValue, Point } from '../types/aac';
import {
  createBoard,
  createBoardItem,
  deleteBoard,
  deleteButtonAndReferences,
  duplicateBoard,
  ensureInitialBoard,
  loadAllData,
  putBoard,
  renameBoard,
  upsertButton
} from '../services/db';

interface AacState {
  buttons: AacButtonRecord[];
  boards: BoardRecord[];
  activeBoardId?: string;
  loading: boolean;
  error?: string;
  initialized: boolean;
  presentationMode: boolean;
  loadAll: () => Promise<void>;
  saveButton: (value: ButtonFormValue) => Promise<AacButtonRecord>;
  deleteButton: (buttonId: string) => Promise<void>;
  setActiveBoard: (boardId: string) => void;
  createBoard: (name: string) => Promise<BoardRecord>;
  renameBoard: (boardId: string, name: string) => Promise<void>;
  duplicateBoard: (boardId: string) => Promise<BoardRecord>;
  deleteBoard: (boardId: string) => Promise<void>;
  addBoardItem: (boardId: string, buttonId: string, point: Point) => Promise<BoardItem>;
  updateBoardItem: (boardId: string, itemId: string, patch: Partial<BoardItem>) => Promise<void>;
  removeBoardItem: (boardId: string, itemId: string) => Promise<void>;
  saveBoard: (boardId: string) => Promise<void>;
  setPresentationMode: (enabled: boolean) => void;
  clearError: () => void;
}

function replaceBoard(boards: BoardRecord[], updated: BoardRecord): BoardRecord[] {
  return boards.map((board) => (board.id === updated.id ? updated : board)).sort((a, b) => b.updatedAt - a.updatedAt);
}

function getBoardOrThrow(boards: BoardRecord[], boardId: string): BoardRecord {
  const board = boards.find((candidate) => candidate.id === boardId);
  if (!board) {
    throw new Error('보드를 찾을 수 없습니다.');
  }

  return board;
}

export const useAacStore = create<AacState>((set, get) => ({
  buttons: [],
  boards: [],
  activeBoardId: undefined,
  loading: false,
  initialized: false,
  presentationMode: false,

  loadAll: async () => {
    set({ loading: true, error: undefined });
    try {
      const initialBoard = await ensureInitialBoard();
      const { buttons, boards } = await loadAllData();
      set({
        buttons,
        boards,
        activeBoardId: get().activeBoardId ?? boards[0]?.id ?? initialBoard.id,
        loading: false,
        initialized: true
      });
    } catch (error) {
      set({
        loading: false,
        initialized: true,
        error: error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.'
      });
    }
  },

  saveButton: async (value) => {
    const record = await upsertButton(value);
    const buttons = get().buttons.filter((button) => button.id !== record.id);
    set({ buttons: [record, ...buttons].sort((a, b) => b.updatedAt - a.updatedAt), error: undefined });
    return record;
  },

  deleteButton: async (buttonId) => {
    const boards = await deleteButtonAndReferences(buttonId);
    set({
      buttons: get().buttons.filter((button) => button.id !== buttonId),
      boards,
      error: undefined
    });
  },

  setActiveBoard: (boardId) => {
    set({ activeBoardId: boardId });
  },

  createBoard: async (name) => {
    const board = await createBoard(name);
    set({
      boards: [board, ...get().boards].sort((a, b) => b.updatedAt - a.updatedAt),
      activeBoardId: board.id,
      error: undefined
    });
    return board;
  },

  renameBoard: async (boardId, name) => {
    const board = await renameBoard(boardId, name);
    set({ boards: replaceBoard(get().boards, board), error: undefined });
  },

  duplicateBoard: async (boardId) => {
    const board = await duplicateBoard(boardId);
    set({
      boards: [board, ...get().boards].sort((a, b) => b.updatedAt - a.updatedAt),
      activeBoardId: board.id,
      error: undefined
    });
    return board;
  },

  deleteBoard: async (boardId) => {
    const boards = await deleteBoard(boardId);
    const currentActive = get().activeBoardId;
    set({
      boards,
      activeBoardId: currentActive === boardId ? boards[0]?.id : currentActive,
      error: undefined
    });
  },

  addBoardItem: async (boardId, buttonId, point) => {
    const board = getBoardOrThrow(get().boards, boardId);
    const item = createBoardItem(buttonId, point);
    const updated = await putBoard({ ...board, items: [...board.items, item] });
    set({ boards: replaceBoard(get().boards, updated), error: undefined });
    return item;
  },

  updateBoardItem: async (boardId, itemId, patch) => {
    const board = getBoardOrThrow(get().boards, boardId);
    const updatedItems = board.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    const updated = await putBoard({ ...board, items: updatedItems });
    set({ boards: replaceBoard(get().boards, updated), error: undefined });
  },

  removeBoardItem: async (boardId, itemId) => {
    const board = getBoardOrThrow(get().boards, boardId);
    const updated = await putBoard({ ...board, items: board.items.filter((item) => item.id !== itemId) });
    set({ boards: replaceBoard(get().boards, updated), error: undefined });
  },

  saveBoard: async (boardId) => {
    const board = getBoardOrThrow(get().boards, boardId);
    const updated = await putBoard(board);
    set({ boards: replaceBoard(get().boards, updated), error: undefined });
  },

  setPresentationMode: (enabled) => {
    set({ presentationMode: enabled });
  },

  clearError: () => {
    set({ error: undefined });
  }
}));
