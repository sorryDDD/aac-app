import { useState } from 'react';
import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';
import type { AacButtonRecord, ButtonFormValue } from '../types/aac';
import { useAacStore } from '../store/aacStore';
import { ButtonForm } from '../components/ButtonForm';
import { ButtonLibrary } from '../components/ButtonLibrary';

export function ButtonMakerPage() {
  const buttons = useAacStore((state) => state.buttons);
  const loading = useAacStore((state) => state.loading);
  const initialized = useAacStore((state) => state.initialized);
  const saveButton = useAacStore((state) => state.saveButton);
  const deleteButton = useAacStore((state) => state.deleteButton);
  const [editingButton, setEditingButton] = useState<AacButtonRecord>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pageError, setPageError] = useState<string>();

  const handleSubmit = async (value: ButtonFormValue) => {
    setSaving(true);
    setPageError(undefined);
    try {
      await saveButton(value);
      setMessage(value.id ? 'AAC 버튼을 수정했습니다.' : 'AAC 버튼을 저장했습니다.');
      setEditingButton(undefined);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'AAC 버튼을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (button: AacButtonRecord) => {
    setEditingButton(button);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (button: AacButtonRecord) => {
    await deleteButton(button.id);
    if (editingButton?.id === button.id) {
      setEditingButton(undefined);
    }
    setMessage('AAC 버튼을 삭제했습니다.');
  };

  if (loading && !initialized) {
    return (
      <Box className="centeredPage">
        <CircularProgress aria-label="데이터 불러오는 중" />
      </Box>
    );
  }

  return (
    <Box className="buttonMakerPage">
      <Box className="makerFormPanel">
        <ButtonForm editingButton={editingButton} saving={saving} onSubmit={handleSubmit} onCancelEdit={() => setEditingButton(undefined)} />
        {pageError ? (
          <Alert severity="error" onClose={() => setPageError(undefined)}>
            {pageError}
          </Alert>
        ) : null}
      </Box>
      <Box className="makerLibraryPanel">
        <ButtonLibrary buttons={buttons} onEdit={handleEdit} onDelete={handleDelete} />
      </Box>
      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(undefined)} message={message} />
    </Box>
  );
}
