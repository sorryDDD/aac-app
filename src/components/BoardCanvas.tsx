import { Box, Typography } from '@mui/material';
import type { CSSProperties, PointerEvent, RefObject } from 'react';
import { useMemo } from 'react';
import type { AacButtonRecord, BoardItem, BoardRecord } from '../types/aac';
import { BOARD_HEIGHT, BOARD_WIDTH, GRID_SIZE } from '../utils/board';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { playAudioBlob } from '../services/audio';
import { useUsageStore } from '../store/usageStore';

interface MovingItem {
  itemId: string;
  x: number;
  y: number;
}

interface BoardCanvasProps {
  board: BoardRecord;
  buttons: AacButtonRecord[];
  boardRef: RefObject<HTMLDivElement | null>;
  selectedItemId?: string;
  movingItem?: MovingItem;
  presentation?: boolean;
  onSelectItem?: (itemId: string) => void;
  onItemPointerDown?: (event: PointerEvent<HTMLButtonElement>, item: BoardItem) => void;
  onPlaybackError?: (message: string) => void;
}

interface BoardCanvasItemProps {
  board: BoardRecord;
  item: BoardItem;
  button: AacButtonRecord;
  selected: boolean;
  moving?: MovingItem;
  presentation: boolean;
  onSelectItem?: (itemId: string) => void;
  onItemPointerDown?: (event: PointerEvent<HTMLButtonElement>, item: BoardItem) => void;
  onPlaybackError?: (message: string) => void;
}

function itemStyle(item: BoardItem, moving?: MovingItem, presentation = false): CSSProperties {
  const x = moving?.itemId === item.id ? moving.x : item.x;
  const y = moving?.itemId === item.id ? moving.y : item.y;

  return {
    left: `${(x / BOARD_WIDTH) * 100}%`,
    top: `${(y / BOARD_HEIGHT) * 100}%`,
    width: presentation
      ? `min(${(item.size / BOARD_WIDTH) * 100}vw, ${(item.size / BOARD_HEIGHT) * 100}dvh)`
      : `${(item.size / BOARD_WIDTH) * 100}%`
  };
}

function BoardCanvasItem({
  board,
  item,
  button,
  selected,
  moving,
  presentation,
  onSelectItem,
  onItemPointerDown,
  onPlaybackError
}: BoardCanvasItemProps) {
  const imageUrl = useObjectUrl(button.imageBlob);

  const handlePlay = async () => {
    const occurredAt = Date.now();
    // Start audio during the user gesture; recording must not delay playback.
    const playback = playAudioBlob(button.audioBlob);
    if (presentation) {
      void useUsageStore.getState().record({
        occurredAt, boardId: board.id, boardName: board.name,
        itemId: item.id, buttonId: button.id, buttonName: button.name
      });
    }
    try {
      await playback;
    } catch (error) {
      onPlaybackError?.(error instanceof Error ? error.message : '음성을 재생하지 못했습니다.');
    }
  };

  return (
    <button
      type="button"
      className={`boardItemButton ${selected ? 'boardItemSelected' : ''} ${presentation ? 'presentationButton' : ''}`}
      style={itemStyle(item, moving, presentation)}
      aria-label={`${button.name} 재생`}
      aria-pressed={selected && !presentation ? true : undefined}
      onPointerDown={(event) => {
        if (!presentation) {
          onSelectItem?.(item.id);
          onItemPointerDown?.(event, item);
        }
      }}
      onClick={handlePlay}
    >
      {imageUrl ? <img src={imageUrl} alt="" draggable={false} /> : null}
      <span>{button.name}</span>
    </button>
  );
}

export function BoardCanvas({
  board,
  buttons,
  boardRef,
  selectedItemId,
  movingItem,
  presentation = false,
  onSelectItem,
  onItemPointerDown,
  onPlaybackError
}: BoardCanvasProps) {
  const buttonMap = useMemo(() => new Map(buttons.map((button) => [button.id, button])), [buttons]);
  const visibleItems = board.items.filter((item) => buttonMap.has(item.buttonId));

  const boardStyle = {
    '--grid-x': `${(GRID_SIZE / BOARD_WIDTH) * 100}%`,
    '--grid-y': `${(GRID_SIZE / BOARD_HEIGHT) * 100}%`
  } as CSSProperties;

  return (
    <Box className={`boardCanvasShell ${presentation ? 'boardCanvasPresentationShell' : ''}`}>
      <Box
        ref={boardRef}
        className={`boardCanvas ${presentation ? 'boardCanvasPresentation' : ''}`}
        style={boardStyle}
        role="group"
        aria-label={`${board.name} AAC 보드`}
      >
        {visibleItems.map((item) => {
          const button = buttonMap.get(item.buttonId);
          if (!button) {
            return null;
          }

          return (
            <BoardCanvasItem
              key={item.id}
              board={board}
              item={item}
              button={button}
              selected={selectedItemId === item.id}
              moving={movingItem}
              presentation={presentation}
              onSelectItem={onSelectItem}
              onItemPointerDown={onItemPointerDown}
              onPlaybackError={onPlaybackError}
            />
          );
        })}
        {!presentation && visibleItems.length === 0 ? (
          <Box className="boardEmptyOverlay">
            <Typography fontWeight={700}>배치된 AAC 버튼이 없습니다</Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
