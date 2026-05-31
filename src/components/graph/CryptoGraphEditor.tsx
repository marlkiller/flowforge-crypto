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
import { toPng, toJpeg, toCanvas } from "html-to-image";
import "@xyflow/react/dist/style.css";

import { CryptoNode } from "./CryptoNode";
import { NoteNode } from "./parts/NoteNode";
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
  Wand,
  Camera,
  CornerDownRight,
  GitBranch,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { PluginManager } from "./PluginManager";

// New parts and hooks
import { ExecutionStatus } from "./parts/ExecutionStatus";
import { WorkflowTab } from "./parts/WorkflowTab";
import { GraphDialogs } from "./parts/GraphDialogs";
import { Sidebar } from "./parts/Sidebar";
import { useGraphExecution } from "./hooks/useGraphExecution";
import { useGraphInteraction } from "./hooks/useGraphInteraction";
import { useWorkflowActions } from "./hooks/useWorkflowActions";

const nodeTypes = {
  crypto: CryptoNode,
  note: NoteNode,
};

function InnerEditor() {
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
  const selectedNode = active.nodes.find((n) => n.id === active.selectedNodeId) ?? null;
  const selectedEdgeId = active.selectedEdgeId;

  const [edgeType, setEdgeType] = useState<"smoothstep" | "default">("smoothstep");
  const [screenshotFormat, setScreenshotFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pluginDialogOpen, setPluginDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const toggleCat = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Logic extracted to hooks
  const { execRunning, execLogs, errorCount, execute } = useGraphExecution(activeId, nodes, edges);
  const interaction = useGraphInteraction(nodes, edges, wrapperRef);
  const workflowActions = useWorkflowActions(workflows);

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

      // Select it
      graphStore.setSelected(nodeId);
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
      const hasError = !!sourceNode?.data.error;
      const isSelected = edge.selected || selectedEdgeIds.has(edge.id);
      return {
        ...edge,
        selected: isSelected,
        animated: !hasError,
        style: {
          ...edge.style,
          stroke: isSelected
            ? "var(--color-graph-line-selected)"
            : hasError
              ? "var(--color-graph-line-error)"
              : "var(--color-graph-line)",
          strokeWidth: isSelected ? 3 : 2,
          transition: "stroke 0.2s, stroke-width 0.2s",
          ...(hasError ? { strokeDasharray: "5 5" } : {}),
        },
      };
    });
  }, [edges, nodes, selectedEdgeIds]);

  useEffect(() => {
    if (rf && nodes.length > 0) {
      rf.fitView({ padding: 0.3 });
    }
    // only run when graphKey bumps (template switch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey]);

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

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex">
      {isMobile ? (
        /* Mobile: toolbar overlay */
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-3 py-1.5 bg-card/90 backdrop-blur-xl border border-border rounded-full shadow-xl">
          <button
            onClick={() => setMobileSheet(mobileSheet === "palette" ? null : "palette")}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Palette
          </button>
          {selectedNode && (
            <button
              onClick={() => setMobileSheet(mobileSheet === "inspector" ? null : "inspector")}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-foreground hover:bg-accent/80 transition-colors"
            >
              Inspector
            </button>
          )}
        </div>
      ) : (
        <Sidebar
          leftPanelOpen={leftPanelOpen}
          setLeftPanelOpen={setLeftPanelOpen}
          setPluginDialogOpen={setPluginDialogOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          collapsedCats={collapsedCats}
          toggleCat={toggleCat}
          onDragStart={interaction.onDragStart}
          openExportDialog={workflowActions.openExportDialog}
          openShareDialog={workflowActions.openShareDialog}
          fileInputRef={fileInputRef}
        />
      )}

      {isMobile && mobileSheet === "palette" && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold">Palette</span>
            <button
              onClick={() => setMobileSheet(null)}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              aria-label="Close palette"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              leftPanelOpen={true}
              setLeftPanelOpen={() => {}}
              setPluginDialogOpen={setPluginDialogOpen}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              collapsedCats={collapsedCats}
              toggleCat={toggleCat}
              onDragStart={interaction.onDragStart}
              openExportDialog={workflowActions.openExportDialog}
              openShareDialog={workflowActions.openShareDialog}
              fileInputRef={fileInputRef}
            />
          </div>
        </div>
      )}

      {isMobile && mobileSheet === "inspector" && selectedNode && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold">Inspector</span>
            <button
              onClick={() => setMobileSheet(null)}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              aria-label="Close inspector"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NodeInspector key={selectedNode.id} node={selectedNode} />
          </div>
        </div>
      )}

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
            className="absolute inset-0 z-0"
            onDrop={interaction.onDrop}
            onDragOver={interaction.onDragOver}
          >
            <ReactFlow
              key={activeId}
              nodes={nodes}
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
              elevateNodesOnSelect={true}
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
              colorMode="light"
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
                style={{ left: 12, bottom: 12 }}
              />
              <button
                onClick={() => {
                  const next = edgeType === "smoothstep" ? "default" : "smoothstep";
                  setEdgeType(next);
                  const w = graphStore.getActive();
                  graphStore.setEdges(w.edges.map((e) => ({ ...e, type: next })));
                }}
                className="absolute z-10 flex items-center justify-center w-7 h-7 rounded-md border bg-card text-muted-foreground border-border hover:bg-accent shadow-md transition-all"
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
                style={{ top: 12, right: 76 }}
              >
                {edgeType === "smoothstep" ? (
                  <CornerDownRight className="w-4 h-4" />
                ) : (
                  <GitBranch className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  graphStore.reflowLayout();
                  setTimeout(() => rf?.fitView({ padding: 0.3, duration: 200 }), 50);
                }}
                disabled={nodes.length === 0}
                className="absolute z-10 flex items-center justify-center w-7 h-7 rounded-md border bg-card text-muted-foreground border-border hover:bg-accent shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Auto-layout nodes with Dagre"
                aria-label="Auto-layout nodes with Dagre"
                style={{ top: 12, right: 44 }}
              >
                <Wand className="w-4 h-4" />
              </button>
              <div
                className="absolute z-10 flex flex-col items-end"
                style={{ top: 12, right: 108 }}
              >
                <button
                  onClick={() => setShowFormatPicker((v) => !v)}
                  disabled={nodes.length === 0 || screenshotLoading}
                  className="flex items-center justify-center w-7 h-7 rounded-md border bg-card text-muted-foreground hover:bg-accent shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title={`Export screenshot (${screenshotFormat.toUpperCase()})`}
                  aria-label={`Export screenshot as ${screenshotFormat.toUpperCase()}`}
                >
                  {screenshotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                {showFormatPicker && (
                  <div className="absolute top-full right-0 mt-1 flex flex-col rounded-md border bg-card shadow-md overflow-hidden">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={async () => {
                          setScreenshotFormat(fmt);
                          setShowFormatPicker(false);
                          if (!wrapperRef.current || !rf) return;
                          setScreenshotLoading(true);
                          const renderer = wrapperRef.current.querySelector(
                            ".react-flow__renderer",
                          ) as HTMLElement | null;
                          if (!renderer) {
                            setScreenshotLoading(false);
                            return;
                          }
                          const bgColor =
                            getComputedStyle(document.body).backgroundColor || "#09090b";
                          try {
                            let dataUrl: string;
                            if (fmt === "png") {
                              dataUrl = await toPng(renderer, {
                                backgroundColor: bgColor,
                                pixelRatio: 3,
                                cacheBust: true,
                              });
                            } else if (fmt === "jpeg") {
                              dataUrl = await toJpeg(renderer, {
                                backgroundColor: bgColor,
                                pixelRatio: 3,
                                quality: 0.92,
                                cacheBust: true,
                              });
                            } else {
                              const cvs = await toCanvas(renderer, {
                                backgroundColor: bgColor,
                                pixelRatio: 3,
                                cacheBust: true,
                              });
                              dataUrl = await new Promise<string>((resolve) =>
                                cvs.toBlob(
                                  (b) => {
                                    if (b) {
                                      const u = URL.createObjectURL(b);
                                      resolve(u);
                                    } else resolve("");
                                  },
                                  "image/webp",
                                  0.9,
                                ),
                              );
                            }
                            if (!dataUrl) return;
                            const a = document.createElement("a");
                            a.href = dataUrl;
                            a.download = `flowforge-crypto-${Date.now()}.${fmt}`;
                            a.click();
                            if (fmt === "webp")
                              setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
                          } catch (e) {
                            console.error("Screenshot failed", e);
                          } finally {
                            setScreenshotLoading(false);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs text-left whitespace-nowrap hover:bg-accent transition-all ${fmt === screenshotFormat ? "bg-accent font-medium" : ""}`}
                      >
                        {fmt === "png" ? "PNG" : fmt === "jpeg" ? "JPEG" : "WebP"}
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
                className={`absolute z-10 flex items-center justify-center w-7 h-7 rounded-md border shadow-md transition-all cursor-pointer ${
                  interaction.selectionMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                }`}
                style={{ top: 12, right: 12 }}
              >
                <MousePointer2 className="w-4 h-4" />
              </button>
              {nodes.length > 0 && (
                <MiniMap
                  pannable
                  zoomable
                  bgColor="var(--graph-background)"
                  nodeColor="var(--muted-foreground)"
                  maskColor={theme === "dark" ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.5)"}
                  maskStrokeColor={theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)"}
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
                    // Manually handle copy for single node from context menu
                    // Note: clipboardRef is internal to useGraphInteraction, but we can call a method if we expose it
                    // For now, let's just use what's available
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
                  onClick={interaction.duplicateNode}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
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
          <div className="absolute top-4 inset-x-4 flex justify-center z-10 pointer-events-none">
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
            </div>
          </div>
        </div>

        {/* Console */}
        <OutputConsole logs={execLogs} running={execRunning} onRun={execute} />
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

          {rightPanelOpen && <NodeInspector key={selectedNode?.id} node={selectedNode} />}
        </aside>
      )}

      <GraphDialogs
        workflows={workflows}
        exportDialogOpen={workflowActions.exportDialogOpen}
        setExportDialogOpen={workflowActions.setExportDialogOpen}
        exportSelectedIds={workflowActions.exportSelectedIds}
        setExportSelectedIds={workflowActions.setExportSelectedIds}
        handleExportConfirm={workflowActions.handleExportConfirm}
        importDialogOpen={workflowActions.importDialogOpen}
        setImportDialogOpen={workflowActions.setImportDialogOpen}
        importCandidates={workflowActions.importCandidates}
        importSelectedIds={workflowActions.importSelectedIds}
        setImportSelectedIds={workflowActions.setImportSelectedIds}
        handleImportConfirm={workflowActions.handleImportConfirm}
        shareDialogOpen={workflowActions.shareDialogOpen}
        setShareDialogOpen={workflowActions.setShareDialogOpen}
        shareSelectedIds={workflowActions.shareSelectedIds}
        setShareSelectedIds={workflowActions.setShareSelectedIds}
        handleShareConfirm={workflowActions.handleShareConfirm}
        shareImportDialogOpen={workflowActions.shareImportDialogOpen}
        setShareImportDialogOpen={workflowActions.setShareImportDialogOpen}
        sharedWorkflows={workflowActions.sharedWorkflows}
        handleShareImportConfirm={workflowActions.handleShareImportConfirm}
      />

      <PluginManager open={pluginDialogOpen} onOpenChange={setPluginDialogOpen} />
    </div>
  );
}

export default function CryptoGraphEditor() {
  return (
    <ReactFlowProvider>
      <InnerEditor />
    </ReactFlowProvider>
  );
}
