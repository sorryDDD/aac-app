import { ChangeEvent, useEffect, useRef } from 'react';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ReplayIcon from '@mui/icons-material/Replay';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { canUseAudioRecorder } from '../utils/mediaSupport';

interface AudioRecorderProps {
  value?: Blob;
  onChange: (blob?: Blob) => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function AudioRecorder({ value, onChange }: AudioRecorderProps) {
  const { status, audioBlob, error, elapsedMs, startRecording, stopRecording, resetRecording } = useMediaRecorder(value);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioUrl = useObjectUrl(audioBlob);
  const recorderAvailable = canUseAudioRecorder();

  useEffect(() => {
    onChange(audioBlob);
  }, [audioBlob, onChange]);

  const handleStart = () => {
    if (recorderAvailable) {
      startRecording();
      return;
    }

    audioInputRef.current?.click();
  };

  const handleAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    onChange(file);
  };

  return (
    <Box className="audioRecorder">
      <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={handleAudioFileChange} />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {status !== 'recording' ? (
          <Button variant="contained" startIcon={<MicIcon />} onClick={handleStart}>
            {audioBlob ? '다시 녹음' : recorderAvailable ? '녹음하기' : '음성 파일 선택'}
          </Button>
        ) : (
          <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={stopRecording}>
            녹음 종료
          </Button>
        )}
        {audioBlob ? (
          <Button variant="outlined" startIcon={<ReplayIcon />} onClick={resetRecording}>
            녹음 삭제
          </Button>
        ) : null}
      </Stack>
      {status === 'recording' ? (
        <Box className="recordingStatus" role="status" aria-live="polite">
          <Typography fontWeight={700}>녹음 중 {formatElapsed(elapsedMs)}</Typography>
          <LinearProgress color="error" />
        </Box>
      ) : null}
      {audioUrl ? (
        <Box>
          <Typography fontWeight={700} sx={{ mb: 1 }}>
            저장 전 재생
          </Typography>
          <audio controls src={audioUrl} className="audioPreview">
            이 브라우저는 오디오 미리보기를 지원하지 않습니다.
          </audio>
        </Box>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Box>
  );
}
