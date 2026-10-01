import Dexie from 'dexie';
import { createRoot } from 'react-dom/client';
import { createRef } from 'react';
import { BoardCanvas } from '../src/components/BoardCanvas';
import { db, ensureInitialBoard, loadAllData } from '../src/services/db';
import { UsageDatabase, usageDb, readUsageEvents, usageEventsToCsv } from '../src/services/usage';
import { useUsageStore } from '../src/store/usageStore';
import type { AacButtonRecord, BoardRecord } from '../src/types/aac';

// Only serve this harness on a fresh, disposable localhost origin. Never ship it.
const output = document.querySelector<HTMLPreElement>('#results')!;
const fixtureKey = 'aac-synthetic-fixture';
let before: string | undefined;
let fixture: { buttons: AacButtonRecord[]; boards: BoardRecord[] };
let version: number;
const root = createRoot(document.querySelector('#canvas')!);
const ref = createRef<HTMLDivElement>();
const log = (message: string) => { output.textContent += `${message}\n`; };
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); log(`PASS: ${message}`); };
const bytesHash = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())))
  .map((n) => n.toString(16).padStart(2, '0')).join('');
async function fingerprint(materials: typeof fixture) {
  return JSON.stringify({ buttons: await Promise.all([...materials.buttons].sort((a, b) => a.id.localeCompare(b.id)).map(async (button) => ({ ...button,
    imageBlob: { type: button.imageBlob.type, size: button.imageBlob.size, hash: await bytesHash(button.imageBlob) },
    audioBlob: { type: button.audioBlob.type, size: button.audioBlob.size, hash: await bytesHash(button.audioBlob) }
  }))), boards: materials.boards });
}
function wav() {
  const bytes = new Uint8Array(44 + 1600);
  const view = new DataView(bytes.buffer);
  const text = (start: number, value: string) => [...value].forEach((c, i) => { bytes[start + i] = c.charCodeAt(0); });
  text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, 1600, true);
  return new Blob([bytes], { type: 'audio/wav' });
}
async function prepare(requestedVersion: number) {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Localhost only');
  if (await Dexie.exists('aac-board-studio')) throw new Error('Existing DB detected; use a new disposable origin. Nothing deleted.');
  version = requestedVersion;
  const legacy = new Dexie('aac-board-studio');
  legacy.version(version).stores({ buttons: 'id, name, createdAt, updatedAt', boards: 'id, name, createdAt, updatedAt' });
  const imageBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#74c9bb"/><circle cx="80" cy="80" r="45" fill="white"/></svg>'], { type: 'image/svg+xml' });
  fixture = {
    buttons: [
      { id: 'synthetic-button-a', name: '검증 버튼', imageBlob, audioBlob: wav(), createdAt: 1000, updatedAt: 2000 },
      { id: 'synthetic-button-b', name: '=검증,"이름"\n둘째 줄', imageBlob, audioBlob: wav(), createdAt: 1001, updatedAt: 2001 }
    ],
    boards: [{ id: 'synthetic-board', name: '가상 검증 보드', createdAt: 1000, updatedAt: 2000,
      items: [{ id: 'synthetic-item-a', buttonId: 'synthetic-button-a', x: 100, y: 100, size: 150 },
        { id: 'synthetic-item-b', buttonId: 'synthetic-button-b', x: 400, y: 100, size: 200 }] }]
  };
  await legacy.table('buttons').bulkAdd(fixture.buttons);
  await legacy.table('boards').bulkAdd(fixture.boards);
  before = await fingerprint(fixture);
  sessionStorage.setItem(fixtureKey, JSON.stringify({ before, version }));
  legacy.close();
  log(`READY: synthetic version ${version}; ${fixture.buttons.length} buttons, 1 board; photo/audio SHA-256 saved`);
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if (c === '\r' && text[i + 1] === '\n' && !quoted) { row.push(field); rows.push(row); row = []; field = ''; i++; }
    else field += c;
  }
  return rows;
}
async function waitForSaves() {
  for (let i = 0; useUsageStore.getState().pending && i < 500; i++) await new Promise((r) => setTimeout(r, 10));
  assert(useUsageStore.getState().pending === 0, 'all pending writes settled');
}
async function mount(presentation: boolean) {
  root.render(<BoardCanvas board={fixture.boards[0]} buttons={fixture.buttons} boardRef={ref} presentation={presentation} />);
  for (let i = 0; !document.querySelector('.boardItemButton') && i < 100; i++) await new Promise((r) => setTimeout(r, 10));
  await new Promise((r) => setTimeout(r, 30));
}
async function verifyMaterials() {
  const marker = JSON.parse(sessionStorage.getItem(fixtureKey) ?? 'null');
  if (!marker) throw new Error('No synthetic fixture marker; no DB operation attempted.');
  const expected = JSON.parse(marker.before);
  expected.buttons.sort((a: AacButtonRecord, b: AacButtonRecord) => a.id.localeCompare(b.id));
  before = JSON.stringify(expected);
  version = marker.version;
  const initialBoard = await ensureInitialBoard();
  fixture = await loadAllData();
  assert(initialBoard.id === 'synthetic-board', 'existing board reused; no replacement created');
  assert(await fingerprint(fixture) === before, `v${version} materials/Blob bytes unchanged after loading current code`);
}
async function run() {
  await verifyMaterials();
  const originalPlay = HTMLMediaElement.prototype.play;
  let playbackCalls = 0;
  HTMLMediaElement.prototype.play = function () { playbackCalls++; return Promise.resolve(); };
  try {
    await mount(true);
    const click = () => (document.querySelector('.boardItemButton') as HTMLButtonElement).click();
    const initialCount = (await readUsageEvents()).length;
    click();
    await waitForSaves();
    assert((await readUsageEvents()).length === initialCount, 'recording off: no event');
    await useUsageStore.getState().start();
    const sessionId = useUsageStore.getState().activeSessionId!;
    assert(Boolean(sessionId), 'recording starts only after session persistence');
    await mount(false);
    click();
    await waitForSaves();
    assert((await readUsageEvents(sessionId)).length === 0, 'editor preview: no event');
    await mount(true);
    for (let i = 0; i < 50; i++) click();
    await waitForSaves();
    let events = await readUsageEvents(sessionId);
    assert(events.length === 50, '50 rapid repeated clicks produce 50 saved events');
    assert(new Set(events.map((e) => e.eventId)).size === 50, 'unique IDs preserve repeated presses');
    assert(events.every((e, i) => i === 0 || e.sequence! > events[i - 1].sequence!), 'capture order retained');
    assert(events.every((e) => e.boardId === 'synthetic-board' && e.itemId === 'synthetic-item-a'), 'board/item/button context captured');
    const press = { occurredAt: Date.UTC(2026, 9, 1, 1, 2, 3, 456), boardId: 'test-id', boardName: '보드,"이름"\n둘째 줄',
      itemId: 'test-item', buttonId: 'test-button', buttonName: '=SUM(1,2)' };
    await useUsageStore.getState().record(press);
    const quotaFailure = () => { throw new DOMException('synthetic quota failure', 'QuotaExceededError'); };
    usageDb.events.hook('creating', quotaFailure);
    const playedBefore = playbackCalls;
    click();
    await waitForSaves();
    usageDb.events.hook('creating').unsubscribe(quotaFailure);
    assert(playbackCalls === playedBefore + 1, 'storage failure does not block playback');
    assert(useUsageStore.getState().failed === 1 && Boolean(useUsageStore.getState().error), 'storage failure counted and reported');
    assert((await readUsageEvents(sessionId)).length === 51, 'failed write leaves previously saved events intact');
    // Submit writes immediately before stopping: each must finish, without leaking into later sessions.
    for (let i = 0; i < 12; i++) click();
    await useUsageStore.getState().stop();
    await waitForSaves();
    events = await readUsageEvents(sessionId);
    assert(events.length === 63, 'stop flushes already submitted writes');
    assert((await usageDb.sessions.get(sessionId))?.endedAt !== undefined, 'end timestamp saved');
    click();
    await waitForSaves();
    assert((await readUsageEvents(sessionId)).length === 63, 'stopped recording: no event');
    const csv = usageEventsToCsv(events);
    const parsed = parseCsv(csv);
    assert(csv.charCodeAt(0) === 0xfeff && parsed.length === 64, 'CSV BOM and row count match DB');
    const special = parsed.find((row) => row[13] === "'=SUM(1,2)")!;
    assert(special?.[10] === press.boardName, 'CSV keeps Korean, commas, quotes and embedded newlines');
    assert(special?.[4] === '2026-10-01T01:02:03.456Z' && Number(special[6]) === press.occurredAt, 'CSV keeps exact millisecond timestamp');
    assert(Date.parse(special[5]) === press.occurredAt, 'local timestamp offset represents the same instant');
    const negative = usageEventsToCsv([{ ...events[0], utcOffsetMinutes: -210 }]);
    assert(parseCsv(negative)[1][7] === '-210', 'numeric negative timezone offsets remain numeric');
    assert((await readUsageEvents(sessionId)).length === 63, 'export does not delete events');
    const reopened = new UsageDatabase();
    assert((await reopened.events.where('sessionId').equals(sessionId).count()) === 63, 'new DB connection sees persisted events');
    reopened.close();
    await useUsageStore.getState().start();
    const nextSession = useUsageStore.getState().activeSessionId!;
    click();
    await waitForSaves();
    await useUsageStore.getState().stop();
    assert((await readUsageEvents(nextSession)).length === 1 && (await readUsageEvents(sessionId)).length === 63, 'session filtering isolates each recording');
    const startFailure = () => { throw new DOMException('synthetic start failure', 'QuotaExceededError'); };
    usageDb.sessions.hook('creating', startFailure);
    await useUsageStore.getState().start();
    usageDb.sessions.hook('creating').unsubscribe(startFailure);
    assert(!useUsageStore.getState().activeSessionId && !useUsageStore.getState().starting, 'failed start does not enable recording');
    assert(await fingerprint(await loadAllData()) === before, 'AAC fields/photo/audio hashes unchanged after recording, failure, stop and export');
    assert(db.verno === 2 && usageDb.verno === 1, 'material schema unchanged; separate recording database');
    log(`COMPLETE: all tests passed; original fixture version ${version}; browser ${navigator.userAgent}`);
  } finally { HTMLMediaElement.prototype.play = originalPlay; }
}
function action(id: string, task: () => Promise<unknown>) {
  document.querySelector<HTMLButtonElement>(id)!.onclick = async () => {
    const button = document.querySelector<HTMLButtonElement>(id)!;
    button.disabled = true;
    try { await task(); } catch (error) { log(`FAIL: ${error instanceof Error ? error.stack : String(error)}`); }
    finally { button.disabled = false; }
  };
}
action('#seed-v1', () => prepare(1));
action('#seed-v2', () => prepare(2));
action('#compare', verifyMaterials);
action('#run', run);
action('#cache', async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) await registration.update();
  log(`SW registrations: ${registrations.map((r) => r.active?.scriptURL).join(', ')}`);
  log(`Caches: ${(await caches.keys()).join(', ')}`);
});
