export const OUTPUT_PREVIEW_BYTES = 2048;

export function formatOutputPreviewSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${bytes / 1024} KB`;
  return `${bytes / 1024 / 1024} MB`;
}
