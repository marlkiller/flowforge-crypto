import { Camera, CornerDownRight, GitBranch, MousePointer2, Wand } from "lucide-react";

import type { ScreenshotFormat } from "../hooks/useScreenshotExport";

type EdgeType = "smoothstep" | "default";

type CanvasToolbarProps = {
  edgeType: EdgeType;
  nodeCount: number;
  selectionMode: boolean;
  screenshotFormat: ScreenshotFormat;
  showFormatPicker: boolean;
  onToggleEdgeType: () => void;
  onAutoLayout: () => void;
  onToggleFormatPicker: () => void;
  onCaptureScreenshot: (format: ScreenshotFormat) => void;
  onToggleSelectionMode: () => void;
};

const buttonClass =
  "graph-toolbar absolute z-10 flex items-center justify-center rounded-md border bg-card text-muted-foreground border-border hover:bg-accent shadow-md transition-all w-7 h-7";

export function CanvasToolbar({
  edgeType,
  nodeCount,
  selectionMode,
  screenshotFormat,
  showFormatPicker,
  onToggleEdgeType,
  onAutoLayout,
  onToggleFormatPicker,
  onCaptureScreenshot,
  onToggleSelectionMode,
}: CanvasToolbarProps) {
  const hasNodes = nodeCount > 0;

  return (
    <>
      <button
        onClick={onToggleEdgeType}
        className={buttonClass}
        title={edgeType === "smoothstep" ? "Switch to curved edges" : "Switch to right-angle edges"}
        aria-label={
          edgeType === "smoothstep" ? "Switch to curved edges" : "Switch to right-angle edges"
        }
        style={{ top: 12, right: 76 }}
      >
        {edgeType === "smoothstep" ? (
          <CornerDownRight className="w-4 h-4" />
        ) : (
          <GitBranch className="w-4 h-4" />
        )}
      </button>
      <button
        onClick={onAutoLayout}
        disabled={!hasNodes}
        className={`${buttonClass} disabled:opacity-30 disabled:pointer-events-none`}
        title="Auto-layout nodes with Dagre"
        aria-label="Auto-layout nodes with Dagre"
        style={{ top: 12, right: 44 }}
      >
        <Wand className="w-4 h-4" />
      </button>
      <div
        className="graph-toolbar absolute z-10 flex flex-col items-end"
        style={{ top: 12, right: 108 }}
      >
        <button
          onClick={onToggleFormatPicker}
          disabled={!hasNodes}
          className="flex items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-accent shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none w-7 h-7"
          title={`Export screenshot (${screenshotFormat.toUpperCase()})`}
          aria-label={`Export screenshot as ${screenshotFormat.toUpperCase()}`}
        >
          <Camera className="w-4 h-4" />
        </button>
        {showFormatPicker && (
          <div className="graph-toolbar absolute top-full right-0 mt-1 flex flex-col rounded-md border bg-card shadow-md overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
            {(["png", "jpeg", "webp"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => onCaptureScreenshot(fmt)}
                className={`px-3 py-1.5 text-[11px] text-left whitespace-nowrap hover:bg-accent transition-all ${fmt === screenshotFormat ? "bg-accent font-bold text-primary" : "text-muted-foreground"}`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onToggleSelectionMode}
        title={selectionMode ? "Switch to pan mode" : "Switch to selection mode"}
        aria-label={selectionMode ? "Switch to pan mode" : "Switch to selection mode"}
        className={`graph-toolbar absolute z-10 flex items-center justify-center rounded-md border shadow-md transition-all cursor-pointer ${
          selectionMode
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:bg-accent"
        } w-7 h-7`}
        style={{ top: 12, right: 12 }}
      >
        <MousePointer2 className="w-4 h-4" />
      </button>
    </>
  );
}
