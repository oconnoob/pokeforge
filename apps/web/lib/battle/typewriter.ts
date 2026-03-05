export const TYPEWRITER_STEP = 2;
export const TYPEWRITER_INTERVAL_MS = 18;

export const nextTypedLength = (current: number, total: number, step = TYPEWRITER_STEP): number => {
  if (total <= 0) {
    return 0;
  }

  return Math.min(total, Math.max(0, current + Math.max(1, step)));
};

export const isTypewriterComplete = (current: number, total: number): boolean => current >= Math.max(0, total);
