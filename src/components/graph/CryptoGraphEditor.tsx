import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionLineType,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
  type Node as RFNode,
  type Viewport,
} from "@xyflow/react";
import { toCanvas } from "html-to-image";
import "@xyflow/react/dist/style.css";

import { CryptoNode } from "./CryptoNode";
import { NoteNode } from "./parts/NoteNode";
import { GroupNode } from "./parts/GroupNode";
import { NodeInspector } from "./NodeInspector";
import { OutputConsole } from "./OutputConsole";
import { graphStore, useGraphStore } from "./store";
import { loadExternalNode, NODE_KIND_META } from "@/lib/crypto/registry";
import type { GraphEdge, GraphNode } from "@/lib/crypto/types";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  MousePointer2,
  Loader2,
  FileText,
  Wand,
  Camera,
  CornerDownRight,
  GitBranch,
  Download,
  Layers,
  Settings2,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { PluginManager } from "./PluginManager";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// New parts and hooks
import { ExecutionStatus } from "./parts/ExecutionStatus";
import { WorkflowTab } from "./parts/WorkflowTab";
import { GraphDialogs } from "./parts/GraphDialogs";
import { Sidebar } from "./parts/Sidebar";
import { PromptDialog } from "./parts/PromptDialog";
import { SaveOutputDialog } from "./parts/SaveOutputDialog";

import { useGraphExecution } from "./hooks/useGraphExecution";
import { useGraphInteraction } from "./hooks/useGraphInteraction";
import { useWorkflowActions } from "./hooks/useWorkflowActions";

import { toast } from "sonner";

const nodeTypes = {
  crypto: CryptoNode,
  note: NoteNode,
  cryptoGroup: GroupNode,
};

function InnerEditor({
  onSaveOutputRef,
}: {
  onSaveOutputRef: React.MutableRefObject<((id: string) => void) | null>;
}) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [leftPanelOpen, setLeftPanelOpen] = useState(!isMobile);
  const [rightPanelOpen, setRightPanelOpen] = useState(!isMobile);
  const [mobileSheet, setMobileSheet] = useState<"palette" | "inspector" | null>(null);

  const workflows = useGraphStore((s) => s.workflows);
  const activeId = useGraphStore((s) => s.activeId);
  const graphKey = useGraphStore((s) => s.graphKey);
  const active = useGraphStore(
    (s) => s.workflows.find((w) => w.id === s.activeId) ?? s.workflows[0],
  );
  const nodes = active.nodes;
  const edges = active.edges;
  const prevNodesRef = useRef(nodes);
  const flowNodesRef = useRef<import("@xyflow/react").Node[]>([]);
  if (nodes !== prevNodesRef.current) {
    prevNodesRef.current = nodes;
    flowNodesRef.current = nodes.map((n) => ({
      ...n,
      data: { ...n.data, fileBytes: undefined },
    }));
  }
  const selectedNode = active.nodes.find((n) => n.id === active.selectedNodeId) ?? null;
  const selectedEdgeId = active.selectedEdgeId;

  const [edgeType, setEdgeType] = useState<"smoothstep" | "default">("smoothstep");
  const [screenshotFormat, setScreenshotFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pluginDialogOpen, setPluginDialogOpen] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroup && !nodes.some((n) => n.id === selectedGroup)) {
      setSelectedGroup(null);
    }
  }, [nodes, selectedGroup]);

  // Logic extracted to hooks
  const { execRunning, execLogs, errorCount, execute } = useGraphExecution(
    activeId,
    nodes,
    edges,
    selectedGroup,
  );
  const interaction = useGraphInteraction(nodes, edges, wrapperRef);
  const workflowActions = useWorkflowActions(workflows);

  // --- Mobile & Pointer Drag and Drop Logic ---
  const touchStartPos = useRef<{ x: number; y: number; kind: string } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ kind: string; x: number; y: number } | null>(
    null,
  );

  const handlePointerDownNode = useCallback((e: React.PointerEvent, kind: string) => {
    // Let native HTML5 handle mouse on desktop for ghost image support
    if (e.pointerType === "mouse") return;
    touchStartPos.current = { x: e.clientX, y: e.clientY, kind };
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (draggedItem) {
        setDraggedItem({ ...draggedItem, x: e.clientX, y: e.clientY });
      } else if (touchStartPos.current) {
        const dx = e.clientX - touchStartPos.current.x;
        const dy = e.clientY - touchStartPos.current.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          setDraggedItem({ kind: touchStartPos.current.kind, x: e.clientX, y: e.clientY });
          setMobileSheet(null); // auto-close mobile sheet if dragging
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (draggedItem) {
        const itemKind = draggedItem.kind;
        setDraggedItem(null);
        touchStartPos.current = null;

        if (wrapperRef.current && rf) {
          const rect = wrapperRef.current.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            interaction.onDropTouch(itemKind, flowPos);
          }
        }
      } else {
        touchStartPos.current = null;
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggedItem, rf, interaction]);
  // ---------------------------------------------

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const cur = graphStore.getActive().nodes;
    graphStore.setNodes(applyNodeChanges(changes, cur) as GraphNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    graphStore.setEdges(applyEdgeChanges(changes, graphStore.getActive().edges));
  }, []);

  const onConnect = useCallback(
    (conn: Connection) => {
      graphStore.snapshot();
      const cur = graphStore.getActive().edges;
      const filtered = cur.filter(
        (e) => e.target !== conn.target || e.targetHandle !== conn.targetHandle,
      );
      graphStore.setEdges(
        addEdge({ ...conn, type: edgeType, animated: true }, filtered) as GraphEdge[],
      );
    },
    [edgeType],
  );
  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: RFNode[] }) => {
    graphStore.setSelected(sel[0]?.id ?? null);
  }, []);

  const isValidConnection = useCallback(
    (conn: Connection | GraphEdge) => {
      if (conn.source === conn.target) return false;

      const sourceNode = nodes.find((n) => n.id === conn.source);
      const targetNode = nodes.find((n) => n.id === conn.target);
      if (!sourceNode || !targetNode) return false;

      // Group isolation: check group-level allowInbound / allowOutbound settings
      if (sourceNode.parentId !== targetNode.parentId) {
        if (sourceNode.parentId) {
          const group = nodes.find((n) => n.id === sourceNode.parentId);
          if (!group || group.data.allowOutbound !== "yes") return false;
        }
        if (targetNode.parentId) {
          const group = nodes.find((n) => n.id === targetNode.parentId);
          if (!group || group.data.allowInbound !== "yes") return false;
        }
      }

      const sourceMeta = NODE_KIND_META[sourceNode.data.kind];
      const targetMeta = NODE_KIND_META[targetNode.data.kind];
      if (!sourceMeta || !targetMeta) return false;

      // 1. Determine Source Output Type
      let sourceOutType = "raw";
      if (conn.sourceHandle && conn.sourceHandle !== "default") {
        const outMeta = sourceMeta.outputs?.find((o) => o.id === conn.sourceHandle);
        sourceOutType =
          outMeta?.type || sourceNode.data.outputFormat || sourceMeta.defaultOutput || "raw";
      } else {
        sourceOutType = sourceNode.data.outputFormat || sourceMeta.defaultOutput || "raw";
      }

      // 2. Determine Target Input Accept Types
      const inputMeta = targetMeta.inputs?.find((i) => i.id === (conn.targetHandle || "data"));
      const accepts = inputMeta?.acceptTypes || [];

      if (accepts.length === 0 || accepts.includes("any")) return true;

      const src = sourceOutType.toLowerCase();
      const acc = accepts.map((t) => t.toLowerCase());

      // 3. Strict Match
      if (acc.includes(src)) return true;

      // 4. Compatibility / Auto-conversion rules (matching getParamBytes logic)
      if (acc.includes("raw")) {
        // Anything that can be parsed as bytes is acceptable for a 'raw' input
        if (["hex", "base64", "utf8", "string", "text", "pem", "base32", "base58"].includes(src))
          return true;
      }

      if (acc.includes("string") || acc.includes("utf8") || acc.includes("text")) {
        if (["string", "utf8", "text"].includes(src)) return true;
      }

      return false;
    },
    [nodes],
  );

  const onMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    graphStore.setViewport(viewport);
  }, []);

  const onNodeFocus = useCallback(
    (nodeId: string) => {
      if (!rf) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Focus on the node elegantly using fitView
      rf.fitView({
        nodes: [{ id: nodeId }],
        duration: 400,
        padding: 0.5,
        minZoom: 1,
        maxZoom: 1.2,
      });

      // Select it and bring to front
      graphStore.setNodes(
        nodes.map((n) => ({
          ...n,
          selected: n.id === nodeId,
        })),
      );
      graphStore.setSelected(nodeId);
      graphStore.bringToFront(nodeId);
    },
    [rf, nodes],
  );

  // Get selected edges based on selected node or directly selected edges
  const selectedEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    edges.forEach((e) => {
      if (e.id === selectedEdgeId || e.selected) {
        ids.add(e.id);
      }
      // Also check if connected to selected node
      if (selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id)) {
        ids.add(e.id);
      }
    });
    return ids;
  }, [edges, selectedNode, selectedEdgeId]);

  const edgesWithState = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const sourceMeta = sourceNode ? NODE_KIND_META[sourceNode.data.kind] : null;

      let typeColor = "var(--color-graph-line)";
      if (sourceMeta) {
        let sourceType = "raw";
        if (edge.sourceHandle && edge.sourceHandle !== "default") {
          const outMeta = sourceMeta.outputs?.find((o) => o.id === edge.sourceHandle);
          sourceType =
            outMeta?.type || sourceNode!.data.outputFormat || sourceMeta.defaultOutput || "raw";
        } else {
          sourceType = sourceNode!.data.outputFormat || sourceMeta.defaultOutput || "raw";
        }

        const t = sourceType.toLowerCase();
        if (["utf8", "string", "text"].includes(t)) typeColor = "var(--color-handle-string)";
        else if (["hex", "base64", "base32", "base58"].includes(t))
          typeColor = "var(--color-handle-hex)";
        else if (["pem", "cert", "x509"].includes(t)) typeColor = "var(--color-handle-cert)";
        else if (["cryptokey", "key", "privatekey", "publickey"].includes(t))
          typeColor = "var(--color-handle-key)";
        else if (["bool"].includes(t)) typeColor = "var(--color-handle-bool)";
        else if (["json", "object"].includes(t)) typeColor = "var(--color-handle-json)";
      }

      const hasError = !!sourceNode?.data.error;
      const isSelected = edge.selected || selectedEdgeIds.has(edge.id);
      return {
        ...edge,
        selected: isSelected,
        animated: !hasError,
        zIndex: isSelected ? 100 : undefined,
        style: {
          ...edge.style,
          stroke: isSelected
            ? "var(--color-graph-line-selected)"
            : hasError
              ? "var(--color-graph-line-error)"
              : typeColor,
          strokeWidth: isSelected ? 3 : 2,
          transition: "stroke 0.2s, stroke-width 0.2s",
          ...(hasError ? { strokeDasharray: "5 5" } : {}),
        },
      };
    });
  }, [edges, nodes, selectedEdgeIds]);

  // 4. Handle workflow switching (Stable instance model)
  useEffect(() => {
    if (!rf) return;
    if (active.viewport) {
      rf.setViewport(active.viewport);
    }
  }, [activeId, rf]); // Stable length: 2

  // 5. Handle major graph changes (Templates, Imports, Shared Links)
  useEffect(() => {
    if (!rf || nodes.length === 0) return;

    // For new/imported graphs (indicated by graphKey bump), fit view
    const t = setTimeout(() => {
      rf.fitView({ padding: 0.3, duration: 200 });
      // Ensure browser has stable dimensions
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(t);
  }, [graphKey, rf]); // Stable length: 2

  // Load saved plugins on startup
  useEffect(() => {
    const pluginUrls = graphStore.get().pluginUrls || [];
    pluginUrls.forEach(async (url) => {
      try {
        await loadExternalNode(url);
      } catch (e) {
        console.error(`Failed to autoload plugin ${url}:`, e);
      }
    });
  }, []);

  const ctxNode = interaction.contextMenu
    ? nodes.find((n) => n.id === interaction.contextMenu!.nodeId)
    : null;

  const groups = useMemo(() => nodes.filter((n) => n.data.kind === "group"), [nodes]);
  const selectedNonGroupNodes = useMemo(
    () => nodes.filter((n) => n.selected && n.data.kind !== "group"),
    [nodes],
  );

  const setNodeGroup = useCallback((nodeId: string, groupId: string | null) => {
    graphStore.snapshot();
    const w = graphStore.getActive();
    const node = w.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (groupId) {
      const group = w.nodes.find((n) => n.id === groupId);
      if (!group) return;
      let absX = node.position.x;
      let absY = node.position.y;
      if (node.parentId) {
        const p = w.nodes.find((n) => n.id === node.parentId);
        if (p) {
          absX += p.position.x;
          absY += p.position.y;
        }
      }
      graphStore.setNodes(
        w.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position: { x: absX - group.position.x, y: absY - group.position.y },
                parentId: groupId,
                extent: "parent" as const,
              }
            : n,
        ),
      );
    } else if (node.parentId) {
      const parent = w.nodes.find((n) => n.id === node.parentId);
      const newPos = parent
        ? { x: node.position.x + parent.position.x, y: node.position.y + parent.position.y }
        : node.position;
      graphStore.setNodes(
        w.nodes.map((n) =>
          n.id === nodeId ? { ...n, position: newPos, parentId: undefined, extent: undefined } : n,
        ),
      );
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex">
      {isMobile ? (
        /* Mobile: toolbar overlay */
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-3 py-1.5 bg-card/90 backdrop-blur-xl border border-border rounded-full shadow-xl">
          <button
            onClick={() => setMobileSheet(mobileSheet === "palette" ? null : "palette")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" /> Palette
          </button>
          {selectedNode && (
            <button
              onClick={() => setMobileSheet(mobileSheet === "inspector" ? null : "inspector")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-foreground hover:bg-accent/80 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" /> Inspector
            </button>
          )}
        </div>
      ) : (
        <Sidebar
          leftPanelOpen={leftPanelOpen}
          setLeftPanelOpen={setLeftPanelOpen}
          setPluginDialogOpen={setPluginDialogOpen}
          onDragStart={interaction.onDragStart}
          onPointerDownNode={handlePointerDownNode}
          onAddNode={interaction.addNodeAtCenter}
          openExportDialog={workflowActions.openExportDialog}
          openImportDialog={workflowActions.openImportDialog}
          openShareDialog={workflowActions.openShareDialog}
        />
      )}

      <Sheet
        open={isMobile && mobileSheet === "palette"}
        onOpenChange={(open) => setMobileSheet(open ? "palette" : null)}
      >
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-xl z-[70]">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-left text-sm font-semibold">Palette</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              leftPanelOpen={true}
              setLeftPanelOpen={() => {}}
              setPluginDialogOpen={setPluginDialogOpen}
              onDragStart={interaction.onDragStart}
              onPointerDownNode={handlePointerDownNode}
              onAddNode={(kind) => {
                interaction.addNodeAtCenter(kind);
                setMobileSheet(null);
                import("sonner").then((m) => m.toast.success("Node added to center of canvas"));
              }}
              openExportDialog={workflowActions.openExportDialog}
              openImportDialog={workflowActions.openImportDialog}
              openShareDialog={workflowActions.openShareDialog}
              isMobile={true}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isMobile && mobileSheet === "inspector" && !!selectedNode}
        onOpenChange={(open) => setMobileSheet(open ? "inspector" : null)}
      >
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-xl z-[70]">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-left text-sm font-semibold">Inspector</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedNode && <NodeInspector key={selectedNode.id} node={selectedNode} />}
          </div>
        </SheetContent>
      </Sheet>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={workflowActions.handleImportFile}
      />

      {/* Center: Canvas + Console */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={wrapperRef}
            className={`absolute inset-0 z-0 ${isShutterActive ? "shutter-active" : ""}`}
            onDrop={interaction.onDrop}
            onDragOver={interaction.onDragOver}
          >
            <ReactFlow
              nodes={flowNodesRef.current}
              edges={edgesWithState}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onSelectionChange={onSelectionChange}
              onPaneClick={interaction.onPaneClick}
              onContextMenu={interaction.onPaneContextMenu}
              onNodeClick={interaction.onNodeClick}
              onNodeContextMenu={interaction.onNodeContextMenu}
              onNodeDragStart={(_e, node) => {
                graphStore.snapshot();
                graphStore.bringToFront(node.id);
              }}
              onNodeDragStop={interaction.onNodeDragStop}
              onEdgeClick={interaction.onEdgeClick}
              onEdgeContextMenu={interaction.onEdgeContextMenu}
              onMoveEnd={onMoveEnd}
              onBeforeDelete={async () => {
                graphStore.snapshot();
                return true;
              }}
              onInit={setRf}
              defaultViewport={active.viewport}
              minZoom={0.1}
              maxZoom={2}
              elementsSelectable={true}
              elevateNodesOnSelect={false}
              snapToGrid={true}
              snapGrid={[10, 10]}
              selectionOnDrag={interaction.selectionMode}
              panOnDrag={!interaction.selectionMode}
              connectionLineType={
                edgeType === "smoothstep"
                  ? ConnectionLineType.SmoothStep
                  : ConnectionLineType.Bezier
              }
              defaultEdgeOptions={{
                type: edgeType,
                animated: true,
                style: { stroke: "var(--color-graph-line)", strokeWidth: 2 },
              }}
              colorMode={theme === "dark" ? "dark" : "light"}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="var(--color-graph-grid)"
              />
              <Controls
                showZoom
                showFitView
                showInteractive
                className="react-flow-controls-custom"
                style={{ left: 12, bottom: isMobile ? 64 : 12 }}
              />
              <button
                onClick={() => {
                  const next = edgeType === "smoothstep" ? "default" : "smoothstep";
                  setEdgeType(next);
                  const w = graphStore.getActive();
                  graphStore.setEdges(w.edges.map((e) => ({ ...e, type: next })));
                }}
                className={`graph-toolbar absolute z-10 flex items-center justify-center rounded-md border bg-card text-muted-foreground border-border hover:bg-accent shadow-md transition-all ${isMobile ? "w-10 h-10" : "w-7 h-7"}`}
                title={
                  edgeType === "smoothstep"
                    ? "Switch to curved edges"
                    : "Switch to right-angle edges"
                }
                aria-label={
                  edgeType === "smoothstep"
                    ? "Switch to curved edges"
                    : "Switch to right-angle edges"
                }
                style={{ top: 12, right: isMobile ? 104 : 76 }}
              >
                {edgeType === "smoothstep" ? (
                  <CornerDownRight className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                ) : (
                  <GitBranch className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                )}
              </button>
              <button
                onClick={() => {
                  graphStore.reflowLayout();
                  setTimeout(() => rf?.fitView({ padding: 0.3, duration: 200 }), 50);
                }}
                disabled={nodes.length === 0}
                className={`graph-toolbar absolute z-10 flex items-center justify-center rounded-md border bg-card text-muted-foreground border-border hover:bg-accent shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none ${isMobile ? "w-10 h-10" : "w-7 h-7"}`}
                title="Auto-layout nodes with Dagre"
                aria-label="Auto-layout nodes with Dagre"
                style={{ top: 12, right: isMobile ? 58 : 44 }}
              >
                <Wand className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
              </button>
              <div
                className="graph-toolbar absolute z-10 flex flex-col items-end"
                style={{ top: 12, right: isMobile ? 150 : 108 }}
              >
                <button
                  onClick={() => setShowFormatPicker((v) => !v)}
                  disabled={nodes.length === 0}
                  className={`flex items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-accent shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none ${isMobile ? "w-10 h-10" : "w-7 h-7"}`}
                  title={`Export screenshot (${screenshotFormat.toUpperCase()})`}
                  aria-label={`Export screenshot as ${screenshotFormat.toUpperCase()}`}
                >
                  <Camera className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                </button>
                {showFormatPicker && (
                  <div className="graph-toolbar absolute top-full right-0 mt-1 flex flex-col rounded-md border bg-card shadow-md overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={async () => {
                          setScreenshotFormat(fmt);
                          setShowFormatPicker(false);
                          if (!wrapperRef.current || !rf) return;

                          const renderer = wrapperRef.current.querySelector(
                            ".react-flow",
                          ) as HTMLElement | null;
                          if (!renderer) return;

                          const capture = async () => {
                            // 1. Shutter Flash (CSS GPU Animation)
                            setIsShutterActive(true);
                            // 2. Breath for 150ms to let animations start
                            await new Promise((r) => setTimeout(r, 150));

                            const options = {
                              backgroundColor:
                                getComputedStyle(document.body).backgroundColor || "#09090b",
                              pixelRatio: 4, // Ultra-HD resolution
                              skipFonts: false,
                              style: { transform: "scale(1)" },
                              filter: (node: HTMLElement) => {
                                const cls = node.getAttribute?.("class") || "";

                                if (cls.includes("graph-toolbar")) return false;
                                return !["minimap", "controls", "panel", "attribution"].some((e) =>
                                  cls.includes(`react-flow__${e}`),
                                );
                              },
                            };

                            // Use toCanvas -> toBlob for better stability and performance at high pixelRatio
                            const canvas = await toCanvas(renderer, options);
                            const blob = await new Promise<Blob | null>((resolve) =>
                              canvas.toBlob(
                                resolve,
                                `image/${fmt === "jpeg" ? "jpeg" : fmt}`,
                                fmt === "png" ? undefined : 0.95,
                              ),
                            );

                            if (!blob) throw new Error("Capture failed");
                            const dataUrl = URL.createObjectURL(blob);

                            const a = document.createElement("a");
                            a.href = dataUrl;
                            a.download = `flowforge-crypto-${Date.now()}.${fmt}`;
                            a.click();

                            // Cleanup
                            setTimeout(() => URL.revokeObjectURL(dataUrl), 2000);
                            setIsShutterActive(false);
                          };

                          toast.promise(capture(), {
                            loading: `Capturing ${fmt.toUpperCase()}...`,
                            success: "Snapshot exported successfully!",
                            error: "Capture failed. Try a different format.",
                          });
                        }}
                        className={`px-3 py-1.5 text-[11px] text-left whitespace-nowrap hover:bg-accent transition-all ${fmt === screenshotFormat ? "bg-accent font-bold text-primary" : "text-muted-foreground"}`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => interaction.setSelectionMode((v) => !v)}
                title={
                  interaction.selectionMode ? "Switch to pan mode" : "Switch to selection mode"
                }
                aria-label={
                  interaction.selectionMode ? "Switch to pan mode" : "Switch to selection mode"
                }
                className={`graph-toolbar absolute z-10 flex items-center justify-center rounded-md border shadow-md transition-all cursor-pointer ${
                  interaction.selectionMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                } ${isMobile ? "w-10 h-10" : "w-7 h-7"}`}
                style={{ top: 12, right: 12 }}
              >
                <MousePointer2 className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
              </button>
              {nodes.length > 0 && (
                <MiniMap
                  pannable
                  zoomable
                  bgColor="var(--minimap-bg)"
                  maskColor="var(--minimap-mask)"
                  maskStrokeColor="var(--minimap-mask-stroke)"
                  nodeClassName={(node) => {
                    const meta = NODE_KIND_META[String(node.data.kind)];
                    return meta ? `mm-${meta.category}` : "";
                  }}
                  style={{ right: 12, bottom: 12 }}
                />
              )}
            </ReactFlow>

            {/* Execution Status Bar */}
            <ExecutionStatus
              errorCount={errorCount}
              nodeCount={nodes.length}
              nodes={nodes}
              onNodeFocus={onNodeFocus}
            />

            {/* Execution Loading Overlay */}
            {execRunning && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background/20 backdrop-blur-[1px] pointer-events-none">
                <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-background/80 border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
                  <Loader2 className="w-6 h-6 text-primary animate-spin will-change-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
                    Executing pipeline...
                  </span>
                </div>
              </div>
            )}

            {/* Node context menu */}
            {interaction.contextMenu && ctxNode && (
              <div
                className="absolute z-50 w-40 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl"
                style={{ left: interaction.contextMenu.x, top: interaction.contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider truncate font-semibold">
                  {ctxNode.data.label}
                </div>
                <button
                  onClick={() => {
                    interaction.copySelected();
                    interaction.setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={interaction.copyOutput}
                  disabled={!ctxNode.data.output}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy output
                </button>
                <button
                  onClick={() => {
                    onSaveOutputRef.current?.(ctxNode.id);
                    interaction.setContextMenu(null);
                  }}
                  disabled={!ctxNode.data.output}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Download className="w-3 h-3" /> Save output
                </button>
                <button
                  onClick={interaction.duplicateNode}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                {ctxNode.data.kind !== "group" && groups.length > 0 && (
                  <>
                    <div className="my-0.5 border-t border-border/50" />
                    <div className="px-2.5 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Assign to Group
                    </div>
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setNodeGroup(ctxNode.id, ctxNode.parentId === g.id ? null : g.id);
                          interaction.setContextMenu(null);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors ${ctxNode.parentId === g.id ? "text-primary" : ""}`}
                      >
                        <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                        {g.data.label as string}
                        {ctxNode.parentId === g.id && <span className="ml-auto text-[9px]">✓</span>}
                      </button>
                    ))}
                    {ctxNode.parentId && (
                      <button
                        onClick={() => {
                          setNodeGroup(ctxNode.id, null);
                          interaction.setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Group
                      </button>
                    )}
                  </>
                )}
                <div className="my-0.5 border-t border-border/50" />
                <button
                  onClick={interaction.deleteNode}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}

            {/* Edge context menu */}
            {interaction.contextMenu && interaction.contextMenu.edgeId && (
              <div
                className="absolute z-50 w-28 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl"
                style={{ left: interaction.contextMenu.x, top: interaction.contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={interaction.deleteEdge}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Disconnect
                </button>
              </div>
            )}

            {/* Multi-select context menu */}
            {interaction.contextMenu && interaction.contextMenu.multi && (
              <div
                className="absolute z-50 w-40 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl"
                style={{ left: interaction.contextMenu.x, top: interaction.contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {rf?.getNodes().some((n) => n.selected)
                    ? `${rf.getNodes().filter((n) => n.selected).length} selected`
                    : "Selection"}
                </div>
                <button
                  onClick={interaction.copySelected}
                  disabled={!rf?.getNodes().some((n) => n.selected)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={interaction.pasteClipboard}
                  disabled={!interaction.clipboard}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Paste
                </button>
                <button
                  onClick={interaction.duplicateSelected}
                  disabled={!rf?.getNodes().some((n) => n.selected)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
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
                          for (const n of selectedNonGroupNodes) {
                            setNodeGroup(n.id, n.parentId === g.id ? null : g.id);
                          }
                          interaction.setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                        {g.data.label as string}
                      </button>
                    ))}
                    {selectedNonGroupNodes.some((n) => n.parentId) && (
                      <button
                        onClick={() => {
                          for (const n of selectedNonGroupNodes) {
                            if (n.parentId) setNodeGroup(n.id, null);
                          }
                          interaction.setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Group
                      </button>
                    )}
                  </>
                )}
                <div className="my-0.5 border-t border-border/50" />
                <button
                  onClick={interaction.deleteSelected}
                  disabled={!rf?.getNodes().some((n) => n.selected)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* Floating Top Tabs */}
          <div className="absolute top-4 inset-x-4 flex sm:justify-center justify-start z-10 pointer-events-none">
            <div className="flex items-center gap-1 p-1 bg-card/80 backdrop-blur-xl border border-border rounded-lg shadow-md pointer-events-auto max-w-full overflow-x-auto custom-scrollbar">
              {workflows.map((w) => (
                <WorkflowTab
                  key={w.id}
                  id={w.id}
                  name={w.name}
                  active={w.id === activeId}
                  canClose={workflows.length > 1}
                />
              ))}
              <button
                onClick={() => graphStore.addWorkflow()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 ml-1"
                title="New workflow"
              >
                <Plus className="w-4 h-4" /> New Tab
              </button>
              <div className="w-px h-4 bg-border mx-1 shrink-0" />
              <button
                onClick={() => setPromptDialogOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                title="Generate workflow prompt for AI"
              >
                <FileText className="w-4 h-4" /> Prompt
              </button>
            </div>
          </div>
        </div>

        {/* Console */}
        <OutputConsole
          logs={execLogs}
          running={execRunning}
          onRun={execute}
          nodes={nodes}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
        />
      </div>

      {/* Right Inspector — hidden on mobile (use sheet instead) */}
      {!isMobile && (
        <aside
          className={`bg-card border-l border-border flex flex-col overflow-hidden transition-all duration-200 shrink-0 ${rightPanelOpen ? "w-80" : "w-8"}`}
        >
          <div
            className={`flex items-center h-8 shrink-0 border-b border-border ${rightPanelOpen ? "gap-2 px-3 min-w-80" : "px-1 justify-center"}`}
          >
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
              aria-label={rightPanelOpen ? "Collapse inspector" : "Expand inspector"}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${rightPanelOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {rightPanelOpen && (
              <span className="text-xs font-semibold text-foreground">Inspector</span>
            )}
          </div>

          {rightPanelOpen && (
            <NodeInspector
              key={selectedNode?.id}
              node={selectedNode}
              onSaveOutput={(id) => onSaveOutputRef.current?.(id)}
            />
          )}
        </aside>
      )}

      <GraphDialogs
        workflows={workflows}
        exportDialogOpen={workflowActions.exportDialogOpen}
        setExportDialogOpen={workflowActions.setExportDialogOpen}
        exportSelectedIds={workflowActions.exportSelectedIds}
        setExportSelectedIds={workflowActions.setExportSelectedIds}
        exportText={workflowActions.exportText}
        handleExportConfirm={workflowActions.handleExportConfirm}
        importDialogOpen={workflowActions.importDialogOpen}
        setImportDialogOpen={workflowActions.setImportDialogOpen}
        importCandidates={workflowActions.importCandidates}
        importSelectedIds={workflowActions.importSelectedIds}
        setImportSelectedIds={workflowActions.setImportSelectedIds}
        importText={workflowActions.importText}
        setImportText={workflowActions.setImportText}
        handleImportText={workflowActions.handleImportText}
        handleImportConfirm={workflowActions.handleImportConfirm}
        fileInputRef={fileInputRef}
        shareDialogOpen={workflowActions.shareDialogOpen}
        setShareDialogOpen={workflowActions.setShareDialogOpen}
        shareSelectedIds={workflowActions.shareSelectedIds}
        setShareSelectedIds={workflowActions.setShareSelectedIds}
        shareUrl={workflowActions.shareUrl}
        handleShareConfirm={workflowActions.handleShareConfirm}
        shareImportDialogOpen={workflowActions.shareImportDialogOpen}
        setShareImportDialogOpen={workflowActions.setShareImportDialogOpen}
        sharedWorkflows={workflowActions.sharedWorkflows}
        handleShareImportConfirm={workflowActions.handleShareImportConfirm}
      />

      <PluginManager open={pluginDialogOpen} onOpenChange={setPluginDialogOpen} />
      <PromptDialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen} />

      {/* Pointer Event Drag Preview */}
      {draggedItem && (
        <div
          className="fixed z-[100] pointer-events-none opacity-90 shadow-2xl"
          style={{
            left: draggedItem.x,
            top: draggedItem.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="bg-card border border-border px-3 py-1.5 rounded-md flex items-center justify-center min-w-[80px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              {NODE_KIND_META[draggedItem.kind]?.label || draggedItem.kind}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CryptoGraphEditor() {
  const saveDialogTriggerRef = useRef<((id: string) => void) | null>(null);

  return (
    <ReactFlowProvider>
      <InnerEditor onSaveOutputRef={saveDialogTriggerRef} />
      <SaveDialogBridge triggerRef={saveDialogTriggerRef} />
    </ReactFlowProvider>
  );
}

function SaveDialogBridge({
  triggerRef,
}: {
  triggerRef: React.MutableRefObject<((id: string) => void) | null>;
}) {
  const [nodeId, setNodeId] = useState<string | null>(null);

  useEffect(() => {
    triggerRef.current = (id: string) => setNodeId(id);
    return () => {
      triggerRef.current = null;
    };
  }, [triggerRef]);

  const node = useGraphStore((s) => {
    if (!nodeId) return null;
    const active = s.workflows.find((w) => w.id === s.activeId);
    return active?.nodes.find((n) => n.id === nodeId) ?? null;
  });

  if (!node) return null;

  return (
    <SaveOutputDialog
      open={nodeId !== null}
      onOpenChange={(open) => {
        if (!open) setNodeId(null);
      }}
      node={{
        ...node,
        data: {
          ...node.data,
          fileBytes: undefined,
        },
      }}
    />
  );
}
