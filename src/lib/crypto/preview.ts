export const OUTPUT_PREVIEW_BYTES = 2048;

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / 1024 ** i;
  return `${val.toFixed(i === 0 ? 0 : val < 10 ? 2 : 1)} ${units[i]}`;
}

export function truncateOutputPreview(output: string): string {
  if (output.length <= OUTPUT_PREVIEW_BYTES) return output;
  return (
    output.slice(0, OUTPUT_PREVIEW_BYTES) +
    `\n\n... [preview ${formatByteSize(OUTPUT_PREVIEW_BYTES)} of ${formatByteSize(output.length)}, truncated]`
  );
}
