import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo } from "react";

export const GroupNode = memo(({ data, selected }: NodeProps) => {
  const name = (data.label as string) || "Group";

  return (
    <div
      className="relative w-full h-full min-w-[300px] min-h-[200px] rounded-xl border-2 border-dashed transition-all duration-200"
      style={{
        width: "100%",
        height: "100%",
        borderColor: selected ? "var(--color-primary)" : "var(--color-border)",
        backgroundColor: selected
          ? "color-mix(in srgb, var(--color-primary) 8%, transparent)"
          : "color-mix(in srgb, var(--color-muted) 15%, transparent)",
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={300}
        minHeight={200}
        handleStyle={{
          width: 10,
          height: 10,
          borderRadius: 4,
          backgroundColor: "var(--color-background)",
          border: "2px solid var(--color-primary)",
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            backgroundColor: "var(--color-primary)",
            opacity: 0.6,
          }}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
          Group
        </span>
        <span className="text-[11px] font-semibold text-foreground/80 truncate">{name}</span>
      </div>

      {/* Prompt to drop nodes inside */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] text-muted-foreground/30 italic select-none">
          Drag nodes here to group them
        </span>
      </div>
    </div>
  );
});
