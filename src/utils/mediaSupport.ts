export function isSecureBrowserContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export function canUseMediaDevices(): boolean {
  return isSecureBrowserContext() && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function canUseAudioRecorder(): boolean {
  return canUseMediaDevices() && typeof MediaRecorder !== 'undefined';
}

export function mediaUnavailableMessage(kind: 'camera' | 'microphone'): string {
  const label = kind === 'camera' ? '카메라' : '마이크';

  if (!isSecureBrowserContext()) {
    return `${label}는 HTTPS 또는 홈 화면 PWA에서 사용할 수 있습니다. 현재 접속 주소는 보안 컨텍스트가 아닙니다.`;
  }

  return `이 브라우저에서는 ${label} 입력을 사용할 수 없습니다.`;
}

export function preferredAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }

  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'].find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType)
  );
}
