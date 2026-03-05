export type GridDirection = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const nextGridIndex = (
  currentIndex: number,
  direction: GridDirection,
  columns: number,
  itemCount: number
): number => {
  if (itemCount <= 0) {
    return 0;
  }

  const maxIndex = itemCount - 1;
  const safeColumns = Math.max(1, columns);
  const index = clamp(currentIndex, 0, maxIndex);
  const row = Math.floor(index / safeColumns);
  const col = index % safeColumns;
  const lastRow = Math.floor(maxIndex / safeColumns);

  if (direction === "ArrowLeft") {
    return col === 0 ? index : index - 1;
  }

  if (direction === "ArrowRight") {
    const next = index + 1;
    const sameRow = Math.floor(next / safeColumns) === row;
    return sameRow && next <= maxIndex ? next : index;
  }

  if (direction === "ArrowUp") {
    return row === 0 ? index : index - safeColumns;
  }

  const nextRow = Math.min(lastRow, row + 1);
  const candidate = nextRow * safeColumns + col;
  return Math.min(candidate, maxIndex);
};
