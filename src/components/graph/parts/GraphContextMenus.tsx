import { Copy, Download, Trash2 } from "lucide-react";

import type { GraphContextMenuState } from "../hooks/useGraphInteraction";
import type { GraphNode } from "@/lib/crypto/types";

type GraphContextMenusProps = {
  contextMenu: GraphContextMenuState | null;
  node: GraphNode | null;
  groups: GraphNode[];
  selectedNonGroupNodes: GraphNode[];
  hasSelection: boolean;
  selectedCount: number;
  hasClipboard: boolean;
  onClose: () => void;
  onCopySelected: () => void;
  onCopyOutput: () => void;
  onSaveOutput: (nodeId: string) => void;
  onDuplicateNode: () => void;
  onDeleteNode: () => void;
  onDeleteEdge: () => void;
  onPaste: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onAssignNodeGroup: (nodeId: string, groupId: string | null) => void;
  onAssignNodesGroup: (nodeIds: string[], groupId: string | null) => void;
};

const menuClass =
  "absolute z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl";
const menuItemClass =
  "w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors";
const disabledClass = "disabled:opacity-50 disabled:hover:bg-transparent";

export function GraphContextMenus({
  contextMenu,
  node,
  groups,
  selectedNonGroupNodes,
  hasSelection,
  selectedCount,
  hasClipboard,
  onClose,
  onCopySelected,
  onCopyOutput,
  onSaveOutput,
  onDuplicateNode,
  onDeleteNode,
  onDeleteEdge,
  onPaste,
  onDuplicateSelected,
  onDeleteSelected,
  onAssignNodeGroup,
  onAssignNodesGroup,
}: GraphContextMenusProps) {
  if (!contextMenu) return null;

  const style = { left: contextMenu.x, top: contextMenu.y };

  if (contextMenu.nodeId && node) {
    return (
      <div className={`${menuClass} w-40`} style={style} onClick={(e) => e.stopPropagation()}>
        <div className="px-2.5 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider truncate font-semibold">
          {node.data.label}
        </div>
        <button
          onClick={() => {
            onCopySelected();
            onClose();
          }}
          className={menuItemClass}
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
        <button
          onClick={onCopyOutput}
          disabled={!node.data.output}
          className={`${menuItemClass} ${disabledClass}`}
        >
          <Copy className="w-3 h-3" /> Copy output
        </button>
        <button
          onClick={() => {
            onSaveOutput(node.id);
            onClose();
          }}
          disabled={!node.data.output}
          className={`${menuItemClass} ${disabledClass}`}
        >
          <Download className="w-3 h-3" /> Save output
        </button>
        <button onClick={onDuplicateNode} className={menuItemClass}>
          <Copy className="w-3 h-3" /> Duplicate
        </button>
        {node.data.kind !== "group" && groups.length > 0 && (
          <>
            <div className="my-0.5 border-t border-border/50" />
            <div className="px-2.5 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
              Assign to Group
            </div>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  onAssignNodeGroup(node.id, node.parentId === g.id ? null : g.id);
                  onClose();
                }}
                className={`${menuItemClass} ${node.parentId === g.id ? "text-primary" : ""}`}
              >
                <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                {g.data.label as string}
                {node.parentId === g.id && <span className="ml-auto text-[9px]">✓</span>}
              </button>
            ))}
            {node.parentId && (
              <button
                onClick={() => {
                  onAssignNodeGroup(node.id, null);
                  onClose();
                }}
                className={`${menuItemClass} text-destructive hover:bg-destructive/10`}
              >
                <Trash2 className="w-3 h-3" /> Clear Group
              </button>
            )}
          </>
        )}
        <div className="my-0.5 border-t border-border/50" />
        <button
          onClick={onDeleteNode}
          className={`${menuItemClass} text-destructive hover:bg-destructive/10`}
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    );
  }

  if (contextMenu.edgeId) {
    return (
      <div className={`${menuClass} w-28`} style={style} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onDeleteEdge}
          className={`${menuItemClass} text-destructive hover:bg-destructive/10`}
        >
          <Trash2 className="w-3 h-3" /> Disconnect
        </button>
      </div>
    );
  }

  if (contextMenu.multi) {
    return (
      <div className={`${menuClass} w-40`} style={style} onClick={(e) => e.stopPropagation()}>
        <div className="px-2.5 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
          {hasSelection ? `${selectedCount} selected` : "Selection"}
        </div>
        <button
          onClick={onCopySelected}
          disabled={!hasSelection}
          className={`${menuItemClass} ${disabledClass}`}
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
        <button
          onClick={onPaste}
          disabled={!hasClipboard}
          className={`${menuItemClass} ${disabledClass}`}
        >
          <Copy className="w-3 h-3" /> Paste
        </button>
        <button
          onClick={onDuplicateSelected}
          disabled={!hasSelection}
          className={`${menuItemClass} ${disabledClass}`}
        >
          <Copy className="w-3 h-3" /> Duplicate
        </button>
        {selectedNonGroupNodes.length > 0 && groups.length > 0 && (
          <>
            <div className="my-0.5 border-t border-border/50" />
            <div className="px-2.5 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
              Assign to Group
            </div>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  const allInGroup = selectedNonGroupNodes.every((n) => n.parentId === g.id);
                  onAssignNodesGroup(
                    selectedNonGroupNodes.map((n) => n.id),
                    allInGroup ? null : g.id,
                  );
                  onClose();
                }}
                className={menuItemClass}
              >
                <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                {g.data.label as string}
              </button>
            ))}
            {selectedNonGroupNodes.some((n) => n.parentId) && (
              <button
                onClick={() => {
                  onAssignNodesGroup(
                    selectedNonGroupNodes.filter((n) => n.parentId).map((n) => n.id),
                    null,
                  );
                  onClose();
                }}
                className={`${menuItemClass} text-destructive hover:bg-destructive/10`}
              >
                <Trash2 className="w-3 h-3" /> Clear Group
              </button>
            )}
          </>
        )}
        <div className="my-0.5 border-t border-border/50" />
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className={`${menuItemClass} text-destructive hover:bg-destructive/10 ${disabledClass}`}
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    );
  }

  return null;
}
