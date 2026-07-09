import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { getCroppedImageBlob } from '../utils/imageCrop';
import { useObjectUrl } from '../hooks/useObjectUrl';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc?: string;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
}

export function ImageCropDialog({ open, imageSrc, onCancel, onComplete }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area>();
  const [previewBlob, setPreviewBlob] = useState<Blob>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const previewUrl = useObjectUrl(previewBlob);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(undefined);
      setPreviewBlob(undefined);
      setSaving(false);
      setError(undefined);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !imageSrc || !croppedAreaPixels) {
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
        if (!cancelled) {
          setPreviewBlob(blob);
        }
      } catch {
        if (!cancelled) {
          setPreviewBlob(undefined);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [croppedAreaPixels, imageSrc, open]);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onComplete(blob);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '크롭 이미지를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onCancel} fullWidth maxWidth="md" aria-labelledby="crop-dialog-title">
      <DialogTitle id="crop-dialog-title">이미지 크롭</DialogTitle>
      <DialogContent>
        <Box className="cropDialogGrid">
          <Box className="cropperFrame">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            ) : null}
          </Box>
          <Stack spacing={2} className="cropSidePanel">
            <Box>
              <Typography fontWeight={700}>미리보기</Typography>
              <Box className="cropPreview" aria-live="polite">
                {previewUrl ? <Box component="img" src={previewUrl} alt="크롭 결과 미리보기" /> : <CircularProgress size={28} />}
              </Box>
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ZoomInIcon aria-hidden />
                <Typography id="zoom-slider-label" fontWeight={700}>
                  확대
                </Typography>
              </Stack>
              <Slider
                aria-labelledby="zoom-slider-label"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(_, value) => setZoom(Array.isArray(value) ? value[0] : value)}
              />
            </Box>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>
          취소
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!croppedAreaPixels || saving}>
          {saving ? '저장 중' : '크롭 완료'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
