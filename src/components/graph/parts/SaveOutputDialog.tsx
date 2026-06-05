import { useState, useEffect } from "react";
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
import { parseBytes, type DataFormat } from "@/lib/crypto/service";
import type { GraphNode } from "@/lib/crypto/types";
import { toast } from "sonner";

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: GraphNode | null;
}

export function SaveOutputDialog({ open, onOpenChange, node }: Props) {
  const [saveFormat, setSaveFormat] = useState<SaveFormat>("bin");
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);

  const fmt = (node?.data.outputFormat as DataFormat) || "utf8";
  const totalBytes = node?.data.outputBytesLen ?? 0;

  // Only keep a small preview string inside React — full data stays in the store
  const rawFull = node?.data.output as string | undefined;
  const outputEntries = node?.data.outputEntries;
  const isMultiOutput = !!(outputEntries && outputEntries.length > 1);
  const hasOutput = !!rawFull;
  const previewStr = hasOutput ? rawFull!.slice(0, PREVIEW_LIMIT) : "";

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

  const currentFmt = SAVE_FORMATS.find((f) => f.value === saveFormat)!;

  const preview = (() => {
    if (currentEntry) {
      const entryBytes = currentEntry.bytes;
      const slice = entryBytes.slice(0, PREVIEW_LIMIT);
      if (saveFormat === "utf8") {
        return (
          new TextDecoder().decode(slice) +
          (entryBytes.length > PREVIEW_LIMIT
            ? `\n... (${entryBytes.length - PREVIEW_LIMIT} more bytes)`
            : "")
        );
      }
      if (saveFormat === "hex") {
        const hex = Array.from(slice)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        return (
          hex +
          (entryBytes.length > PREVIEW_LIMIT
            ? `\n... (${entryBytes.length - PREVIEW_LIMIT} more bytes)`
            : "")
        );
      }
      if (saveFormat === "base64") {
        const b64 = btoa(String.fromCharCode(...slice));
        return (
          b64 +
          (entryBytes.length > PREVIEW_LIMIT
            ? `\n... (${entryBytes.length - PREVIEW_LIMIT} more bytes)`
            : "")
        );
      }
      const bytes = entryBytes.slice(0, PREVIEW_LIMIT);
      return (
        hexDump(bytes) +
        (entryBytes.length > PREVIEW_LIMIT
          ? `\n... (${entryBytes.length - PREVIEW_LIMIT} more bytes)`
          : "")
      );
    }
    // Single output — preview from the truncated string
    if (saveFormat === "utf8") {
      return rawFull && rawFull.length > PREVIEW_LIMIT
        ? previewStr + `\n... (${rawFull.length - PREVIEW_LIMIT} more chars)`
        : previewStr;
    }
    // For bin/hex/base64, parse the truncated preview string
    const previewBytes = (() => {
      try {
        const r = parseBytes(previewStr, fmt);
        return r instanceof Uint8Array ? r : new Uint8Array();
      } catch {
        return new Uint8Array();
      }
    })();
    if (saveFormat === "hex") {
      const hex = Array.from(previewBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      return (
        hex + (totalBytes > PREVIEW_LIMIT ? `\n... (${totalBytes - PREVIEW_LIMIT} more bytes)` : "")
      );
    }
    if (saveFormat === "base64") {
      const b64 = btoa(String.fromCharCode(...previewBytes));
      return (
        b64 + (totalBytes > PREVIEW_LIMIT ? `\n... (${totalBytes - PREVIEW_LIMIT} more bytes)` : "")
      );
    }
    return (
      hexDump(previewBytes) +
      (totalBytes > PREVIEW_LIMIT ? `\n... (${totalBytes - PREVIEW_LIMIT} more bytes)` : "")
    );
  })();

  const handleSave = async () => {
    if (!hasOutput) return;
    const blob = buildBlob();
    const suffix = currentEntry ? `_${currentEntry.key}` : "";
    const suggestedName = `output${suffix}${currentFmt.ext}`;

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [
            { description: currentFmt.desc, accept: { [currentFmt.mime]: [currentFmt.ext] } },
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

  function buildBlob(): Blob {
    if (currentEntry) {
      const entryBytes = currentEntry.bytes;
      if (saveFormat === "utf8")
        return new Blob([new TextDecoder().decode(entryBytes)], {
          type: "text/plain;charset=utf-8",
        });
      if (saveFormat === "hex") {
        const hex = Array.from(entryBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        return new Blob([hex], { type: "text/plain;charset=utf-8" });
      }
      if (saveFormat === "base64") {
        return new Blob([btoa(String.fromCharCode(...entryBytes))], {
          type: "text/plain;charset=utf-8",
        });
      }
      return new Blob([new Uint8Array(entryBytes)], { type: "application/octet-stream" });
    }
    // Single output — parse the full string at save time
    const full = node!.data.output as string;
    if (saveFormat === "utf8") return new Blob([full], { type: "text/plain;charset=utf-8" });
    const fullBytes = (() => {
      try {
        const r = parseBytes(full, fmt);
        return r instanceof Uint8Array ? r : new Uint8Array();
      } catch {
        return new Uint8Array();
      }
    })();
    if (saveFormat === "hex") {
      const hex = Array.from(fullBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      return new Blob([hex], { type: "text/plain;charset=utf-8" });
    }
    if (saveFormat === "base64") {
      return new Blob([btoa(String.fromCharCode(...fullBytes))], {
        type: "text/plain;charset=utf-8",
      });
    }
    return new Blob([new Uint8Array(fullBytes)], { type: "application/octet-stream" });
  }

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

function hexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
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
  return lines.join("\n");
}
