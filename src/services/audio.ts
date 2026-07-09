let audioContext: AudioContext | undefined;
let currentAudio: HTMLAudioElement | undefined;

function getAudioContext(): AudioContext {
  const AudioContextConstructor =
    window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('이 브라우저에서는 Web Audio API를 사용할 수 없습니다.');
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

export async function playAudioBlob(blob: Blob): Promise<void> {
  if (blob.size === 0) {
    return;
  }

  try {
    await playWithAudioElement(blob);
    return;
  } catch {
    // Some browsers reject object URLs for certain recorded formats. Try Web Audio as a fallback.
  }

  const context = getAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
  const source = context.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(context.destination);
  source.start(0);
}

async function playWithAudioElement(blob: Blob): Promise<void> {
  currentAudio?.pause();

  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  currentAudio = audio;
  audio.preload = 'auto';

  const cleanup = () => {
    if (currentAudio === audio) {
      currentAudio = undefined;
    }
    URL.revokeObjectURL(objectUrl);
  };

  audio.addEventListener('ended', cleanup, { once: true });
  audio.addEventListener('error', cleanup, { once: true });

  try {
    await audio.play();
  } catch (error) {
    cleanup();
    throw error;
  }
}
