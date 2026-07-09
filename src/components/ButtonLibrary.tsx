import { Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useState } from 'react';
import type { AacButtonRecord } from '../types/aac';
import { AacButtonCard } from './AacButtonCard';
import { EmptyState } from './EmptyState';

interface ButtonLibraryProps {
  buttons: AacButtonRecord[];
  onEdit: (button: AacButtonRecord) => void;
  onDelete: (button: AacButtonRecord) => Promise<void>;
}

export function ButtonLibrary({ buttons, onEdit, onDelete }: ButtonLibraryProps) {
  const [deleteTarget, setDeleteTarget] = useState<AacButtonRecord>();
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box className="libraryPanelContent">
      <Typography variant="h2" className="pageTitle">
        AAC 버튼 라이브러리
      </Typography>
      {buttons.length === 0 ? (
        <EmptyState
          title="저장된 AAC 버튼이 없습니다"
          description="상징명, 이미지, 녹음을 입력한 뒤 저장하면 라이브러리에 표시됩니다."
          icon={<Inventory2Icon fontSize="large" />}
        />
      ) : (
        <Box className="buttonLibraryGrid">
          {buttons.map((button) => (
            <AacButtonCard key={button.id} button={button} onEdit={onEdit} onDelete={setDeleteTarget} />
          ))}
        </Box>
      )}

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(undefined)} aria-labelledby="delete-button-title">
        <DialogTitle id="delete-button-title">AAC 버튼 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget?.name} 버튼을 삭제하면 보드에 배치된 같은 버튼도 함께 제거됩니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(undefined)} disabled={deleting}>
            취소
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
