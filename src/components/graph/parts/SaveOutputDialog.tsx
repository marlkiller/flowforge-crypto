import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { parseBytes, formatBytes, type DataFormat } from "@/lib/crypto/service";
import type { GraphNode } from "@/lib/crypto/types";
import { toast } from "sonner";

// Only preview up to 4KB — full data is parsed on save
const PREVIEW_LIMIT = 4096;

type SaveFormat = "bin" | "hex" | "base64" | "utf8";

const SAVE_FORMATS: {
  value: SaveFormat;
  label: string;
  ext: string;
  mime: string;
  desc: string;
}[] = [
  {
    value: "bin",
    label: "Raw Binary",
    ext: ".bin",
    mime: "application/octet-stream",
    desc: "Binary",
  },
  { value: "hex", label: "Hex Text", ext: ".hex", mime: "text/plain;charset=utf-8", desc: "Hex" },
  {
    value: "base64",
    label: "Base64",
    ext: ".b64",
    mime: "text/plain;charset=utf-8",
    desc: "Base64",
  },
  { value: "utf8", label: "UTF-8", ext: ".txt", mime: "text/plain;charset=utf-8", desc: "Text" },
];

function hexDump(bytes: Uint8Array, max = PREVIEW_LIMIT): string {
  const len = Math.min(bytes.length, max);
  const lines: string[] = [];
  for (let i = 0; i < len; i += 16) {
    const slice = bytes.slice(i, i + 16);
    const offset = i.toString(16).padStart(8, "0");
    const hex = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const hexLeft = hex.slice(0, 23);
    const hexRight = hex.slice(23);
    const ascii = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`${offset}  ${hexLeft.padEnd(23)} ${hexRight.padEnd(23)}  |${ascii.padEnd(16)}|`);
  }
  if (bytes.length > max) {
    lines.push(`... (${bytes.length - max} more bytes)`);
  }
  return lines.join("\n");
}

function previewContent(
  bytes: Uint8Array,
  saveFormat: SaveFormat,
  rawOutput: string,
  max = PREVIEW_LIMIT,
): string {
  switch (saveFormat) {
    case "bin":
      return hexDump(bytes, max);
    case "hex": {
      const hex = Array.from(bytes.slice(0, max))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      const rest = bytes.length > max ? `\n... (${bytes.length - max} more bytes)` : "";
      return hex + rest;
    }
    case "base64": {
      const slice = bytes.slice(0, max);
      const b64 = btoa(String.fromCharCode(...slice));
      const rest = bytes.length > max ? `\n... (${bytes.length - max} more bytes)` : "";
      return b64 + rest;
    }
    case "utf8": {
      return rawOutput.length > max
        ? rawOutput.slice(0, max) + `\n... (${rawOutput.length - max} more chars)`
        : rawOutput;
    }
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: GraphNode | null;
}

export function SaveOutputDialog({ open, onOpenChange, node }: Props) {
  const [saveFormat, setSaveFormat] = useState<SaveFormat>("bin");
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);

  const fmt = (node?.data.outputFormat as DataFormat) || "utf8";
  const rawOutput = node?.data.output as string | undefined;
  const outputEntries = node?.data.outputEntries;
  const isMultiOutput = !!(outputEntries && outputEntries.length > 1);

  useEffect(() => {
    if (outputEntries?.length) {
      setSelectedOutput((prev) =>
        prev && outputEntries.some((e) => e.key === prev) ? prev : outputEntries[0].key,
      );
    }
  }, [outputEntries]);

  const currentEntry = isMultiOutput
    ? outputEntries!.find((e) => e.key === selectedOutput)
    : undefined;

  const hasOutput = !!rawOutput;

  const totalBytes = node?.data.outputBytesLen ?? 0;

  const bytes = useMemo(() => {
    if (currentEntry) return currentEntry.bytes;
    if (!rawOutput) return new Uint8Array();
    try {
      const raw = parseBytes(rawOutput, fmt);
      return raw instanceof Uint8Array ? raw : new Uint8Array();
    } catch {
      return new Uint8Array();
    }
  }, [rawOutput, fmt, currentEntry]);

  const preview = useMemo(() => {
    if (currentEntry && saveFormat === "utf8") {
      return formatBytes(currentEntry.bytes, fmt, currentEntry.label);
    }
    return previewContent(bytes, saveFormat, rawOutput || "", PREVIEW_LIMIT);
  }, [bytes, saveFormat, rawOutput, currentEntry, fmt]);

  const currentFmt = SAVE_FORMATS.find((f) => f.value === saveFormat)!;

  const getContent = () => {
    const hasBytes = bytes.length > 0;
    switch (saveFormat) {
      case "bin":
        return hasBytes
          ? new Blob([new Uint8Array(bytes)], { type: currentFmt.mime })
          : new Blob([rawOutput || ""], { type: "text/plain;charset=utf-8" });
      case "hex": {
        if (!hasBytes) return new Blob([rawOutput || ""], { type: currentFmt.mime });
        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        return new Blob([hex], { type: currentFmt.mime });
      }
      case "base64": {
        if (!hasBytes) return new Blob([rawOutput || ""], { type: currentFmt.mime });
        const b64 = btoa(String.fromCharCode(...bytes));
        return new Blob([b64], { type: currentFmt.mime });
      }
      case "utf8": {
        if (currentEntry) {
          const text = formatBytes(currentEntry.bytes, fmt, currentEntry.label);
          return new Blob([text], { type: currentFmt.mime });
        }
        return new Blob([node!.data.output as string], { type: currentFmt.mime });
      }
    }
  };

  const handleSave = async () => {
    if (!hasOutput) return;
    const blob = getContent();
    const suffix = currentEntry ? `_${currentEntry.key}` : "";
    const suggestedName = `output${suffix}${currentFmt.ext}`;

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: currentFmt.desc,
              accept: { [currentFmt.mime]: [currentFmt.ext] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success("File saved");
        onOpenChange(false);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
        toast.error("Save failed, falling back to download...");
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Save Output</DialogTitle>
          <DialogDescription>
            Preview the output and choose a format before saving.
          </DialogDescription>
        </DialogHeader>

        {hasOutput ? (
          <div className="flex-1 min-h-0 space-y-3">
            {isMultiOutput && outputEntries && (
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Output
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {outputEntries.map((entry) => (
                    <button
                      key={entry.key}
                      onClick={() => setSelectedOutput(entry.key)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        selectedOutput === entry.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
                      }`}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-background p-3 overflow-auto max-h-[240px] custom-scrollbar">
              <pre className="text-[11px] font-mono leading-relaxed whitespace-pre">{preview}</pre>
            </div>

            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Format
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAVE_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setSaveFormat(f.value)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                      saveFormat === f.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1 opacity-60">{f.ext}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground">
              {totalBytes} bytes total
              {totalBytes > PREVIEW_LIMIT ? ` · Preview shows first ${PREVIEW_LIMIT} bytes` : ""}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground italic">
            No output data available for this node.
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={handleSave}
            disabled={!hasOutput}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Save As...
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
