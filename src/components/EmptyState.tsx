import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <Box className="emptyState" role="status">
      {icon ? <Box className="emptyStateIcon">{icon}</Box> : null}
      <Typography variant="h2" className="panelTitle">
        {title}
      </Typography>
      {description ? <Typography color="text.secondary">{description}</Typography> : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}
