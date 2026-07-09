import { Box } from '@mui/material';
import type { AacButtonRecord } from '../types/aac';
import { useObjectUrl } from '../hooks/useObjectUrl';

interface DragPreviewProps {
  button?: AacButtonRecord;
  x: number;
  y: number;
}

export function DragPreview({ button, x, y }: DragPreviewProps) {
  const imageUrl = useObjectUrl(button?.imageBlob);

  if (!button) {
    return null;
  }

  return (
    <Box className="dragPreview" style={{ left: x, top: y }} aria-hidden>
      {imageUrl ? <img src={imageUrl} alt="" /> : null}
      <span>{button.name}</span>
    </Box>
  );
}
