import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

const MENU_PADDING = 8;

const menuClass =
  "absolute z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl max-h-[min(420px,calc(100%-16px))] overflow-y-auto custom-scrollbar";
const menuItemClass =
  "w-full flex items-center gap-1.5 px-2 py-1 text-[11px] hover:bg-accent transition-colors";
const disabledClass = "disabled:opacity-50 disabled:hover:bg-transparent";

function PositionedContextMenu({
  contextMenu,
  className,
  children,
}: {
  contextMenu: GraphContextMenuState;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: contextMenu.x, top: contextMenu.y });

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;

    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    let left = contextMenu.x;
    let top = contextMenu.y;

    if (left + width > parentWidth - MENU_PADDING) {
      left = contextMenu.x - width;
    }
    if (top + height > parentHeight - MENU_PADDING) {
      top = contextMenu.y - height;
    }

    left = Math.max(MENU_PADDING, Math.min(left, parentWidth - width - MENU_PADDING));
    top = Math.max(MENU_PADDING, Math.min(top, parentHeight - height - MENU_PADDING));

    setPosition({ left, top });
  }, [contextMenu]);

  return (
    <div
      ref={ref}
      className={`${menuClass} ${className}`}
      style={position}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

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

  if (contextMenu.nodeId && node) {
    return (
      <PositionedContextMenu contextMenu={contextMenu} className="w-36">
        <div className="px-2 py-1 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider truncate font-semibold">
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
            <div className="px-2 py-0.5 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
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
      </PositionedContextMenu>
    );
  }

  if (contextMenu.edgeId) {
    return (
      <PositionedContextMenu contextMenu={contextMenu} className="w-28">
        <button
          onClick={onDeleteEdge}
          className={`${menuItemClass} text-destructive hover:bg-destructive/10`}
        >
          <Trash2 className="w-3 h-3" /> Disconnect
        </button>
      </PositionedContextMenu>
    );
  }

  if (contextMenu.multi) {
    return (
      <PositionedContextMenu contextMenu={contextMenu} className="w-36">
        <div className="px-2 py-1 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
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
            <div className="px-2 py-0.5 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
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
      </PositionedContextMenu>
    );
  }

  return null;
}
