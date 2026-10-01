export const USAGE_CSV_HEADERS = [
  'sequence', 'event_id', 'session_id', 'event_type', 'timestamp_utc', 'timestamp_local',
  'timestamp_epoch_ms', 'utc_offset_minutes', 'time_zone', 'board_id', 'board_name',
  'item_id', 'button_id', 'button_name'
];

/** Read exported CSV without changing quoted commas, line breaks, or formula protection. */
export function parseUsageCsv(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  const endCell = () => { row.push(cell); cell = ''; state = 'start'; };
  const endRow = () => { endCell(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (state === 'quoted') {
      if (char !== '"') cell += char;
      else if (text[i + 1] === '"') { cell += '"'; i += 1; }
      else state = 'closed';
      continue;
    }
    if (char === ',') { endCell(); continue; }
    if (char === '\r' || char === '\n') {
      endRow();
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      continue;
    }
    if (state === 'closed' || (char === '"' && state !== 'start')) {
      throw new Error('CSV의 따옴표 형식이 올바르지 않습니다.');
    }
    if (char === '"') state = 'quoted';
    else { cell += char; state = 'plain'; }
  }
  if (state === 'quoted') throw new Error('CSV의 따옴표가 닫히지 않았습니다.');
  if (state !== 'start' || row.length > 0) endRow();
  const header = rows.shift();
  if (!header || header.length !== USAGE_CSV_HEADERS.length || header.some((value, index) => value !== USAGE_CSV_HEADERS[index])) {
    throw new Error('이 앱에서 저장한 AAC 사용 기록 CSV를 선택해 주세요.');
  }
  if (rows.some((values) => values.length !== USAGE_CSV_HEADERS.length)) {
    throw new Error('CSV의 열 개수가 올바르지 않습니다.');
  }
  return rows;
}
