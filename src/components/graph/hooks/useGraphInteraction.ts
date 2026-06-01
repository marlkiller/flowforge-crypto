import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow, type Node as RFNode } from "@xyflow/react";
import { graphStore } from "../store";
import { newNodeId, makeNode } from "@/lib/crypto/factory";
import type { GraphEdge, GraphNode } from "@/lib/crypto/types";
import { toast } from "sonner";

export function useGraphInteraction(
  nodes: GraphNode[],
  _edges: GraphEdge[],
  wrapperRef: React.RefObject<HTMLDivElement | null>,
) {
  const rf = useReactFlow();
  const [selectionMode, setSelectionMode] = useState(false);
  const clipboardRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
    multi?: boolean;
  } | null>(null);

  const onPaneClick = useCallback(() => {
    graphStore.setSelected(null);
    graphStore.setEdgeSelected(null);
    setContextMenu(null);
  }, []);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      setContextMenu({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        multi: true,
      });
    },
    [wrapperRef],
  );

  const duplicateSelected = useCallback(() => {
    const selected = rf.getNodes().filter((n) => n.selected);
    if (!selected || selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    const idMap = new Map<string, string>();
    const dupNodes: GraphNode[] = selected.map((n) => {
      const newId = newNodeId();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 60, y: n.position.y + 60 },
        selected: false,
      } as GraphNode;
    });
    const dupEdges: GraphEdge[] = graphStore
      .getActive()
      .edges.filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({
        ...e,
        id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
        selected: false,
      }));
    const cur = graphStore.getActive();
    graphStore.setActiveGraph({
      nodes: [...cur.nodes, ...dupNodes],
      edges: [...cur.edges, ...dupEdges],
    });
    setContextMenu(null);
  }, [rf]);

  const copySelected = useCallback(() => {
    const selected = rf.getNodes().filter((n) => n.selected);
    if (!selected || selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    const copiedEdges = graphStore
      .getActive()
      .edges.filter((ed) => ids.has(ed.source) && ids.has(ed.target));
    clipboardRef.current = {
      nodes: JSON.parse(JSON.stringify(selected)) as GraphNode[],
      edges: JSON.parse(JSON.stringify(copiedEdges)) as GraphEdge[],
    };
    setContextMenu(null);
  }, [rf]);

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current) return;
    const idMap = new Map<string, string>();
    const pastedNodes: GraphNode[] = clipboardRef.current.nodes.map((n) => {
      const newId = newNodeId();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 60, y: n.position.y + 60 },
        selected: false,
      };
    });
    const pastedEdges: GraphEdge[] = clipboardRef.current.edges.map((e) => ({
      ...e,
      id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
      selected: false,
    }));
    graphStore.snapshot();
    const cur = graphStore.getActive();
    graphStore.setActiveGraph({
      nodes: [...cur.nodes, ...pastedNodes],
      edges: [...cur.edges, ...pastedEdges],
    });
    setContextMenu(null);
  }, []);

  const deleteSelected = useCallback(() => {
    const selected = rf.getNodes().filter((n) => n.selected);
    if (!selected || selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    const w = graphStore.getActive();
    graphStore.setActiveGraph({
      nodes: w.nodes.filter((n) => !ids.has(n.id)),
      edges: w.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
    });
    setContextMenu(null);
  }, [rf]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: RFNode) => {
    event.stopPropagation();
    graphStore.setSelected(node.id);
    graphStore.bringToFront(node.id);
    graphStore.setEdgeSelected(null);
    setContextMenu(null);
  }, []);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      if (node.data?.kind === "group") return; // groups cannot nest
      const allNodes = graphStore.getActive().nodes;
      const rfNodes = rf.getNodes();
      const selectedIds = new Set(
        rfNodes
          .filter((n) => n.selected && n.id !== node.id && n.data?.kind !== "group")
          .map((n) => n.id),
      );
      selectedIds.add(node.id);
      const groups = allNodes.filter((g) => g.data.kind === "group");
      const nodeW = (node.width ?? 100) as number;
      const nodeH = (node.height ?? 40) as number;

      // Compute absolute center position of the anchor node
      let absX = node.position.x;
      let absY = node.position.y;
      if (node.parentId) {
        const parent = allNodes.find((n) => n.id === node.parentId);
        if (parent) {
          absX += parent.position.x;
          absY += parent.position.y;
        }
      }
      const nodeCx = absX + nodeW / 2;
      const nodeCy = absY + nodeH / 2;

      let bestGroup: string | null = null;
      for (const g of groups) {
        const gw = (g.width ?? 200) as number;
        const gh = (g.height ?? 100) as number;
        if (
          nodeCx >= g.position.x &&
          nodeCx <= g.position.x + gw &&
          nodeCy >= g.position.y &&
          nodeCy <= g.position.y + gh
        ) {
          bestGroup = g.id;
          break;
        }
      }

      // Check if any selected node's group affiliation would change
      let needsUpdate = false;
      for (const sid of selectedIds) {
        const n = allNodes.find((nd) => nd.id === sid);
        if (!n) continue;
        if (bestGroup !== (n.parentId ?? null)) {
          needsUpdate = true;
          break;
        }
      }
      if (!needsUpdate) return;

      graphStore.snapshot();
      const w = graphStore.getActive();

      if (bestGroup) {
        const group = allNodes.find((nd) => nd.id === bestGroup)!;
        graphStore.setNodes(
          w.nodes.map((n) => {
            if (!selectedIds.has(n.id)) return n;
            let aX = n.position.x;
            let aY = n.position.y;
            if (n.parentId) {
              const p = allNodes.find((nd) => nd.id === n.parentId);
              if (p) {
                aX += p.position.x;
                aY += p.position.y;
              }
            }
            return {
              ...n,
              position: { x: aX - group.position.x, y: aY - group.position.y },
              parentId: bestGroup,
              extent: "parent" as const,
            };
          }),
        );
      } else {
        // Leaving a group — convert all selected children to absolute
        graphStore.setNodes(
          w.nodes.map((n) => {
            if (!selectedIds.has(n.id) || !n.parentId) return n;
            const p = allNodes.find((nd) => nd.id === n.parentId);
            return {
              ...n,
              position: p
                ? { x: n.position.x + p.position.x, y: n.position.y + p.position.y }
                : n.position,
              parentId: undefined,
              extent: undefined,
            };
          }),
        );
      }
    },
    [rf],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: RFNode) => {
      event.preventDefault();
      event.stopPropagation();
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      setContextMenu({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        nodeId: node.id,
      });
      graphStore.setSelected(node.id);
      graphStore.bringToFront(node.id);
    },
    [wrapperRef],
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: GraphEdge) => {
    event.stopPropagation();
    graphStore.setSelected(null);
    graphStore.setEdgeSelected(edge.id);
  }, []);

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: GraphEdge) => {
      graphStore.setEdgeSelected(edge.id);
      event.preventDefault();
      event.stopPropagation();
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      setContextMenu({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        edgeId: edge.id,
      });
    },
    [wrapperRef],
  );

  const onDragStart = (e: React.DragEvent, kind: string) => {
    e.dataTransfer.setData("application/x-crypto-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-crypto-kind");
    if (!kind) return;
    const absPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const n = makeNode(kind, absPos);
    graphStore.snapshot();

    // Check if dropped inside a group (groups cannot nest)
    const allNodes = graphStore.getActive().nodes;
    if (n.data.kind === "group") {
      graphStore.setNodes([...allNodes, n]);
      graphStore.setSelected(n.id);
      return;
    }
    const groups = allNodes.filter((g) => g.data.kind === "group" && g.id !== n.id);
    const nodeCx = absPos.x + 50;
    const nodeCy = absPos.y + 20;
    for (const g of groups) {
      const gw = (g.width ?? 200) as number;
      const gh = (g.height ?? 100) as number;
      if (
        nodeCx >= g.position.x &&
        nodeCx <= g.position.x + gw &&
        nodeCy >= g.position.y &&
        nodeCy <= g.position.y + gh
      ) {
        // Inside group → convert to relative position
        n.position = {
          x: absPos.x - g.position.x,
          y: absPos.y - g.position.y,
        };
        n.parentId = g.id;
        n.extent = "parent" as const;
        break;
      }
    }

    graphStore.setNodes([...allNodes, n]);
    graphStore.setSelected(n.id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput =
        tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

      // Dismiss context menu on Escape
      if (e.key === "Escape") {
        setContextMenu(null);
        return;
      }

      // Context menu key / Shift+F10 on selected node
      if ((e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) && !isInput) {
        e.preventDefault();
        const selected = rf.getNodes().find((n) => n.selected);
        if (selected) {
          const wrapper = wrapperRef.current;
          if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            setContextMenu({
              x: rect.width / 2,
              y: rect.height / 2,
              nodeId: selected.id,
            });
          }
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        graphStore.undo();
      } else if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        graphStore.redo();
      } else if (e.key === "c" && !isInput) {
        if ((window.getSelection()?.toString().length ?? 0) > 0) return;
        if (rf.getNodes().some((n) => n.selected)) {
          e.preventDefault();
          copySelected();
        }
      } else if (e.key === "v" && !isInput && clipboardRef.current) {
        e.preventDefault();
        pasteClipboard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rf, copySelected, pasteClipboard, wrapperRef]);

  // Context menu actions
  const deleteNode = useCallback(() => {
    if (!contextMenu?.nodeId) return;
    graphStore.removeNode(contextMenu.nodeId);
    setContextMenu(null);
  }, [contextMenu]);

  const duplicateNode = useCallback(() => {
    if (!contextMenu?.nodeId) return;
    const newId = newNodeId();
    graphStore.duplicateNode(contextMenu.nodeId, newId);
    setContextMenu(null);
  }, [contextMenu]);

  const copyOutput = useCallback(async () => {
    const ctxNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null;
    if (!ctxNode?.data.output) return;
    try {
      await navigator.clipboard.writeText(ctxNode.data.output);
      toast.success("Output copied to clipboard");
    } catch {
      toast.error("Failed to copy output");
    }
    setContextMenu(null);
  }, [contextMenu, nodes]);

  const deleteEdge = useCallback(() => {
    if (!contextMenu?.edgeId) return;
    graphStore.snapshot();
    graphStore.setEdges(graphStore.getActive().edges.filter((e) => e.id !== contextMenu.edgeId));
    setContextMenu(null);
  }, [contextMenu]);

  return {
    selectionMode,
    setSelectionMode,
    contextMenu,
    setContextMenu,
    onPaneClick,
    onPaneContextMenu,
    onNodeClick,
    onNodeContextMenu,
    onEdgeClick,
    onEdgeContextMenu,
    onNodeDragStop,
    onDragStart,
    onDragOver,
    onDrop,
    duplicateSelected,
    copySelected,
    pasteClipboard,
    deleteSelected,
    deleteNode,
    duplicateNode,
    copyOutput,
    deleteEdge,
    clipboard: clipboardRef.current,
  };
}
