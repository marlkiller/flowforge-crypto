import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow, type Node as RFNode } from "@xyflow/react";
import { graphStore } from "../store";
import { newNodeId, makeNode } from "@/lib/crypto/factory";
import { removeStoredFile } from "@/lib/crypto/fileStore";
import { findContainingGroup, moveNodeIntoGroup, moveNodeToCanvas } from "../utils/grouping";
import type { GraphEdge, GraphNode } from "@/lib/crypto/types";
import { toast } from "sonner";

export type GraphContextMenuState = {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  multi?: boolean;
};

export function useGraphInteraction(
  nodes: GraphNode[],
  _edges: GraphEdge[],
  wrapperRef: React.RefObject<HTMLDivElement | null>,
) {
  const rf = useReactFlow();
  const [selectionMode, setSelectionMode] = useState(false);
  const clipboardRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

  const [contextMenu, setContextMenu] = useState<GraphContextMenuState | null>(null);

  const withoutFileRef = useCallback((node: GraphNode): GraphNode => {
    if (node.data.kind !== "file") return node;
    const {
      fileRefId: _fileRefId,
      fileName: _fileName,
      fileSize: _fileSize,
      fileType: _fileType,
      fileLastModified: _fileLastModified,
      fileBytes: _fileBytes,
      ...data
    } = node.data;
    return { ...node, data };
  }, []);

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
      return withoutFileRef({
        ...n,
        id: newId,
        position: { x: n.position.x + 60, y: n.position.y + 60 },
        selected: false,
      } as GraphNode);
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
  }, [rf, withoutFileRef]);

  const copySelected = useCallback(() => {
    const selected = rf.getNodes().filter((n) => n.selected);
    if (!selected || selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    const copiedEdges = graphStore
      .getActive()
      .edges.filter((ed) => ids.has(ed.source) && ids.has(ed.target));
    clipboardRef.current = {
      nodes: (JSON.parse(JSON.stringify(selected)) as GraphNode[]).map(withoutFileRef),
      edges: JSON.parse(JSON.stringify(copiedEdges)) as GraphEdge[],
    };
    setContextMenu(null);
  }, [rf, withoutFileRef]);

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current) return;
    const idMap = new Map<string, string>();
    const pastedNodes: GraphNode[] = clipboardRef.current.nodes.map((n) => {
      const newId = newNodeId();
      idMap.set(n.id, newId);
      return withoutFileRef({
        ...n,
        id: newId,
        position: { x: n.position.x + 60, y: n.position.y + 60 },
        selected: false,
      });
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
  }, [withoutFileRef]);

  const deleteSelected = useCallback(() => {
    const selected = rf.getNodes().filter((n) => n.selected);
    if (!selected || selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    const w = graphStore.getActive();
    w.nodes.forEach((n) => {
      if (ids.has(n.id)) removeStoredFile(n.data.fileRefId);
    });
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
      const bestGroup = findContainingGroup(node as GraphNode, groups, allNodes);
      const bestGroupId = bestGroup?.id ?? null;

      // Check if any selected node's group affiliation would change
      let needsUpdate = false;
      for (const sid of selectedIds) {
        const n = allNodes.find((nd) => nd.id === sid);
        if (!n) continue;
        if (bestGroupId !== (n.parentId ?? null)) {
          needsUpdate = true;
          break;
        }
      }
      if (!needsUpdate) return;

      graphStore.snapshot();
      const w = graphStore.getActive();

      if (bestGroup) {
        graphStore.setNodes(
          w.nodes.map((n) =>
            selectedIds.has(n.id) ? moveNodeIntoGroup(n, bestGroup, allNodes) : n,
          ),
        );
      } else {
        // Leaving a group — convert all selected children to absolute
        graphStore.setNodes(
          w.nodes.map((n) => (selectedIds.has(n.id) ? moveNodeToCanvas(n, allNodes) : n)),
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
      const selectedNodes = rf.getNodes().filter((n) => n.selected);
      const keepMultiSelection =
        selectedNodes.length > 1 && selectedNodes.some((selected) => selected.id === node.id);

      if (keepMultiSelection) {
        setContextMenu({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          multi: true,
        });
        graphStore.setEdgeSelected(null);
        return;
      }

      setContextMenu({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        nodeId: node.id,
      });
      graphStore.setSelected(node.id);
      graphStore.bringToFront(node.id);
    },
    [rf, wrapperRef],
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
  const addNodeAtPosition = useCallback((kind: string, position: { x: number; y: number }) => {
    if (!kind) return;
    const n = makeNode(kind, position);
    graphStore.snapshot();

    // Check if dropped inside a group (groups cannot nest)
    const allNodes = graphStore.getActive().nodes;
    if (n.data.kind === "group") {
      graphStore.setNodes([...allNodes, n]);
      graphStore.setSelected(n.id);
      return;
    }
    const groups = allNodes.filter((g) => g.data.kind === "group" && g.id !== n.id);
    const nodeCx = position.x + 50;
    const nodeCy = position.y + 20;
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
        n.position = { x: position.x - g.position.x, y: position.y - g.position.y };
        n.parentId = g.id;
        n.extent = "parent" as const;
        break;
      }
    }

    graphStore.setNodes([...allNodes, n]);
    graphStore.setSelected(n.id);
  }, []);

  const onDropTouch = useCallback(
    (kind: string, position: { x: number; y: number }) => {
      addNodeAtPosition(kind, position);
    },
    [addNodeAtPosition],
  );

  const addNodeAtCenter = useCallback(
    (kind: string) => {
      const wrapper = wrapperRef.current;
      const rect = wrapper?.getBoundingClientRect();
      const point = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      addNodeAtPosition(kind, rf.screenToFlowPosition(point));
    },
    [addNodeAtPosition, rf, wrapperRef],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData("application/x-crypto-kind");
      if (!kind) return;
      addNodeAtPosition(kind, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [addNodeAtPosition, rf],
  );

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
    onDropTouch,
    addNodeAtCenter,
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
