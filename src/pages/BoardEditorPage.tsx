import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import SaveIcon from '@mui/icons-material/Save';
import type { PointerEvent as ReactPointerEvent, SyntheticEvent, TouchEvent as ReactTouchEvent } from 'react';
import type { AacButtonRecord, BoardItem, BoardRecord, Point } from '../types/aac';
import { useAacStore } from '../store/aacStore';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEFAULT_ITEM_SIZE,
  clampItem,
  clientToBoardPoint,
  isInsideRect,
  snapPoint
} from '../utils/board';
import { BoardCanvas } from '../components/BoardCanvas';
import { BoardLibraryPanel } from '../components/BoardLibraryPanel';
import { DragPreview } from '../components/DragPreview';
import { EmptyState } from '../components/EmptyState';

const MOVE_START_THRESHOLD_PX = 8;
const PRESENTATION_EXIT_HOLD_MS = 3000;

type DragState =
  | {
      kind: 'new';
      buttonId: string;
      clientX: number;
      clientY: number;
    }
  | {
      kind: 'move';
      itemId: string;
      offsetX: number;
      offsetY: number;
      size: number;
      active: boolean;
      startClientX: number;
      startClientY: number;
      x: number;
      y: number;
    };

type NameDialogState = {
  mode: 'new' | 'rename';
  title: string;
  value: string;
};

function getBoardPointForItem(rect: DOMRect, clientX: number, clientY: number, size: number, snap: boolean, offset?: Point): Point {
  const pointer = clientToBoardPoint(rect, clientX, clientY);
  const rawPoint = {
    x: pointer.x - (offset?.x ?? size / 2),
    y: pointer.y - (offset?.y ?? size / 2)
  };

  return clampItem(snapPoint(rawPoint, snap), size);
}

function findOpenPoint(board: BoardRecord, snap: boolean): Point {
  const index = board.items.length;
  const columns = 5;
  const x = 40 + (index % columns) * 170;
  const y = 40 + Math.floor(index / columns) * 170;
  return clampItem(snapPoint({ x, y }, snap), DEFAULT_ITEM_SIZE);
}

export function BoardEditorPage() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const buttons = useAacStore((state) => state.buttons);
  const boards = useAacStore((state) => state.boards);
  const activeBoardId = useAacStore((state) => state.activeBoardId);
  const loading = useAacStore((state) => state.loading);
  const initialized = useAacStore((state) => state.initialized);
  const setActiveBoard = useAacStore((state) => state.setActiveBoard);
  const createBoard = useAacStore((state) => state.createBoard);
  const renameBoard = useAacStore((state) => state.renameBoard);
  const duplicateBoard = useAacStore((state) => state.duplicateBoard);
  const deleteBoard = useAacStore((state) => state.deleteBoard);
  const addBoardItem = useAacStore((state) => state.addBoardItem);
  const updateBoardItem = useAacStore((state) => state.updateBoardItem);
  const removeBoardItem = useAacStore((state) => state.removeBoardItem);
  const saveBoard = useAacStore((state) => state.saveBoard);
  const presentationMode = useAacStore((state) => state.presentationMode);
  const setPresentationMode = useAacStore((state) => state.setPresentationMode);

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [draftSize, setDraftSize] = useState(DEFAULT_ITEM_SIZE);
  const [message, setMessage] = useState<string>();
  const [pageError, setPageError] = useState<string>();
  const [exitPresentationDialogOpen, setExitPresentationDialogOpen] = useState(false);
  const exitHoldTimerRef = useRef<number | undefined>(undefined);

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? boards[0],
    [activeBoardId, boards]
  );
  const buttonMap = useMemo(() => new Map(buttons.map((button) => [button.id, button])), [buttons]);
  const selectedItem = activeBoard?.items.find((item) => item.id === selectedItemId);
  const selectedButton = selectedItem ? buttonMap.get(selectedItem.buttonId) : undefined;

  useEffect(() => {
    if (activeBoard && !activeBoard.items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(undefined);
    }
  }, [activeBoard, selectedItemId]);

  useEffect(() => {
    if (selectedItem) {
      setDraftSize(selectedItem.size);
    }
  }, [selectedItem]);

  useEffect(() => {
    return () => setPresentationMode(false);
  }, [setPresentationMode]);

	  useEffect(() => {
	    if (!presentationMode) {
	      return undefined;
	    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresentationMode(false);
      }
    };

	    window.addEventListener('keydown', handleKeyDown);
	    return () => {
	      window.removeEventListener('keydown', handleKeyDown);
	    };
		  }, [presentationMode, setPresentationMode]);

  useEffect(() => {
    if (!presentationMode) {
      setExitPresentationDialogOpen(false);
      if (exitHoldTimerRef.current) {
        window.clearTimeout(exitHoldTimerRef.current);
        exitHoldTimerRef.current = undefined;
      }
    }
  }, [presentationMode]);

  useEffect(() => {
    return () => {
      if (exitHoldTimerRef.current) {
        window.clearTimeout(exitHoldTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dragState || !activeBoard) {
      return undefined;
    }

    const handleMove = (event: PointerEvent) => {
      if (dragState.kind === 'new') {
        event.preventDefault();
        setDragState({ ...dragState, clientX: event.clientX, clientY: event.clientY });
        return;
      }

      const movementX = event.clientX - dragState.startClientX;
      const movementY = event.clientY - dragState.startClientY;
      if (!dragState.active && Math.hypot(movementX, movementY) < MOVE_START_THRESHOLD_PX) {
        return;
      }

      event.preventDefault();
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const point = getBoardPointForItem(rect, event.clientX, event.clientY, dragState.size, snapEnabled, {
        x: dragState.offsetX,
        y: dragState.offsetY
      });

      setDragState({ ...dragState, active: true, x: point.x, y: point.y });
    };

    const handleUp = (event: PointerEvent) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) {
        setDragState(null);
        return;
      }

      if (dragState.kind === 'new') {
        if (isInsideRect(rect, event.clientX, event.clientY)) {
          const point = getBoardPointForItem(rect, event.clientX, event.clientY, DEFAULT_ITEM_SIZE, snapEnabled);
          void addBoardItem(activeBoard.id, dragState.buttonId, point)
            .then((item) => {
              setSelectedItemId(item.id);
              setMessage('보드에 AAC 버튼을 배치했습니다.');
            })
            .catch((error) => setPageError(error instanceof Error ? error.message : '보드에 배치하지 못했습니다.'));
        }
        setDragState(null);
        return;
      }

      if (!dragState.active) {
        setDragState(null);
        return;
      }

      event.preventDefault();
      const point = getBoardPointForItem(rect, event.clientX, event.clientY, dragState.size, snapEnabled, {
        x: dragState.offsetX,
        y: dragState.offsetY
      });
      void updateBoardItem(activeBoard.id, dragState.itemId, point).catch((error) =>
        setPageError(error instanceof Error ? error.message : '위치를 저장하지 못했습니다.')
      );
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: false });
    window.addEventListener('pointercancel', handleUp, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [activeBoard, addBoardItem, dragState, snapEnabled, updateBoardItem]);

  const handleStartNewDrag = (event: ReactPointerEvent<HTMLElement>, button: AacButtonRecord) => {
    if (!activeBoard) {
      return;
    }

    event.preventDefault();
    setDragState({
      kind: 'new',
      buttonId: button.id,
      clientX: event.clientX,
      clientY: event.clientY
    });
  };

  const handleStartMove = (event: ReactPointerEvent<HTMLButtonElement>, item: BoardItem) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const pointer = clientToBoardPoint(rect, event.clientX, event.clientY);
    setDragState({
      kind: 'move',
      itemId: item.id,
      offsetX: pointer.x - item.x,
      offsetY: pointer.y - item.y,
      size: item.size,
      active: false,
      startClientX: event.clientX,
      startClientY: event.clientY,
      x: item.x,
      y: item.y
    });
  };

  const handleQuickAdd = async (button: AacButtonRecord) => {
    if (!activeBoard) {
      return;
    }

    try {
      const item = await addBoardItem(activeBoard.id, button.id, findOpenPoint(activeBoard, snapEnabled));
      setSelectedItemId(item.id);
      setMessage('보드에 AAC 버튼을 추가했습니다.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '보드에 추가하지 못했습니다.');
    }
  };

  const handleNameDialogSubmit = async () => {
    if (!nameDialog) {
      return;
    }

    try {
      if (nameDialog.mode === 'new') {
        await createBoard(nameDialog.value);
        setMessage('새 보드를 만들었습니다.');
      } else if (activeBoard) {
        await renameBoard(activeBoard.id, nameDialog.value);
        setMessage('보드 이름을 변경했습니다.');
      }
      setNameDialog(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '보드 정보를 저장하지 못했습니다.');
    }
  };

  const handleDuplicateBoard = async () => {
    if (!activeBoard) {
      return;
    }

    try {
      await duplicateBoard(activeBoard.id);
      setMessage('보드를 복제했습니다.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '보드를 복제하지 못했습니다.');
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) {
      return;
    }

    try {
      await deleteBoard(activeBoard.id);
      setDeleteDialogOpen(false);
      setSelectedItemId(undefined);
      setMessage('보드를 삭제했습니다.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '보드를 삭제하지 못했습니다.');
    }
  };

  const handleSaveBoard = async () => {
    if (!activeBoard) {
      return;
    }

    try {
      await saveBoard(activeBoard.id);
      setMessage('보드를 저장했습니다.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '보드를 저장하지 못했습니다.');
    }
  };

	  const handleEnterPresentation = () => {
	    setPresentationMode(true);
	  };

  const handleStartPresentationExitHold = (event: ReactPointerEvent<HTMLElement> | ReactTouchEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!presentationMode || exitHoldTimerRef.current) {
      return;
    }

    exitHoldTimerRef.current = window.setTimeout(() => {
      exitHoldTimerRef.current = undefined;
      setExitPresentationDialogOpen(true);
    }, PRESENTATION_EXIT_HOLD_MS);
  };

  const handleStartPresentationExitPointerHold = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') {
      return;
    }

    handleStartPresentationExitHold(event);
  };

  const handleStartPresentationExitTouchHold = (event: ReactTouchEvent<HTMLElement>) => {
    handleStartPresentationExitHold(event);
  };

  const handleCancelPresentationExitHold = (event?: ReactPointerEvent<HTMLElement> | ReactTouchEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!exitHoldTimerRef.current) {
      return;
    }

    window.clearTimeout(exitHoldTimerRef.current);
    exitHoldTimerRef.current = undefined;
  };

  const handleCancelPresentationExitPointerHold = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') {
      return;
    }

    handleCancelPresentationExitHold(event);
  };

  const handleCancelPresentationExitTouchHold = (event: ReactTouchEvent<HTMLElement>) => {
    handleCancelPresentationExitHold(event);
  };

  const handleExitPresentation = () => {
    handleCancelPresentationExitHold();
    setExitPresentationDialogOpen(false);
    setPresentationMode(false);
  };

  const preventPresentationHotspotDefault = (event: SyntheticEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSizeCommit = async (_: Event | SyntheticEvent, value: number | number[]) => {
    if (!activeBoard || !selectedItem) {
      return;
    }

    const nextSize = Array.isArray(value) ? value[0] : value;
    const clampedPoint = clampItem({ x: selectedItem.x, y: selectedItem.y }, nextSize);
    try {
      await updateBoardItem(activeBoard.id, selectedItem.id, {
        size: nextSize,
        x: clampedPoint.x,
        y: clampedPoint.y
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '크기를 저장하지 못했습니다.');
    }
  };

  if (loading && !initialized) {
    return (
      <Box className="centeredPage">
        <CircularProgress aria-label="데이터 불러오는 중" />
      </Box>
    );
  }

  if (!activeBoard) {
    return (
      <Box className="centeredPage">
        <EmptyState title="보드를 불러오지 못했습니다" description="브라우저 저장소 권한을 확인해 주세요." />
      </Box>
    );
  }

  const movingItem =
    dragState?.kind === 'move'
      ? {
          itemId: dragState.itemId,
          x: dragState.x,
          y: dragState.y
        }
      : undefined;
  const dragButton = dragState?.kind === 'new' ? buttonMap.get(dragState.buttonId) : undefined;

  return (
    <Box className={`boardEditorPage ${presentationMode ? 'boardEditorPresentationPage' : ''}`}>
      {!presentationMode ? (
        <Box className="boardToolbar" component="section" aria-label="보드 관리">
          <FormControl size="small" className="boardSelectControl">
            <InputLabel id="board-select-label">보드</InputLabel>
            <Select
              labelId="board-select-label"
              label="보드"
              value={activeBoard.id}
              onChange={(event) => setActiveBoard(event.target.value)}
            >
              {boards.map((board) => (
                <MenuItem key={board.id} value={board.id}>
                  {board.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Tooltip title="새 보드">
              <IconButton
                aria-label="새 보드"
                onClick={() => setNameDialog({ mode: 'new', title: '새 보드', value: '새 AAC 보드' })}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="이름 변경">
              <IconButton
                aria-label="보드 이름 변경"
                onClick={() => setNameDialog({ mode: 'rename', title: '보드 이름 변경', value: activeBoard.name })}
              >
                <DriveFileRenameOutlineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="복제">
              <IconButton aria-label="보드 복제" onClick={handleDuplicateBoard}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="삭제">
              <IconButton aria-label="보드 삭제" color="error" onClick={() => setDeleteDialogOpen(true)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} className="snapSwitch">
            <Switch
              checked={snapEnabled}
              onChange={(event) => setSnapEnabled(event.target.checked)}
              inputProps={{ 'aria-label': '격자 스냅' }}
            />
            <Typography fontWeight={700}>격자 스냅</Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveBoard}>
              저장
            </Button>
            <Button variant="contained" startIcon={<FullscreenIcon />} onClick={handleEnterPresentation}>
              프레젠테이션
            </Button>
          </Stack>
        </Box>
      ) : null}

      <Box className={`boardWorkspace ${presentationMode ? 'boardWorkspacePresentation' : ''}`}>
        {!presentationMode ? (
          <Box className="boardSidePanel">
            <BoardLibraryPanel buttons={buttons} onStartDrag={handleStartNewDrag} onQuickAdd={handleQuickAdd} />
          </Box>
        ) : null}

        <Box className={`boardCenterPanel ${presentationMode ? 'boardCenterPanelPresentation' : ''}`}>
          {!presentationMode ? (
            <Typography variant="h1" className="pageTitle">
              {activeBoard.name}
            </Typography>
          ) : null}
          <BoardCanvas
            board={activeBoard}
            buttons={buttons}
            boardRef={boardRef}
            selectedItemId={presentationMode ? undefined : selectedItemId}
            movingItem={presentationMode ? undefined : movingItem}
            presentation={presentationMode}
            onSelectItem={presentationMode ? undefined : setSelectedItemId}
            onItemPointerDown={presentationMode ? undefined : handleStartMove}
            onPlaybackError={setPageError}
          />
        </Box>

        {!presentationMode ? (
          <Box className="inspectorPanel">
            <Typography variant="h2" className="panelTitle">
              선택 항목
            </Typography>
            {selectedItem && selectedButton ? (
              <Stack spacing={2}>
                <Typography fontWeight={800}>{selectedButton.name}</Typography>
                <Box>
                  <Typography id="size-slider-label" fontWeight={700}>
                    버튼 크기
                  </Typography>
                  <Slider
                    aria-labelledby="size-slider-label"
                    value={draftSize}
                    min={90}
                    max={280}
                    step={10}
                    onChange={(_, value) => setDraftSize(Array.isArray(value) ? value[0] : value)}
                    onChangeCommitted={handleSizeCommit}
                  />
                </Box>
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  onClick={() =>
                    removeBoardItem(activeBoard.id, selectedItem.id)
                      .then(() => {
                        setSelectedItemId(undefined);
                        setMessage('배치된 버튼을 삭제했습니다.');
                      })
                      .catch((error) => setPageError(error instanceof Error ? error.message : '삭제하지 못했습니다.'))
                  }
                >
                  배치 삭제
                </Button>
              </Stack>
            ) : (
              <Typography color="text.secondary">보드에서 AAC 버튼을 선택하면 크기와 삭제 동작을 사용할 수 있습니다.</Typography>
            )}
          </Box>
        ) : null}
      </Box>

      {presentationMode ? (
        <>
          <Box
            className="presentationExitHotspot presentationExitHotspotLeft"
            aria-hidden="true"
            onPointerDown={handleStartPresentationExitPointerHold}
            onPointerUp={handleCancelPresentationExitPointerHold}
            onTouchStart={handleStartPresentationExitTouchHold}
            onTouchEnd={handleCancelPresentationExitTouchHold}
            onTouchMove={preventPresentationHotspotDefault}
            onTouchCancel={preventPresentationHotspotDefault}
            onContextMenu={preventPresentationHotspotDefault}
          />
          <Box
            className="presentationExitHotspot presentationExitHotspotRight"
            aria-hidden="true"
            onPointerDown={handleStartPresentationExitPointerHold}
            onPointerUp={handleCancelPresentationExitPointerHold}
            onTouchStart={handleStartPresentationExitTouchHold}
            onTouchEnd={handleCancelPresentationExitTouchHold}
            onTouchMove={preventPresentationHotspotDefault}
            onTouchCancel={preventPresentationHotspotDefault}
            onContextMenu={preventPresentationHotspotDefault}
          />
        </>
      ) : null}

      {!presentationMode && dragState?.kind === 'new' ? <DragPreview button={dragButton} x={dragState.clientX} y={dragState.clientY} /> : null}

      <Dialog open={Boolean(nameDialog) && !presentationMode} onClose={() => setNameDialog(null)} aria-labelledby="board-name-dialog-title">
        <DialogTitle id="board-name-dialog-title">{nameDialog?.title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="보드 이름"
            fullWidth
            value={nameDialog?.value ?? ''}
            onChange={(event) => setNameDialog((current) => (current ? { ...current, value: event.target.value } : current))}
            inputProps={{ maxLength: 48 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNameDialog(null)}>취소</Button>
          <Button variant="contained" onClick={handleNameDialogSubmit}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen && !presentationMode} onClose={() => setDeleteDialogOpen(false)} aria-labelledby="delete-board-dialog-title">
        <DialogTitle id="delete-board-dialog-title">보드 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>{activeBoard.name} 보드를 삭제합니다. 삭제 후 최소 하나의 보드는 자동으로 유지됩니다.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button color="error" variant="contained" onClick={handleDeleteBoard}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={exitPresentationDialogOpen && presentationMode}
        onClose={() => setExitPresentationDialogOpen(false)}
        aria-labelledby="exit-presentation-dialog-title"
        sx={{ zIndex: 2300 }}
      >
        <DialogTitle id="exit-presentation-dialog-title">프레젠테이션 종료</DialogTitle>
        <DialogContent>
          <DialogContentText>보드 편집 화면으로 돌아갑니다.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitPresentationDialogOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleExitPresentation}>
            종료
          </Button>
        </DialogActions>
      </Dialog>

      {!presentationMode && pageError ? (
        <Alert severity="error" className="floatingAlert" onClose={() => setPageError(undefined)}>
          {pageError}
        </Alert>
      ) : null}
      <Snackbar open={Boolean(message) && !presentationMode} autoHideDuration={3000} onClose={() => setMessage(undefined)} message={message} />
    </Box>
  );
}
