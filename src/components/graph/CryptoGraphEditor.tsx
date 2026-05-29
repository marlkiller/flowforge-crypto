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
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
  type Node as RFNode,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CryptoNode } from "./CryptoNode";
import { NodeInspector } from "./NodeInspector";
import { OutputConsole } from "./OutputConsole";
import { graphStore, useGraphStore, type Workflow } from "./store";
import { executeGraph } from "@/lib/crypto/executor";
import { NODE_KIND_META, CATEGORY_META, defaultOutputFormat, getActiveCategories } from "@/lib/crypto/registry";
import type { GraphEdge, GraphNode, NodeExecutionLog } from "@/lib/crypto/types";
import { formatBytes } from "@/lib/crypto/service";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  X,
  Copy,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Hash,
  Download,
  Upload,
  MousePointer2,
  Loader2,
  Github,
  Share2,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

import { newNodeId, makeNode } from "@/lib/crypto/factory";
import {
  getAESStandardSeed,
  getRSAFullSuiteSeed,
  getHMACSeed,
  getKDFSeed,
  getECCSuiteSeed,
  getJWTSeed,
  getOTPSeed,
  getArgon2Seed,
  getRNCryptorV3Seed,
} from "@/demo/seeds";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { encodeWorkflows, decodeWorkflows, generateShareUrl, parseShareHash, type SharedWorkflow } from "@/lib/crypto/share";

// Execution status component
function ExecutionStatus({ errorCount, nodeCount }: { errorCount: number; nodeCount: number }) {
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

const nodeTypes = { crypto: CryptoNode };

function InnerEditor() {
  const { theme } = useTheme();
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [execLogs, setExecLogs] = useState<NodeExecutionLog[]>([]);
  const [execRunning, setExecRunning] = useState(false);

  const workflows = useGraphStore((s) => s.workflows);
  const activeId = useGraphStore((s) => s.activeId);
  const active = useGraphStore(
    (s) => s.workflows.find((w) => w.id === s.activeId) ?? s.workflows[0],
  );
  const nodes = active.nodes;
  const edges = active.edges;
  const selectedNode = active.nodes.find((n) => n.id === active.selectedNodeId) ?? null;
  const selectedEdgeId = active.selectedEdgeId;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const clipboardRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
    multi?: boolean;
  } | null>(null);

  // Export/Import dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportSelectedIds, setExportSelectedIds] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCandidates, setImportCandidates] = useState<Workflow[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareSelectedIds, setShareSelectedIds] = useState<Set<string>>(new Set());

  // Share import dialog state
  const [shareImportDialogOpen, setShareImportDialogOpen] = useState(false);
  const [sharedWorkflows, setSharedWorkflows] = useState<SharedWorkflow[]>([]);

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

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const cur = graphStore.getActive().nodes;
    graphStore.setNodes(applyNodeChanges(changes, cur) as GraphNode[]);
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    graphStore.setEdges(applyEdgeChanges(changes, graphStore.getActive().edges));
  }, []);
  const onConnect = useCallback((conn: Connection) => {
    graphStore.snapshot();
    const cur = graphStore.getActive().edges;
    const filtered = cur.filter(
      (e) => e.target !== conn.target || e.targetHandle !== conn.targetHandle,
    );
    graphStore.setEdges(addEdge({ ...conn, animated: true }, filtered) as GraphEdge[]);
  }, []);
  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: RFNode[] }) => {
    graphStore.setSelected(sel[0]?.id ?? null);
  }, []);
  const onPaneClick = useCallback(() => {
    graphStore.setSelected(null);
    graphStore.setEdgeSelected(null);
    setContextMenu(null);
  }, []);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
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
  }, [selectionMode]);

  const duplicateSelected = useCallback(() => {
    const selected = rf?.getNodes().filter((n) => n.selected);
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
      };
    });
    const dupEdges: GraphEdge[] = graphStore.getActive().edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({
        ...e,
        id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
        selected: false,
      }));
    graphStore.snapshot();
    const cur = graphStore.getActive();
    graphStore.setActiveGraph({
      nodes: [...cur.nodes, ...dupNodes],
      edges: [...cur.edges, ...dupEdges],
    });
    setContextMenu(null);
  }, [rf]);

  const copySelected = useCallback(() => {
    const selected = rf?.getNodes().filter((n) => n.selected);
    if (!selected || selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    const copiedEdges = graphStore.getActive().edges.filter(
      (ed) => ids.has(ed.source) && ids.has(ed.target),
    );
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
    const selected = rf?.getNodes().filter((n) => n.selected);
    if (!selected || selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    graphStore.snapshot();
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
    graphStore.setEdgeSelected(null);
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: RFNode) => {
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
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: GraphEdge) => {
    event.stopPropagation();
    graphStore.setSelected(null);
    graphStore.setEdgeSelected(edge.id);
  }, []);

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: GraphEdge) => {
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
  }, []);

  const onMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    graphStore.setViewport(viewport);
  }, []);

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
    if (!kind || !rf) return;
    const position = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const n = makeNode(kind, position);
    graphStore.snapshot();
    graphStore.setNodes([...graphStore.getActive().nodes, n]);
    graphStore.setSelected(n.id);
  };

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

  // Keyboard shortcuts (undo/redo, copy/paste)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        graphStore.undo();
      } else if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        graphStore.redo();
      } else if (e.key === "c" && !isInput) {
        if ((window.getSelection()?.toString().length ?? 0) > 0) return;
        if (rf?.getNodes().some((n) => n.selected)) {
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
  }, [copySelected, pasteClipboard]);

  // Execution
  const execute = useCallback(async () => {
    setExecRunning(true);
    setExecLogs([]);
    const wf = graphStore.getActive();

    try {
      const result = await executeGraph(wf.nodes, wf.edges);

      setExecLogs(result.logs);
      const errors = Array.from(result.errors.values());
      setErrorCount(errors.length);

      const cur = graphStore.getActive().nodes;
      const next: GraphNode[] = cur.map((n) => {
        const error = result.errors.get(n.id);
        const outputs = result.outputs.get(n.id);
        const fmt = n.data.outputFormat ?? "utf8";

        let output = "";
        let outputBytesLen = 0;

        if (outputs) {
          const entries = Object.entries(outputs);
          const getLabel = (key: string) => {
            if (key === "publicKey") return "PUBLIC KEY";
            if (key === "privateKey") return "PRIVATE KEY";
            return key.replace(/([A-Z])/g, " $1").toUpperCase().trim();
          };

          if (entries.length === 1 && (entries[0][0] === "default" || entries[0][0] === "data")) {
            output = formatBytes(entries[0][1], fmt, getLabel(entries[0][0]));
            outputBytesLen = entries[0][1].byteLength;
          } else if (entries.length > 0) {
            output = entries
              .map(([k, b]) => `${k.toUpperCase()}:\n${formatBytes(b, fmt, getLabel(k))}`)
              .join("\n\n");
            outputBytesLen = entries.reduce((acc, [_, b]) => acc + b.byteLength, 0);
          }
        }

        const prev = n.data;
        if (
          prev.output === output &&
          prev.error === error &&
          prev.outputBytesLen === outputBytesLen
        )
          return n;
        return { ...n, data: { ...prev, output, error, outputBytesLen } };
      });
      if (next.some((n, i) => n !== cur[i])) graphStore.setNodes(next);
    } catch (error) {
      console.error(error);
      toast.error("Graph execution failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setExecRunning(false);
    }
  }, []);

  const execKey = useMemo(
    () =>
      JSON.stringify({
        wf: activeId,
        e: edges.map((e) => [e.source, e.target]),
        n: nodes.map((n) => {
          const meta = NODE_KIND_META[n.data.kind];
          const fieldVals: Record<string, unknown> = { kind: n.data.kind };
          for (const f of meta?.fields ?? []) {
            fieldVals[f.id] = n.data[f.id];
          }
          return [n.id, fieldVals, n.data.outputFormat];
        }),
      }),
    [nodes, edges, activeId],
  );

  useEffect(() => {
    const t = setTimeout(execute, 80);
    return () => clearTimeout(t);
  }, [execKey, execute]);

  const openExportDialog = useCallback(() => {
    setExportSelectedIds(new Set(workflows.map((w) => w.id)));
    setExportDialogOpen(true);
  }, [workflows]);

  const handleExportConfirm = useCallback(() => {
    const ids = Array.from(exportSelectedIds);
    if (ids.length === 0) {
      toast.error("No workflows selected");
      return;
    }
    graphStore.exportWorkflows(ids);
    setExportDialogOpen(false);
  }, [exportSelectedIds]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const workflows = await graphStore.parseImportFile(file);
      setImportCandidates(workflows);
      setImportSelectedIds(new Set(workflows.map((w) => w.id)));
      setImportDialogOpen(true);
    } catch (err) {
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleImportConfirm = useCallback(() => {
    const ids = Array.from(importSelectedIds);
    if (ids.length === 0) {
      toast.error("No workflows selected");
      return;
    }
    const toImport = importCandidates.filter((w) => ids.includes(w.id));
    const count = graphStore.addWorkflows(toImport);
    toast.success(`Imported ${count} workflow${count > 1 ? "s" : ""}`);
    setImportDialogOpen(false);
    setImportCandidates([]);
  }, [importSelectedIds, importCandidates]);

  // Share
  const openShareDialog = useCallback(() => {
    setShareSelectedIds(new Set(workflows.map((w) => w.id)));
    setShareDialogOpen(true);
  }, [workflows]);

  const handleShareConfirm = useCallback(() => {
    const ids = Array.from(shareSelectedIds);
    if (ids.length === 0) {
      toast.error("No workflows selected");
      return;
    }
    const targets = workflows.filter((w) => ids.includes(w.id));
    const encoded = encodeWorkflows(targets);
    const url = generateShareUrl(encoded);
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Share link copied to clipboard!", {
        description: `Includes ${targets.length} workflow${targets.length > 1 ? "s" : ""}. Anyone with this link can import ${targets.length > 1 ? "them" : "it"}.`,
      });
    }).catch(() => {
      toast.error("Failed to copy link");
    });
    setShareDialogOpen(false);
  }, [shareSelectedIds, workflows]);

  const handleShareImportConfirm = useCallback(() => {
    if (sharedWorkflows.length === 0) return;
    const toImport = sharedWorkflows.map((sw) => ({
      id: `wf_shared_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: sw.name,
      nodes: sw.nodes,
      edges: sw.edges,
      selectedNodeId: null,
      selectedEdgeId: null,
    }));
    const count = graphStore.addWorkflows(toImport);
    toast.success(`Imported ${count} shared workflow${count > 1 ? "s" : ""}`);
    setShareImportDialogOpen(false);
    setSharedWorkflows([]);
    window.location.hash = "";
  }, [sharedWorkflows]);

  // Check URL hash for shared workflow on mount
  useEffect(() => {
    const encoded = parseShareHash();
    if (!encoded) return;
    const decoded = decodeWorkflows(encoded);
    if (decoded.length === 0) {
      toast.error("Invalid shared workflow link");
      window.location.hash = "";
      return;
    }
    setSharedWorkflows(decoded);
    setShareImportDialogOpen(true);
  }, []);

  // Context menu actions
  const ctxNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null;

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
    if (!ctxNode?.data.output) return;
    try {
      await navigator.clipboard.writeText(ctxNode.data.output);
      toast.success("Output copied to clipboard");
    } catch {
      toast.error("Failed to copy output");
    }
    setContextMenu(null);
  }, [ctxNode]);

  const deleteEdge = useCallback(() => {
    if (!contextMenu) return;
    graphStore.setEdges(graphStore.getActive().edges.filter((e) => e.id !== contextMenu.edgeId));
    setContextMenu(null);
  }, [contextMenu]);

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex">
      {/* Left Sidebar */}
      <aside
        className={`bg-card border-r border-border flex flex-col overflow-hidden transition-all duration-200 shrink-0 ${leftPanelOpen ? "w-60" : "w-8"}`}
      >
        {/* Header — always visible */}
        <div className={`flex items-center h-8 shrink-0 border-b border-border ${leftPanelOpen ? "gap-2 px-3 min-w-60" : "px-1 justify-center"}`}>
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${leftPanelOpen ? "" : "-rotate-90"}`} />
          </button>
          {leftPanelOpen && (
            <>
              <h1 className="text-xs font-semibold text-foreground">CryptoFlow</h1>
              <div className="ml-auto flex items-center gap-1">
                <a
                  href="https://github.com/marlkiller/flowforge-crypto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="View on GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <ThemeToggle />
              </div>
            </>
          )}
        </div>

        {/* Body — collapsible */}
        {leftPanelOpen && (
          <>
            <p className="px-3 pt-2 text-[10px] text-muted-foreground shrink-0">Crypto pipeline editor</p>
            <div className="px-3 pt-1 shrink-0">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-3 pt-2 space-y-1 pb-2 custom-scrollbar">
              {getActiveCategories().map((cat) => {
                const allKinds = Object.values(NODE_KIND_META).filter((m) => m.category === cat);
                const kinds = allKinds.filter((k) =>
                  k.label.toLowerCase().includes(searchQuery.toLowerCase()),
                );
                if (kinds.length === 0 && searchQuery) return null;

                const catMeta = CATEGORY_META[cat] ?? {
                  label: cat.charAt(0).toUpperCase() + cat.slice(1),
                  accent: "text-blue-300",
                  chip: "bg-blue-500/15 text-blue-300 border-blue-500/40",
                  dot: "bg-blue-400",
                };
                const isCatCollapsed = collapsedCats.has(cat);

                return (
                  <div key={cat} className="group">
                    <button
                      onClick={() => toggleCat(cat)}
                      className="w-full flex items-center gap-2 text-[10px] font-bold text-foreground/80 hover:text-foreground transition-colors py-1"
                    >
                      {isCatCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <Hash className={`w-4 h-4 ${catMeta.accent}`} />
                      <span>{catMeta.label}</span>
                    </button>
                    {!isCatCollapsed && (
                      <div className="flex flex-col gap-0.5 ml-3.5 border-l border-border/50 pl-3 my-1">
                        {kinds.map((k) => (
                          <div
                            key={k.kind}
                            draggable
                            onDragStart={(e) => onDragStart(e, k.kind)}
                            title={k.description}
                            className="group/item flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-accent/80 cursor-grab active:cursor-grabbing text-[11px] transition-all"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/item:text-muted-foreground/80 transition-colors" />
                            <span className="font-medium text-muted-foreground group-hover/item:text-foreground transition-colors">
                              {k.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-border shrink-0 space-y-1">
              <div className="flex gap-1 justify-center">
                <button
                  onClick={openExportDialog}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  <Upload className="w-3 h-3" /> Import
                </button>
                <button
                  onClick={openShareDialog}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all"
                  title="Share workflows via link"
                >
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>
              <div className="flex gap-1 justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all">
                      <Copy className="w-3 h-3" /> DEMO
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-40">
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider opacity-50">Demo Workflows</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getAESStandardSeed())} className="text-[11px] cursor-pointer">
                      AES (Standard)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getRSAFullSuiteSeed())} className="text-[11px] cursor-pointer">
                      RSA (Full Suite)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getHMACSeed())} className="text-[11px] cursor-pointer">
                      HMAC (SHA-256)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getKDFSeed())} className="text-[11px] cursor-pointer">
                      KDF (PBKDF2 + AES)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getECCSuiteSeed())} className="text-[11px] cursor-pointer">
                      ECC (ECDSA Suite)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getJWTSeed())} className="text-[11px] cursor-pointer">
                      JWT (Sign & Verify)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getOTPSeed())} className="text-[11px] cursor-pointer">
                      TOTP (Authenticator)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getArgon2Seed())} className="text-[11px] cursor-pointer">
                      Argon2 (Password Hash)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => graphStore.setActiveGraph(getRNCryptorV3Seed())} className="text-[11px] cursor-pointer">
                      RNCryptor v3 (Standard)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  onClick={() => graphStore.setActiveGraph({ nodes: [], edges: [] })}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-destructive/5 hover:border-destructive/30 text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </aside>

      {/* Center: Canvas + Console */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={wrapperRef}
            className="absolute inset-0 z-0"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <ReactFlow
              key={activeId}
              nodes={nodes}
              edges={edgesWithState}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onPaneClick={onPaneClick}
              onContextMenu={onPaneContextMenu}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              onMoveEnd={onMoveEnd}
              onInit={setRf}
              defaultViewport={active.viewport}
              fitView={!active.viewport}
              minZoom={0.1}
              maxZoom={2}
              elementsSelectable={true}
              selectionOnDrag={selectionMode}
              panOnDrag={!selectionMode}
              defaultEdgeOptions={{
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
                onClick={() => setSelectionMode((v) => !v)}
                title={selectionMode ? "Switch to pan mode" : "Switch to selection mode"}
                className={`absolute z-10 flex items-center justify-center w-7 h-7 rounded-md border shadow-md transition-all cursor-pointer ${
                  selectionMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                }`}
                style={{ top: 12, right: 12 }}
              >
                <MousePointer2 className="w-4 h-4" />
              </button>
              <MiniMap
                pannable
                zoomable
                className="!bg-card !border !border-border shadow-md rounded-lg overflow-hidden !transition-all !duration-300"
                nodeColor={(_node) => (theme === "dark" ? "#52525b" : "#d4d4d8")}
                maskColor={theme === "dark" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.12)"}
                maskStrokeColor={theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.2)"}
                style={{ right: 12, bottom: 12 }}
              />
            </ReactFlow>

            {/* Execution Status Bar */}
            <ExecutionStatus errorCount={errorCount} nodeCount={nodes.length} />

            {/* Execution Loading Overlay */}
            {execRunning && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background/20 backdrop-blur-[1px] pointer-events-none">
                <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-background/80 border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">Executing pipeline...</span>
                </div>
              </div>
            )}

            {/* Node context menu */}
            {contextMenu && ctxNode && (
              <div
                className="absolute z-50 w-40 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider truncate font-semibold">
                  {ctxNode.data.label}
                </div>
                <button
                  onClick={() => {
                    clipboardRef.current = {
                      nodes: JSON.parse(JSON.stringify([ctxNode])) as GraphNode[],
                      edges: [],
                    };
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={copyOutput}
                  disabled={!ctxNode.data.output}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy output
                </button>
                <button
                  onClick={duplicateNode}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                <div className="my-0.5 border-t border-border/50" />
                <button
                  onClick={deleteNode}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}

            {/* Edge context menu */}
            {contextMenu && contextMenu.edgeId && (
              <div
                className="absolute z-50 w-28 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={deleteEdge}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Disconnect
                </button>
              </div>
            )}

            {/* Multi-select context menu */}
            {contextMenu && contextMenu.multi && (
              <div
                className="absolute z-50 w-40 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-0.5 backdrop-blur-xl"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {rf?.getNodes().some((n) => n.selected)
                    ? `${rf.getNodes().filter((n) => n.selected).length} selected`
                    : "Selection"}
                </div>
                <button
                  onClick={copySelected}
                  disabled={!rf?.getNodes().some((n) => n.selected)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={pasteClipboard}
                  disabled={!clipboardRef.current}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Paste
                </button>
                <button
                  onClick={duplicateSelected}
                  disabled={!rf?.getNodes().some((n) => n.selected)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                <div className="my-0.5 border-t border-border/50" />
                <button
                  onClick={deleteSelected}
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

      {/* Right Inspector */}
      <aside
        className={`bg-card border-l border-border flex flex-col overflow-hidden transition-all duration-200 shrink-0 ${rightPanelOpen ? "w-80" : "w-8"}`}
      >
        {/* Header — always visible */}
        <div className={`flex items-center h-8 shrink-0 border-b border-border ${rightPanelOpen ? "gap-2 px-3 min-w-80" : "px-1 justify-center"}`}>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rightPanelOpen ? "" : "-rotate-90"}`} />
          </button>
          {rightPanelOpen && (
            <span className="text-xs font-semibold text-foreground">Inspector</span>
          )}
        </div>

        {/* Body — collapsible */}
        {rightPanelOpen && (
          <NodeInspector key={selectedNode?.id} node={selectedNode} />
        )}
      </aside>

      {/* Export selection dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Workflows</DialogTitle>
            <DialogDescription>
              Select workflows to export
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {workflows.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm transition-colors"
              >
                <Checkbox
                  checked={exportSelectedIds.has(w.id)}
                  onCheckedChange={(checked) => {
                    setExportSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(w.id);
                      else next.delete(w.id);
                      return next;
                    });
                  }}
                />
                <span className="font-medium">{w.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {w.nodes.length} nodes
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleExportConfirm}
              disabled={exportSelectedIds.size === 0}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              Export ({exportSelectedIds.size})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import selection dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Import Workflows</DialogTitle>
            <DialogDescription>
              Select workflows to import
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {importCandidates.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm transition-colors"
              >
                <Checkbox
                  checked={importSelectedIds.has(w.id)}
                  onCheckedChange={(checked) => {
                    setImportSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(w.id);
                      else next.delete(w.id);
                      return next;
                    });
                  }}
                />
                <span className="font-medium">{w.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {w.nodes.length} nodes
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleImportConfirm}
              disabled={importSelectedIds.size === 0}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              Import ({importSelectedIds.size})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share selection dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Workflows</DialogTitle>
            <DialogDescription>
              Select workflows to include in the share link
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {workflows.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm transition-colors"
              >
                <Checkbox
                  checked={shareSelectedIds.has(w.id)}
                  onCheckedChange={(checked) => {
                    setShareSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(w.id);
                      else next.delete(w.id);
                      return next;
                    });
                  }}
                />
                <span className="font-medium">{w.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {w.nodes.length} nodes
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleShareConfirm}
              disabled={shareSelectedIds.size === 0}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              Copy Link ({shareSelectedIds.size})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share import dialog */}
      <Dialog open={shareImportDialogOpen} onOpenChange={setShareImportDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Import Shared Workflow{sharedWorkflows.length > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Someone shared {sharedWorkflows.length > 1 ? `${sharedWorkflows.length} workflows` : "a workflow"} with you. Import {sharedWorkflows.length > 1 ? "them" : "it"} into your workspace?
            </DialogDescription>
          </DialogHeader>
          {sharedWorkflows.length > 0 && (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {sharedWorkflows.map((sw, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 text-sm"
                >
                  <span className="font-medium">{sw.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {sw.nodes.length} nodes
                  </span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => {
                setShareImportDialogOpen(false);
                setSharedWorkflows([]);
                window.location.hash = "";
              }}
              className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShareImportConfirm}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors"
            >
              Import{sharedWorkflows.length > 1 ? ` All (${sharedWorkflows.length})` : " Workflow"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowTab({
  id,
  name,
  active,
  canClose,
}: {
  id: string;
  name: string;
  active: boolean;
  canClose: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) graphStore.renameWorkflow(id, trimmed);
    else setDraft(name);
  };

  return (
    <div
      onClick={() => graphStore.setActive(id)}
      onDoubleClick={() => setEditing(true)}
      className={`group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all shrink-0 ${
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {editing ? (
        <input
          autoFocus
          className="bg-transparent outline-none border-b border-primary w-20 text-foreground"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span>{name}</span>
      )}
      {canClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            graphStore.removeWorkflow(id);
          }}
          className={`p-0.5 rounded-md transition-colors ${
            active
              ? "hover:bg-accent text-muted-foreground hover:text-foreground"
              : "opacity-0 group-hover:opacity-100 hover:bg-background"
          }`}
          title="Close tab"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
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
