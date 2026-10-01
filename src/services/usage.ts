import Dexie, { type Table } from 'dexie';
import type { ButtonPress, UsageEvent, UsageSession } from '../types/usage';
import { createId } from '../utils/id';
import { USAGE_CSV_HEADERS } from '../utils/usageCsv';

// Keep recording entirely separate from the existing AAC material database.
export class UsageDatabase extends Dexie {
  sessions!: Table<UsageSession, string>;
  events!: Table<UsageEvent, number>;

  constructor(name = 'aac-board-usage') {
    super(name);
    this.version(1).stores({
      sessions: 'id, startedAt',
      events: '++sequence, &eventId, sessionId, occurredAt'
    });
  }
}

export const usageDb = new UsageDatabase();

export async function startUsageSession(): Promise<UsageSession> {
  const session = { id: createId('usage'), startedAt: Date.now() };
  await usageDb.sessions.add(session);
  return session;
}

export async function endUsageSession(sessionId: string, endedAt: number): Promise<void> {
  await usageDb.sessions.update(sessionId, { endedAt });
}

export async function saveButtonPress(sessionId: string, press: ButtonPress): Promise<void> {
  const date = new Date(press.occurredAt);
  const event: UsageEvent = {
    ...press,
    eventId: createId('press'),
    sessionId,
    utcOffsetMinutes: -date.getTimezoneOffset(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
  await usageDb.transaction('rw', usageDb.sessions, usageDb.events, async () => {
    const session = await usageDb.sessions.get(sessionId);
    if (!session || session.endedAt !== undefined) {
      throw new Error('기록이 종료되어 이 버튼 누름을 저장하지 못했습니다.');
    }
    await usageDb.events.add(event);
  });
}

export function listUsageSessions(): Promise<UsageSession[]> {
  return usageDb.sessions.orderBy('startedAt').reverse().toArray();
}

export function readUsageEvents(sessionId?: string): Promise<UsageEvent[]> {
  return usageDb.transaction('r', usageDb.events, async () => {
    const events = sessionId
      ? await usageDb.events.where('sessionId').equals(sessionId).toArray()
      : await usageDb.events.orderBy('sequence').toArray();
    return events.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  });
}

function csvCell(value: string | number): string {
  // Preserve the raw names in the DB, but prevent formulas when opening a CSV.
  const text = typeof value === 'string' && (/^\s*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value))
    ? `'${value}`
    : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function localTimestamp(event: UsageEvent): string {
  const local = new Date(event.occurredAt + event.utcOffsetMinutes * 60_000).toISOString().slice(0, -1);
  const offset = Math.abs(event.utcOffsetMinutes);
  const hours = String(Math.floor(offset / 60)).padStart(2, '0');
  const minutes = String(offset % 60).padStart(2, '0');
  return `${local}${event.utcOffsetMinutes >= 0 ? '+' : '-'}${hours}:${minutes}`;
}

export function usageEventsToCsv(events: UsageEvent[]): string {
  const header = USAGE_CSV_HEADERS;
  const rows = events.map((event) => [event.sequence ?? '', event.eventId, event.sessionId, 'button_press',
    new Date(event.occurredAt).toISOString(), localTimestamp(event), event.occurredAt, event.utcOffsetMinutes,
    event.timeZone, event.boardId, event.boardName, event.itemId, event.buttonId, event.buttonName]);
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
