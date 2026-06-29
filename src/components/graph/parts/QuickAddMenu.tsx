import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { NODE_KIND_META } from "@/lib/crypto/registry";
import { makeNode } from "@/lib/crypto/factory";
import { graphStore } from "../store";
import type { GraphEdge } from "@/lib/crypto/types";
import { Search } from "lucide-react";

interface QuickAddMenuProps {
  screenX: number;
  screenY: number;
  flowPosition: { x: number; y: number };
  onClose: () => void;
  /** Forward mode: dragging from a source handle → create a target node */
  sourceInfo?: {
    nodeId: string;
    handleId: string | null;
    sourceType: string;
  };
  /** Reverse mode: dragging from a target handle → create a source node */
  targetInfo?: {
    nodeId: string;
    handleId: string;
  };
}

export function QuickAddMenu({
  screenX,
  screenY,
  flowPosition,
  onClose,
  sourceInfo,
  targetInfo,
}: QuickAddMenuProps) {
  const [search, setSearch] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isReverse = !!targetInfo;

  const items = useMemo(() => {
    const result: Array<{ kind: string; label: string; category: string }> = [];
    const q = search.toLowerCase().trim();

    for (const [kind, meta] of Object.entries(NODE_KIND_META)) {
      if (isReverse) {
        // Reverse: any node that can produce output (except the output sink)
        if (kind === "output") continue;
      } else {
        // Forward: all nodes with connectable inputs
        const connectableInputs = meta.inputs?.filter((i) => i.connectable !== false) ?? [];
        if (connectableInputs.length === 0) continue;
      }

      if (q && !meta.label.toLowerCase().includes(q) && !kind.toLowerCase().includes(q)) continue;
      result.push({ kind, label: meta.label, category: meta.category });
    }

    result.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.label.localeCompare(b.label);
    });

    return result;
  }, [search, isReverse]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIdx(0);
  }, [items.length]);

  const selectKind = useCallback(
    (kind: string) => {
      graphStore.snapshot();
      const active = graphStore.getActive();
      const newNode = makeNode(kind, flowPosition);

      if (isReverse && targetInfo) {
        const edge: GraphEdge = {
          id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          source: newNode.id,
          sourceHandle: "default",
          target: targetInfo.nodeId,
          targetHandle: targetInfo.handleId,
          type: "smoothstep",
          animated: true,
        };
        graphStore.setActiveGraph({
          nodes: [...active.nodes, newNode],
          edges: [...active.edges, edge],
        });
      } else if (sourceInfo) {
        const meta = NODE_KIND_META[kind];
        const targetHandle = meta?.inputs?.find((i) => i.connectable !== false)?.id ?? "data";
        const edge: GraphEdge = {
          id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          source: sourceInfo.nodeId,
          sourceHandle: sourceInfo.handleId ?? "default",
          target: newNode.id,
          targetHandle,
          type: "smoothstep",
          animated: true,
        };
        graphStore.setActiveGraph({
          nodes: [...active.nodes, newNode],
          edges: [...active.edges, edge],
        });
      }

      graphStore.setSelected(newNode.id);
      onClose();
    },
    [flowPosition, sourceInfo, targetInfo, isReverse, onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (items[selectedIdx]) selectKind(items[selectedIdx].kind);
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const menuLeft = Math.min(screenX, window.innerWidth - 280);
  const menuTop = Math.min(screenY, window.innerHeight - 420);

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="absolute w-64 max-h-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-left"
        style={{ left: menuLeft, top: menuTop }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter nodes..."
            className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="overflow-y-auto max-h-64 custom-scrollbar">
          {items.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No matching nodes
            </div>
          )}
          {items.map((item, idx) => (
            <div
              key={item.kind}
              onClick={() => selectKind(item.kind)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                idx === selectedIdx
                  ? "bg-primary/15 text-primary"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              <span className="truncate font-medium">{item.label}</span>
              <span className="ml-auto text-[8px] font-bold uppercase text-muted-foreground/50 tracking-wider">
                {item.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
