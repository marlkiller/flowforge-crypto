import { Search, MapPin, Layers } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { GraphNode } from "@/lib/crypto/types";
import { CATEGORY_META, NODE_KIND_META } from "@/lib/crypto/registry";
import { CategoryIcon } from "./CategoryIcon";

export function ExecutionStatus({
  errorCount,
  nodeCount,
  nodes = [],
  onNodeFocus,
}: {
  errorCount: number;
  nodeCount: number;
  nodes?: GraphNode[];
  onNodeFocus?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredNodes = search
    ? nodes.filter((n) => n.data.label.toLowerCase().includes(search.toLowerCase()))
    : nodes;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-lg shadow-md pointer-events-auto">
        <DropdownMenu onOpenChange={(open) => !open && setSearch("")}>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 text-xs hover:bg-accent/50 px-1.5 py-0.5 -ml-1 rounded transition-colors"
              title="Quick locate node"
            >
              <span className="text-muted-foreground">Nodes:</span>
              <span className="font-mono font-medium text-foreground">{nodeCount}</span>
              <Search className="w-3 h-3 text-muted-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-96 p-0 overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/30">
              <input
                autoFocus
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
              {filteredNodes.length === 0 ? (
                <div className="px-2 py-4 text-center text-[10px] text-muted-foreground">
                  No nodes found
                </div>
              ) : (
                filteredNodes.map((node) => {
                  const meta = NODE_KIND_META[node.data.kind];
                  const catMeta = meta ? CATEGORY_META[meta.category] : null;

                  const isGroup = node.data.kind === "group";
                  const groupLabel = node.parentId
                    ? nodes.find((n) => n.id === node.parentId)?.data.label
                    : undefined;
                  return (
                    <DropdownMenuItem
                      key={node.id}
                      onClick={() => onNodeFocus?.(node.id)}
                      className={`flex items-center gap-2 text-[11px] cursor-pointer py-1.5 px-2 group ${isGroup ? "text-amber-600 dark:text-amber-400" : ""}`}
                    >
                      <span className="shrink-0">
                        {isGroup ? (
                          <Layers className="w-3.5 h-3.5" />
                        ) : meta ? (
                          <CategoryIcon
                            name={catMeta?.icon || "Hash"}
                            className={`w-3.5 h-3.5 ${catMeta?.accent || "text-muted-foreground"}`}
                          />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-muted inline-block" />
                        )}
                      </span>
                      <span className="font-medium truncate min-w-0 flex-1">{node.data.label}</span>
                      <span className="text-[9px] text-muted-foreground uppercase opacity-60 shrink-0">
                        {isGroup ? "group" : node.data.kind}
                      </span>
                      {groupLabel && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10 leading-none shrink-0">
                          <Layers className="w-2 h-2" />
                          {groupLabel}
                        </span>
                      )}
                      <MapPin className="w-3 h-3 ml-auto text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors shrink-0" />
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border"></div>

        <DropdownMenu onOpenChange={(open) => !open && setSearch("")}>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-2 text-xs hover:bg-accent/50 px-1.5 py-0.5 rounded transition-colors ${errorCount > 0 ? "cursor-pointer" : "cursor-default opacity-60"}`}
              title={errorCount > 0 ? "Quick locate error nodes" : "No errors"}
              disabled={errorCount === 0}
            >
              <span className="text-muted-foreground">Errors:</span>
              <span
                className={`font-mono font-medium ${errorCount > 0 ? "text-destructive" : "text-emerald-500"}`}
              >
                {errorCount}
              </span>
              {errorCount > 0 && <Search className="w-3 h-3 text-destructive/40" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
            <div className="p-2 border-b border-border bg-destructive/5 text-destructive font-semibold text-[10px] uppercase tracking-wider flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              Nodes with Errors
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
              {nodes
                .filter((n) => !!n.data.error)
                .map((node) => {
                  const meta = NODE_KIND_META[node.data.kind];
                  const catMeta = meta ? CATEGORY_META[meta.category] : null;

                  const errGroupLabel = node.parentId
                    ? nodes.find((n) => n.id === node.parentId)?.data.label
                    : undefined;
                  return (
                    <DropdownMenuItem
                      key={node.id}
                      onClick={() => onNodeFocus?.(node.id)}
                      className="flex flex-col items-start gap-1 text-[11px] cursor-pointer py-2 px-2 group hover:bg-destructive/5 focus:bg-destructive/5"
                    >
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <span className="shrink-0">
                          <CategoryIcon
                            name={catMeta?.icon || "Hash"}
                            className="w-3.5 h-3.5 text-destructive"
                          />
                        </span>
                        <span className="font-bold truncate text-destructive min-w-0 flex-1">
                          {node.data.label}
                        </span>
                        {errGroupLabel && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10 leading-none shrink-0">
                            <Layers className="w-2 h-2" />
                            {errGroupLabel}
                          </span>
                        )}
                        <MapPin className="w-3 h-3 text-destructive/30 group-hover:text-destructive/60 transition-colors shrink-0" />
                      </div>
                      <div className="text-[10px] text-destructive/80 line-clamp-2 leading-tight bg-destructive/5 p-1 rounded w-full border border-destructive/10 italic">
                        {node.data.error}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
