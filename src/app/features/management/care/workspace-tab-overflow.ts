/** Keep Overview visible, reserving room for More only when tabs overflow. */
export function visibleWorkspaceTabCount(
  width: number,
  tabWidths: readonly number[],
  moreWidth: number,
): number {
  const total = tabWidths.reduce((sum, size) => sum + size, 0);
  if (total <= width) return tabWidths.length;
  let used = moreWidth;
  let count = 0;
  for (const size of tabWidths) {
    if (used + size > width) break;
    used += size;
    count++;
  }
  return Math.min(tabWidths.length, Math.max(1, count));
}
