
export function ExecutionStatus({ errorCount, nodeCount }: { errorCount: number; nodeCount: number }) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-lg shadow-md pointer-events-auto">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Nodes:</span>
          <span className="font-mono font-medium text-foreground">{nodeCount}</span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Errors:</span>
          <span
            className={`font-mono font-medium ${errorCount > 0 ? "text-destructive" : "text-emerald-500"}`}
          >
            {errorCount}
          </span>
        </div>
      </div>
    </div>
  );
}
