const files = new Map<string, File>();

export interface StoredFileMeta {
  fileRefId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileLastModified: number;
}

export function storeFile(file: File): StoredFileMeta {
  const fileRefId = `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  files.set(fileRefId, file);
  return {
    fileRefId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileLastModified: file.lastModified,
  };
}

export function getStoredFile(fileRefId: string): File | undefined {
  return files.get(fileRefId);
}

export function removeStoredFile(fileRefId: string | undefined): void {
  if (fileRefId) files.delete(fileRefId);
}
