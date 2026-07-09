import Dexie, { type Table } from 'dexie';
import type { AacButtonRecord, BoardItem, BoardRecord, ButtonFormValue, Point } from '../types/aac';
import { DEFAULT_ITEM_SIZE } from '../utils/board';
import { createId } from '../utils/id';

const SEEDED_DUMMY_BUTTON_ID = 'button_empty_dummy';

class AacDatabase extends Dexie {
  buttons!: Table<AacButtonRecord, string>;
  boards!: Table<BoardRecord, string>;

  constructor() {
    super('aac-board-studio');
    this.version(1).stores({
      buttons: 'id, name, createdAt, updatedAt',
      boards: 'id, name, createdAt, updatedAt'
    });
    this.version(2)
      .stores({
        buttons: 'id, name, createdAt, updatedAt',
        boards: 'id, name, createdAt, updatedAt'
      })
      .upgrade(async (transaction) => {
        await transaction.table('buttons').delete(SEEDED_DUMMY_BUTTON_ID);
        const boards = (await transaction.table('boards').toArray()) as BoardRecord[];
        await Promise.all(
          boards.map((board) => {
            const items = board.items.filter((item) => item.buttonId !== SEEDED_DUMMY_BUTTON_ID);

            if (items.length === board.items.length) {
              return undefined;
            }

            return transaction.table('boards').put({
              ...board,
              items,
              updatedAt: now()
            });
          })
        );
      });
  }
}

export const db = new AacDatabase();

function now(): number {
  return Date.now();
}

export async function loadAllData(): Promise<{ buttons: AacButtonRecord[]; boards: BoardRecord[] }> {
  const [buttons, boards] = await Promise.all([
    db.buttons.orderBy('updatedAt').reverse().toArray(),
    db.boards.orderBy('updatedAt').reverse().toArray()
  ]);

  return { buttons, boards };
}

export function createBoardRecord(name = '나의 AAC 보드'): BoardRecord {
  const timestamp = now();

  return {
    id: createId('board'),
    name,
    items: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export async function ensureInitialBoard(): Promise<BoardRecord> {
  const firstBoard = await db.boards.orderBy('createdAt').first();

  if (firstBoard) {
    return firstBoard;
  }

  const board = createBoardRecord();
  await db.boards.add(board);
  return board;
}

export async function upsertButton(value: ButtonFormValue): Promise<AacButtonRecord> {
  const timestamp = now();
  const existing = value.id ? await db.buttons.get(value.id) : undefined;
  const record: AacButtonRecord = {
    id: existing?.id ?? createId('button'),
    name: value.name.trim(),
    imageBlob: value.imageBlob,
    audioBlob: value.audioBlob,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  await db.buttons.put(record);
  return record;
}

export async function deleteButtonAndReferences(buttonId: string): Promise<BoardRecord[]> {
  let updatedBoards: BoardRecord[] = [];

  await db.transaction('rw', db.buttons, db.boards, async () => {
    await db.buttons.delete(buttonId);
    const boards = await db.boards.toArray();
    updatedBoards = boards.map((board) => {
      const items = board.items.filter((item) => item.buttonId !== buttonId);
      if (items.length === board.items.length) {
        return board;
      }

      return {
        ...board,
        items,
        updatedAt: now()
      };
    });

    await Promise.all(updatedBoards.map((board) => db.boards.put(board)));
  });

  return updatedBoards.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createBoard(name: string): Promise<BoardRecord> {
  const board = createBoardRecord(name.trim() || '새 AAC 보드');
  await db.boards.add(board);
  return board;
}

export async function renameBoard(boardId: string, name: string): Promise<BoardRecord> {
  const board = await db.boards.get(boardId);
  if (!board) {
    throw new Error('보드를 찾을 수 없습니다.');
  }

  const updated: BoardRecord = {
    ...board,
    name: name.trim() || board.name,
    updatedAt: now()
  };
  await db.boards.put(updated);
  return updated;
}

export async function duplicateBoard(boardId: string): Promise<BoardRecord> {
  const board = await db.boards.get(boardId);
  if (!board) {
    throw new Error('복제할 보드를 찾을 수 없습니다.');
  }

  const timestamp = now();
  const copy: BoardRecord = {
    ...board,
    id: createId('board'),
    name: `${board.name} 복사본`,
    items: board.items.map((item) => ({ ...item, id: createId('item') })),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.boards.add(copy);
  return copy;
}

export async function deleteBoard(boardId: string): Promise<BoardRecord[]> {
  await db.boards.delete(boardId);
  const remaining = await db.boards.orderBy('updatedAt').reverse().toArray();

  if (remaining.length > 0) {
    return remaining;
  }

  const fallback = createBoardRecord();
  await db.boards.add(fallback);
  return [fallback];
}

export async function putBoard(board: BoardRecord): Promise<BoardRecord> {
  const updated = {
    ...board,
    updatedAt: now()
  };
  await db.boards.put(updated);
  return updated;
}

export function createBoardItem(buttonId: string, point: Point): BoardItem {
  return {
    id: createId('item'),
    buttonId,
    x: point.x,
    y: point.y,
    size: DEFAULT_ITEM_SIZE
  };
}
