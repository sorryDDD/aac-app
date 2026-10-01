import { useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import { USAGE_CSV_HEADERS } from '../utils/usageCsv';

const labels = ['순번', '이벤트 ID', '기록 ID', '이벤트 종류', '시각 (UTC)', '시각 (기록 당시 현지)',
  '시각 (밀리초)', 'UTC 차이 (분)', '시간대', '보드 ID', '보드 이름', '배치 ID', '버튼 ID', '버튼 이름'];
const columns = [0, 5, 10, 13, 4, 6, 7, 8, 3, 1, 2, 9, 11, 12];

export function UsageCsvPreview({ filename, rows }: { filename: string; rows: string[][] }) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = Math.min(pageIndex, Math.max(0, Math.ceil(rows.length / 25) - 1));
  return (
    <Box component="section" aria-label="CSV 미리보기" className="usageCsvPreview">
      <Typography component="h3" variant="h2">CSV 미리보기</Typography>
      <Typography variant="body2" className="usageCsvFilename">{filename} · {rows.length}건</Typography>
      {rows.length === 0 ? <Typography role="status">기록된 버튼 누름이 없습니다. CSV에는 열 제목만 포함됩니다.</Typography> : (
        <>
          <Typography variant="body2" color="text.secondary">좌우로 스크롤하면 모든 열을 볼 수 있습니다. 파일에 저장되는 값을 그대로 표시합니다.</Typography>
          <TableContainer tabIndex={0} role="region" aria-label="CSV 기록 표" sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small" aria-label="CSV 사용 기록">
              <TableHead><TableRow>{columns.map((column) => (
                <TableCell key={column} title={USAGE_CSV_HEADERS[column]}>{labels[column]}</TableCell>
              ))}</TableRow></TableHead>
              <TableBody>{rows.slice(page * 25, (page + 1) * 25).map((row, index) => (
                <TableRow key={page * 25 + index}>{columns.map((column) => <TableCell key={column}>{row[column]}</TableCell>)}</TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={rows.length} page={page} rowsPerPage={25} rowsPerPageOptions={[25]}
            onPageChange={(_, next) => setPageIndex(next)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}건`}
            getItemAriaLabel={(type) => type === 'next' ? '다음 기록' : type === 'previous' ? '이전 기록' : type === 'first' ? '첫 기록' : '마지막 기록'} />
        </>
      )}
    </Box>
  );
}
