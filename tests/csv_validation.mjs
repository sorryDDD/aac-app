import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { usageEventsToCsv } = await import(pathToFileURL(resolve(process.argv[2])).href);
const event = { sequence: 1, eventId: 'event-1', sessionId: 'session-1', occurredAt: Date.UTC(2026,9,1,1,2,3,456),
 utcOffsetMinutes: 540, timeZone: 'Asia/Seoul', boardId:'board-1', boardName:'보드,"이름"\n둘째 줄',
 itemId:'item-1', buttonId:'button-1', buttonName:'=SUM(1,2)' };
const csv = usageEventsToCsv([event]);
assert.equal(csv.charCodeAt(0),0xfeff);
assert.ok(csv.includes('2026-10-01T10:02:03.456+09:00'));
assert.ok(csv.includes('2026-10-01T01:02:03.456Z'));
assert.ok(csv.includes('"보드,""이름""\n둘째 줄"'));
assert.ok(csv.includes('"\'=SUM(1,2)"'));
assert.ok(usageEventsToCsv([{...event,utcOffsetMinutes:-210}]).includes('2026-09-30T21:32:03.456-03:30'));
assert.equal(event.buttonName,'=SUM(1,2)');
assert.equal(usageEventsToCsv([]).split('\r\n').length,2);
console.log('PASS: CSV BOM, Korean/commas/quotes/newlines, formula protection, UTC/local millisecond timestamps, negative offset, input immutability, empty export');
