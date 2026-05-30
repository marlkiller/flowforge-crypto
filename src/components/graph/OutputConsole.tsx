import { useState, useRef, useEffect, useCallback } from "react";
import { Play, ChevronDown, GripHorizontal, Loader2, Copy, Timer } from "lucide-react";
import { toast } from "sonner";
import type { NodeExecutionLog } from "@/lib/crypto/types";
import { formatBytes } from "@/lib/crypto/service";

interface Props {
  logs: NodeExecutionLog[];
  running: boolean;
  onRun: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  success: "PASS",
  error: "FAIL",
  skipped: "SKIP",
};

const STATUS_COLOR: Record<string, string> = {
  success: "text-emerald-500",
  error: "text-destructive",
  skipped: "text-muted-foreground",
};

const STATUS_BG: Record<string, string> = {
  success: "bg-emerald-500/10",
  error: "bg-destructive/10",
  skipped: "bg-muted",
};

const MIN_H = 32;
const MAX_H = window.innerHeight * 0.6;

export function OutputConsole({ logs, running, onRun }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [height, setHeight] = useState(144);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const lastRunRef = useRef<number>(0);

  useEffect(() => {
    if (logs.length > 0) {
      lastRunRef.current = Date.now();
    }
  }, [logs.length]);

  const lastRunAgo = useCallback(() => {
    const elapsed = Date.now() - lastRunRef.current;
    if (elapsed < 1000) return "just now";
    if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
    return `${Math.floor(elapsed / 3600000)}h ago`;
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startH.current = height;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [height],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dy = startY.current - e.clientY;
      setHeight(Math.max(MIN_H, Math.min(MAX_H, startH.current + dy)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs.length]);

  const h = minimized ? MIN_H : height;

  return (
    <div
      className="shrink-0 bg-background flex flex-col border-t border-border relative"
      style={{ height: h }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute -top-1 left-0 right-0 h-2 z-10 cursor-row-resize flex items-center justify-center group"
      >
        <div className="w-8 h-0.5 rounded-full bg-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1 shrink-0 min-h-8">
        <button
          onClick={() => setMinimized(!minimized)}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors"
          aria-label={minimized ? "Expand console" : "Collapse console"}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${minimized ? "-rotate-90" : ""}`}
          />
        </button>
        <span className="text-xs font-semibold text-foreground">Console</span>
        {!minimized && !running && logs.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{logs.length} steps</span>
        )}
        {!minimized && logs.length > 0 && (
          <button
            onClick={() => {
              const text = logs
                .map((log, i) => {
                  const fmt = (log.outputFormat ?? "utf8") as any;
                  const out =
                    log.status === "success" && log.outputs
                      ? (() => {
                          const entries = Object.entries(log.outputs);
                          if (
                            entries.length === 1 &&
                            (entries[0][0] === "default" || entries[0][0] === "data")
                          ) {
                            return formatBytes(entries[0][1], fmt);
                          }
                          return entries
                            .map(([k, b]) => `${k.toUpperCase()}:\n${formatBytes(b, fmt)}`)
                            .join("\n\n");
                        })()
                      : (log.error ?? "");
                  const params = log.params ? `\n${log.params}` : "";
                  return `#${i + 1} ${log.label} · ${log.kind} · ${log.status.toUpperCase()} · ${log.outputBytes?.byteLength ?? 0}B · ${log.duration.toFixed(1)}ms${params}\n${out}`;
                })
                .join("\n\n---\n\n");
              navigator.clipboard.writeText(text).then(
                () =>
                  toast.success("Logs copied to clipboard", {
                    description: `${logs.length} step${logs.length > 1 ? "s" : ""} copied`,
                  }),
                () => toast.error("Failed to copy logs"),
              );
            }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ml-1"
            title="Copy all logs"
            aria-label="Copy all logs"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
        {!minimized && (
          <GripHorizontal className="w-3 h-3 text-muted-foreground/40 ml-auto cursor-row-resize" />
        )}
        <div className="ml-2">
          <button
            onClick={onRun}
            disabled={running}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-[11px] font-medium transition-all shadow-sm active:scale-95"
          >
            {running ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            {running ? "Executing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Logs */}
      {!minimized && (
        <div ref={ref} className="flex-1 overflow-y-auto px-3 pb-2 space-y-1 custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pt-1 flex items-center gap-1.5">
              <Timer className="w-3 h-3" /> Auto-run enabled
              {lastRunRef.current > 0 && <> · Last run {lastRunAgo()}</>}
            </p>
          ) : (
            logs.map((log, i) => <LogEntry key={log.nodeId} log={log} index={i} />)
          )}
        </div>
      )}
    </div>
  );
}

function LogEntry({ log, index }: { log: NodeExecutionLog; index: number }) {
  const fmtMatch = log.params?.match(/^(?:input|output)Format:(\w+)$/);
  const formatVal = fmtMatch?.[1] ?? log.outputFormat;
  const showParams = log.params && !fmtMatch;

  return (
    <div
      className={`rounded border ${log.status === "error" ? "border-destructive/30" : "border-border"} ${STATUS_BG[log.status]} p-2`}
    >
      {/* Line 1: index · kind · format · status badge */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-muted-foreground font-mono">#{index + 1}</span>
        <span className="font-semibold text-foreground">{log.label}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{log.kind}</span>
        {formatVal && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase">
              {formatVal}
            </span>
          </>
        )}
        <span
          className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLOR[log.status]} ${log.status === "error" ? "bg-destructive/10" : log.status === "success" ? "bg-emerald-500/10" : "bg-muted"}`}
        >
          {STATUS_LABEL[log.status]}
        </span>
        {log.status !== "skipped" && (
          <span className="text-muted-foreground font-mono text-[10px]">
            {log.outputBytes?.byteLength ?? 0}B · {log.duration.toFixed(1)}ms
          </span>
        )}
      </div>

      {/* Line 2: non-format params */}
      {showParams && (
        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.params}</div>
      )}

      {/* Line 3: output / error */}
      {(log.status === "success" || log.status === "error") && (
        <div className="mt-1 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
          {log.status === "success" && log.outputs ? (
            (() => {
              const fmt = (log.outputFormat ?? "utf8") as any;
              const entries = Object.entries(log.outputs);

              const getLabel = (key: string) => {
                if (key === "publicKey") return "PUBLIC KEY";
                if (key === "privateKey") return "PRIVATE KEY";
                return key
                  .replace(/([A-Z])/g, " $1")
                  .toUpperCase()
                  .trim();
              };

              if (
                entries.length === 1 &&
                (entries[0][0] === "default" || entries[0][0] === "data")
              ) {
                return formatBytes(entries[0][1], fmt);
              } else {
                return entries
                  .map(([k, b]) => `${k.toUpperCase()}:\n${formatBytes(b, fmt, getLabel(k))}`)
                  .join("\n\n");
              }
            })()
          ) : log.status === "error" && log.error ? (
            <span className="text-destructive">{log.error}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
