export interface UsageSession {
  id: string;
  startedAt: number;
  endedAt?: number;
}

export interface UsageEvent {
  sequence?: number;
  eventId: string;
  sessionId: string;
  occurredAt: number;
  utcOffsetMinutes: number;
  timeZone: string;
  boardId: string;
  boardName: string;
  itemId: string;
  buttonId: string;
  buttonName: string;
}

export type ButtonPress = Pick<UsageEvent, 'boardId' | 'boardName' | 'itemId' | 'buttonId' | 'buttonName' | 'occurredAt'>;
