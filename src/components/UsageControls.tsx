import { useEffect, useState } from 'react';
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { listUsageSessions, readUsageEvents, usageEventsToCsv } from '../services/usage';
import { useUsageStore } from '../store/usageStore';
import type { UsageSession } from '../types/usage';

interface PreparedExport {
  url: string;
  filename: string;
  count: number;
  selection: string;
  revision: number;
}

export function UsageControls({ presentation }: { presentation: boolean }) {
  const { activeSessionId, starting, stopping, pending, saved, failed, revision, error, start, stop, clearError } = useUsageStore();
  const [sessions, setSessions] = useState<UsageSession[]>([]);
  const [selected, setSelected] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [prepared, setPrepared] = useState<PreparedExport>();
  const [exportError, setExportError] = useState<string>();
  const busy = starting || stopping || pending > 0;
  const exportReady = prepared?.selection === selected && prepared.revision === revision;

  useEffect(() => {
    let current = true;
    listUsageSessions().then((items) => {
      if (current) { setSessions(items); setExportError(undefined); }
    }).catch(() => {
      if (current) setExportError('사용 기록 목록을 불러오지 못했습니다. AAC 자료는 별도로 보관되어 있습니다.');
    });
    return () => { current = false; };
  }, [revision]);

  useEffect(() => {
    if (!prepared) return undefined;
    return () => URL.revokeObjectURL(prepared.url);
  }, [prepared]);

  const prepareExport = async () => {
    setExporting(true);
    setPrepared(undefined);
    setExportError(undefined);
    try {
      const events = await readUsageEvents(selected === 'all' ? undefined : selected);
      const blob = new Blob([usageEventsToCsv(events)], { type: 'text/csv;charset=utf-8' });
      setPrepared({ url: URL.createObjectURL(blob), count: events.length, selection: selected, revision,
        filename: `aac_usage_${selected === 'all' ? 'all' : 'session'}_${new Date().toISOString().slice(0, 10)}.csv` });
    } catch {
      setExportError('CSV 파일을 준비하지 못했습니다. 저장된 기록은 삭제하지 않았습니다.');
    } finally { setExporting(false); }
  };

  return (
    <>
      {!presentation ? (
        <Box component="section" aria-label="AAC 사용 기록" className="usageControls">
          <Typography variant="h2">AAC 사용 기록</Typography>
          <Typography color="text.secondary">
            기록 중인 프레젠테이션 화면에서 누른 버튼과 시각을 저장합니다. 편집 중 재생은 제외하며, 시각은 기기 시계를 따릅니다.
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            {activeSessionId
              ? <Button variant="contained" color="secondary" onClick={() => void stop()} disabled={stopping}>기록 종료</Button>
              : <Button variant="contained" onClick={() => void start()} disabled={busy || exporting}>기록 시작</Button>}
            <Typography role="status">
              {starting ? '기록 시작 준비 중' : stopping ? '기록 종료 저장 중' : activeSessionId ? '기록 중' : '기록 꺼짐'}
              {` · 이번 기록 저장 ${saved}건`}{pending > 0 ? ` · 저장 중 ${pending}건` : ''}
              {failed > 0 ? ` · 이 앱을 연 동안 저장 실패 ${failed}건` : ''}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <FormControl size="small" sx={{ minWidth: 230, maxWidth: '100%' }}>
              <InputLabel id="usage-export-label">내보낼 기록</InputLabel>
              <Select labelId="usage-export-label" label="내보낼 기록" value={selected}
                disabled={exporting || Boolean(activeSessionId) || busy} onChange={(event) => setSelected(event.target.value)}>
                <MenuItem value="all">전체 기록</MenuItem>
                {sessions.map((session) => (
                  <MenuItem key={session.id} value={session.id}>
                    {new Date(session.startedAt).toLocaleString('ko-KR')}
                    {session.endedAt === undefined ? ' (종료 시각 없음)' : ''}
                    {` · ${session.id.slice(-8)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" disabled={Boolean(activeSessionId) || busy || exporting} onClick={() => void prepareExport()}>
              {exporting ? 'CSV 준비 중' : 'CSV 준비'}
            </Button>
            {exportReady && prepared ? <Button component="a" href={prepared.url} download={prepared.filename} variant="contained">CSV 저장</Button> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            기록을 종료한 뒤 CSV를 준비하고 저장해 주세요. 파일을 내보내도 기록은 유지됩니다.
            앱을 다시 열면 기록은 꺼진 상태로 시작하며, 이전에 저장한 기록은 남습니다.
          </Typography>
          {exportReady && prepared ? <Alert severity="success" role="status">{prepared.count}건의 CSV 파일이 준비되었습니다. ‘CSV 저장’을 눌러 파일로 보관해 주세요.</Alert> : null}
          {exportError ? <Alert severity="error">{exportError}</Alert> : null}
        </Box>
      ) : activeSessionId ? <Box className="usagePresentationStatus" role="status">기록 중 · 저장 {saved}건{pending ? ` · 저장 중 ${pending}건` : ''}</Box> : null}
      {error ? <Alert severity="error" className={presentation ? 'usagePresentationError' : 'usageError'} onClose={clearError}>{error}</Alert> : null}
    </>
  );
}
