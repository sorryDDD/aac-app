import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { PointerEvent, ReactNode } from 'react';
import type { AacButtonRecord } from '../types/aac';
import { useObjectUrl } from '../hooks/useObjectUrl';

interface AacButtonCardProps {
  button: AacButtonRecord;
  onEdit?: (button: AacButtonRecord) => void;
  onDelete?: (button: AacButtonRecord) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>, button: AacButtonRecord) => void;
  action?: ReactNode;
  compact?: boolean;
}

export function AacButtonCard({ button, onEdit, onDelete, onPointerDown, action, compact = false }: AacButtonCardProps) {
  const imageUrl = useObjectUrl(button.imageBlob);

  return (
    <Paper
      className={`aacButtonCard ${compact ? 'aacButtonCardCompact' : ''} ${onPointerDown ? 'aacButtonCardDraggable' : ''}`}
      component="article"
      tabIndex={0}
      onPointerDown={onPointerDown ? (event) => onPointerDown(event, button) : undefined}
      aria-label={`${button.name} AAC 버튼`}
      elevation={0}
    >
      <Box className="aacButtonThumb">
        {imageUrl ? <Box component="img" src={imageUrl} alt="" /> : null}
      </Box>
      <Typography className="aacButtonName" title={button.name}>
        {button.name}
      </Typography>
      {(onEdit || onDelete || action) && (
        <Box className="aacButtonActions">
          {action}
          {onEdit ? (
            <Tooltip title="수정">
              <IconButton aria-label={`${button.name} 수정`} onClick={() => onEdit(button)} size="small">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {onDelete ? (
            <Tooltip title="삭제">
              <IconButton aria-label={`${button.name} 삭제`} onClick={() => onDelete(button)} size="small" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      )}
    </Paper>
  );
}
