import { useMemo } from "react";
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
import { useState } from "react";
import { toast } from "sonner";

const PREVIEW_LIMIT = 1024 * 1024;

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

  const fmt = (node?.data.outputFormat as DataFormat) || "utf8";
  const rawOutput = node?.data.output as string | undefined;
  const hasOutput = !!rawOutput;

  const bytes = useMemo(() => {
    const raw = rawOutput ? parseBytes(rawOutput, fmt) : null;
    return raw instanceof Uint8Array ? raw : new Uint8Array();
  }, [rawOutput, fmt]);

  const currentFmt = SAVE_FORMATS.find((f) => f.value === saveFormat)!;

  const preview = useMemo(
    () => previewContent(bytes, saveFormat, rawOutput || "", PREVIEW_LIMIT),
    [bytes, saveFormat, rawOutput],
  );

  const getContent = () => {
    switch (saveFormat) {
      case "bin":
        return new Blob([new Uint8Array(bytes)], { type: currentFmt.mime });
      case "hex": {
        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        return new Blob([hex], { type: currentFmt.mime });
      }
      case "base64": {
        const b64 = btoa(String.fromCharCode(...bytes));
        return new Blob([b64], { type: currentFmt.mime });
      }
      case "utf8": {
        return new Blob([node!.data.output as string], { type: currentFmt.mime });
      }
    }
  };

  const handleSave = async () => {
    if (!hasOutput) return;
    const blob = getContent();
    const suggestedName = `output${currentFmt.ext}`;

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
              {bytes.length} bytes total
              {bytes.length > PREVIEW_LIMIT
                ? ` · Preview shows first ${Math.min(bytes.length, PREVIEW_LIMIT)} bytes`
                : ""}
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
