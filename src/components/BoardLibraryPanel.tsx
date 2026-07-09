import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WidgetsIcon from '@mui/icons-material/Widgets';
import type { PointerEvent } from 'react';
import type { AacButtonRecord } from '../types/aac';
import { AacButtonCard } from './AacButtonCard';
import { EmptyState } from './EmptyState';

interface BoardLibraryPanelProps {
  buttons: AacButtonRecord[];
  onStartDrag: (event: PointerEvent<HTMLElement>, button: AacButtonRecord) => void;
  onQuickAdd: (button: AacButtonRecord) => void;
}

export function BoardLibraryPanel({ buttons, onStartDrag, onQuickAdd }: BoardLibraryPanelProps) {
  const handleStartDrag = (event: PointerEvent<HTMLElement>, button: AacButtonRecord) => {
    if (event.pointerType === 'touch') {
      return;
    }

    onStartDrag(event, button);
  };

  return (
    <Box className="boardLibraryPanel">
      <Typography variant="h2" className="panelTitle">
        버튼 라이브러리
      </Typography>
      {buttons.length === 0 ? (
        <EmptyState
          title="사용할 버튼이 없습니다"
          description="먼저 AAC 버튼 제작 화면에서 버튼을 저장해 주세요."
          icon={<WidgetsIcon fontSize="large" />}
        />
      ) : (
        <Box className="boardLibraryList">
          {buttons.map((button) => (
            <AacButtonCard
              key={button.id}
              button={button}
              compact
              onPointerDown={handleStartDrag}
              action={
                <Tooltip title="보드에 추가">
                  <IconButton
                    aria-label={`${button.name} 보드에 추가`}
                    size="small"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onQuickAdd(button)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
