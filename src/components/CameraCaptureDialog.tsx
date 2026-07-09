import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { canUseMediaDevices, mediaUnavailableMessage } from '../utils/mediaSupport';

interface CameraCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

export function CameraCaptureDialog({ open, onClose, onCapture }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let cancelled = false;

    async function startCamera() {
      if (!canUseMediaDevices()) {
        setError(mediaUnavailableMessage('camera'));
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (cameraError) {
        setError(cameraError instanceof Error ? cameraError.message : '카메라 권한을 확인해 주세요.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('카메라 화면을 아직 캡처할 수 없습니다.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('브라우저에서 이미지 캡처를 사용할 수 없습니다.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('촬영 이미지를 만들지 못했습니다.');
          return;
        }
        onCapture(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="camera-dialog-title">
      <DialogTitle id="camera-dialog-title">카메라 촬영</DialogTitle>
      <DialogContent>
        <Box className="cameraFrame">
          <video ref={videoRef} muted playsInline aria-label="카메라 미리보기" />
          {loading ? (
            <Box className="cameraLoading">
              <CircularProgress />
            </Box>
          ) : null}
        </Box>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" onClick={handleCapture} startIcon={<CameraAltIcon />} disabled={loading || Boolean(error)}>
          촬영
        </Button>
      </DialogActions>
    </Dialog>
  );
}
