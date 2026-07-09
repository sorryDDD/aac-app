import { useEffect, useState } from 'react';

export function useObjectUrl(blob?: Blob | null): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob || blob.size === 0) {
      setUrl(undefined);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}
