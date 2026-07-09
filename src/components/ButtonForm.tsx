import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormHelperText,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import type { AacButtonRecord, ButtonFormValue } from '../types/aac';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { ImageCropDialog } from './ImageCropDialog';
import { AudioRecorder } from './AudioRecorder';

interface ButtonFormProps {
  editingButton?: AacButtonRecord;
  saving?: boolean;
  onSubmit: (value: ButtonFormValue) => Promise<void>;
  onCancelEdit?: () => void;
}

export function ButtonForm({ editingButton, saving = false, onSubmit, onCancelEdit }: ButtonFormProps) {
  const [name, setName] = useState('');
  const [imageBlob, setImageBlob] = useState<Blob>();
  const [audioBlob, setAudioBlob] = useState<Blob>();
  const [sourceImageUrl, setSourceImageUrl] = useState<string>();
  const [cropOpen, setCropOpen] = useState(false);
  const [error, setError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useObjectUrl(imageBlob);

  useEffect(() => {
    setName(editingButton?.name ?? '');
    setImageBlob(editingButton?.imageBlob);
    setAudioBlob(editingButton?.audioBlob);
    setError(undefined);
  }, [editingButton]);

  useEffect(() => {
    return () => {
      if (sourceImageUrl) {
        URL.revokeObjectURL(sourceImageUrl);
      }
    };
  }, [sourceImageUrl]);

  const openCropForBlob = useCallback(
    (blob: Blob) => {
      if (sourceImageUrl) {
        URL.revokeObjectURL(sourceImageUrl);
      }
      const objectUrl = URL.createObjectURL(blob);
      setSourceImageUrl(objectUrl);
      setCropOpen(true);
    },
    [sourceImageUrl]
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일을 선택해 주세요.');
      return;
    }

    setError(undefined);
    openCropForBlob(file);
  };

  const handleCropComplete = (blob: Blob) => {
    setImageBlob(blob);
    setCropOpen(false);
    if (sourceImageUrl) {
      URL.revokeObjectURL(sourceImageUrl);
      setSourceImageUrl(undefined);
    }
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    if (sourceImageUrl) {
      URL.revokeObjectURL(sourceImageUrl);
      setSourceImageUrl(undefined);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('상징명을 입력해 주세요.');
      return;
    }

    if (!imageBlob) {
      setError('이미지를 선택하거나 촬영한 뒤 크롭해 주세요.');
      return;
    }

    if (!audioBlob) {
      setError('녹음 음성을 저장해 주세요.');
      return;
    }

    setError(undefined);
    await onSubmit({
      id: editingButton?.id,
      name: trimmedName,
      imageBlob,
      audioBlob
    });

    if (!editingButton) {
      setName('');
      setImageBlob(undefined);
      setAudioBlob(undefined);
    }
  };

  return (
    <Box className="formPanelContent" component="form" onSubmit={(event) => event.preventDefault()}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
        <Box>
          <Typography variant="h1" className="pageTitle">
            AAC 버튼 제작
          </Typography>
          <Typography color="text.secondary">상징명, 이미지, 음성을 하나의 AAC 버튼으로 저장합니다.</Typography>
        </Box>
        {editingButton && onCancelEdit ? (
          <Button startIcon={<CloseIcon />} onClick={onCancelEdit}>
            편집 취소
          </Button>
        ) : null}
      </Stack>

      <Divider />

      <TextField
        label="상징명"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        fullWidth
        inputProps={{ maxLength: 40 }}
      />

      <Box className="formSection">
        <Typography variant="h2" className="panelTitle">
          이미지
        </Typography>
        <Box className="imageInputGrid">
          <Box className="buttonImagePreview" aria-label="선택된 AAC 버튼 이미지">
            {previewUrl ? <Box component="img" src={previewUrl} alt="" /> : <Typography color="text.secondary">이미지 없음</Typography>}
          </Box>
          <Stack spacing={1}>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />
            <Button variant="contained" startIcon={<AddPhotoAlternateIcon />} onClick={() => fileInputRef.current?.click()}>
              사진 선택
            </Button>
            <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={() => cameraInputRef.current?.click()}>
              사진 촬영하기
            </Button>
            <FormHelperText>저장되는 이미지는 정사각형으로 크롭된 결과만 사용됩니다.</FormHelperText>
          </Stack>
        </Box>
      </Box>

      <Box className="formSection">
        <Typography variant="h2" className="panelTitle">
          녹음 음성
        </Typography>
        <AudioRecorder value={audioBlob} onChange={setAudioBlob} />
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Button variant="contained" size="large" startIcon={<SaveIcon />} disabled={saving} onClick={handleSubmit}>
        {saving ? '저장 중' : editingButton ? '수정 저장' : 'AAC 버튼 저장'}
      </Button>

      <ImageCropDialog open={cropOpen} imageSrc={sourceImageUrl} onCancel={handleCropCancel} onComplete={handleCropComplete} />
    </Box>
  );
}
