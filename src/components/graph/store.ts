// Multi-workflow (tabbed) graph store.
import { useSyncExternalStore } from "react";
import type { GraphNode, GraphEdge } from "@/lib/crypto/types";
import "@/lib/crypto/setup";
import { NODE_KIND_META } from "@/lib/crypto/registry";
import { getLayoutedNodes } from "@/lib/crypto/layout";

export interface Workflow {
  id: string;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewport?: { x: number; y: number; zoom: number };
}

interface State {
  workflows: Workflow[];
  activeId: string;
  pluginUrls: string[];
  sessionPluginUrls: string[];
  graphKey: number;
}

const STORAGE_KEY = "flowforge-crypto-workflows";

function persistState(s: State) {
  try {
    const serializable = {
      ...s,
      workflows: s.workflows.map((w) => ({
        ...w,
        nodes: w.nodes.map((n) => ({
          ...n,
          data: { ...n.data, fileBytes: undefined },
        })),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // storage full or unavailable
  }
}

function loadPersistedState(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.workflows) || parsed.workflows.length === 0) return null;

    parsed.workflows.forEach((w: Workflow) => {
      // Filter out nodes whose kind is no longer registered
      w.nodes = w.nodes.filter((n) => n.data && NODE_KIND_META[n.data.kind]);
      w.nodes.forEach((n) => {
        if (n.data) {
          n.data.fileBytes = undefined;
          n.data.output = undefined;
          n.data.error = undefined;
          n.data.outputBytesLen = undefined;
        }
      });
    });

    parsed.workflows = parsed.workflows.filter((w: Workflow) => w.nodes.length > 0);
    if (parsed.workflows.length === 0) return null;

    return {
      workflows: parsed.workflows,
      activeId: parsed.activeId || parsed.workflows[0].id,
      pluginUrls: parsed.pluginUrls || [],
      sessionPluginUrls: [],
      graphKey: 0,
    };
  } catch {
    return null;
  }
}

let wfIdCounter: number;

function nextWfId(): string {
  return `wf_${wfIdCounter++}`;
}

function emptyWorkflow(name: string): Workflow {
  return { id: nextWfId(), name, nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null };
}

let state: State = (() => {
  const restored = loadPersistedState();
  if (restored) {
    wfIdCounter = restored.workflows.reduce((max, w) => {
      const num = parseInt(w.id.replace("wf_", ""), 10);
      return isNaN(num) ? max : Math.max(max, num + 1);
    }, 1);
    return { ...restored, graphKey: restored.graphKey ?? 0 };
  }
  wfIdCounter = 1;
  const w = emptyWorkflow("Workflow 1");
  return { workflows: [w], activeId: w.id, pluginUrls: [], sessionPluginUrls: [], graphKey: 0 };
})();

const listeners = new Set<() => void>();
const emit = () => {
  listeners.forEach((l) => l());
  persistState(state);
};

function active(): Workflow {
  return state.workflows.find((w) => w.id === state.activeId) ?? state.workflows[0];
}

function cloneWorkflow(w: Workflow): Workflow {
  return JSON.parse(JSON.stringify(w));
}

function patchActive(patch: Partial<Workflow>) {
  state = {
    ...state,
    workflows: state.workflows.map((w) => (w.id === state.activeId ? { ...w, ...patch } : w)),
  };
  emit();
}

// Undo/redo stacks (not persisted)
const MAX_UNDO = 50;
const undoStack: Workflow[] = [];
const redoStack: Workflow[] = [];

function snapshot() {
  undoStack.push(cloneWorkflow(active()));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
}

export const graphStore = {
  get: () => state,
  getActive: active,
  snapshot,
  canUndo: () => undoStack.length > 0,
  canRedo: () => redoStack.length > 0,
  undo: () => {
    const prev = undoStack.pop();
    if (!prev) return;
    redoStack.push(cloneWorkflow(active()));
    const wf = state.workflows.map((w) => (w.id === state.activeId ? prev : w));
    state = { ...state, workflows: wf };
    emit();
  },
  redo: () => {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(cloneWorkflow(active()));
    const wf = state.workflows.map((w) => (w.id === state.activeId ? next : w));
    state = { ...state, workflows: wf };
    emit();
  },

  // workflow ops
  addWorkflow: () => {
    snapshot();
    const w = emptyWorkflow(`Workflow ${state.workflows.length + 1}`);
    state = { ...state, workflows: [...state.workflows, w], activeId: w.id };
    emit();
    return w.id;
  },
  removeWorkflow: (id: string) => {
    if (state.workflows.length <= 1) return;
    snapshot();
    const idx = state.workflows.findIndex((w) => w.id === id);
    const next = state.workflows.filter((w) => w.id !== id);
    const activeId = state.activeId === id ? next[Math.max(0, idx - 1)].id : state.activeId;
    state = { ...state, workflows: next, activeId };
    emit();
  },
  setActive: (id: string) => {
    if (!state.workflows.some((w) => w.id === id)) return;
    state = { ...state, activeId: id };
    emit();
  },
  renameWorkflow: (id: string, name: string) => {
    snapshot();
    state = {
      ...state,
      workflows: state.workflows.map((w) => (w.id === id ? { ...w, name } : w)),
    };
    emit();
  },

  // node ops (operate on active)
  setViewport: (viewport: { x: number; y: number; zoom: number }) => patchActive({ viewport }),
  setNodes: (nodes: GraphNode[]) => patchActive({ nodes }),
  setEdges: (edges: GraphEdge[]) => patchActive({ edges }),
  setSelected: (selectedNodeId: string | null) => patchActive({ selectedNodeId }),
  setEdgeSelected: (selectedEdgeId: string | null) => patchActive({ selectedEdgeId }),
  setActiveGraph: (g: { nodes: GraphNode[]; edges: GraphEdge[]; name?: string }) => {
    snapshot();
    state = { ...state, graphKey: state.graphKey + 1 };
    patchActive({ ...g, selectedNodeId: null, selectedEdgeId: null, viewport: undefined });
  },
  updateNodeData: (id: string, patch: Record<string, unknown>) => {
    snapshot();
    const w = active();
    patchActive({
      nodes: w.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    });
  },
  removeNode: (id: string) => {
    snapshot();
    const w = active();
    patchActive({
      nodes: w.nodes.filter((n) => n.id !== id),
      edges: w.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: w.selectedNodeId === id ? null : w.selectedNodeId,
      selectedEdgeId: null,
    });
  },
  duplicateNode: (id: string, newId: string) => {
    snapshot();
    const w = active();
    const n = w.nodes.find((node) => node.id === id);
    if (!n) return;
    const dup: GraphNode = {
      ...n,
      id: newId,
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      data: { ...n.data },
    };
    patchActive({
      nodes: [...w.nodes, dup],
      selectedNodeId: newId,
    });
  },

  reflowLayout: () => {
    snapshot();
    const w = active();
    if (w.nodes.length === 0) return;
    try {
      const layouted = getLayoutedNodes(w.nodes, w.edges);
      patchActive({ nodes: layouted.nodes, edges: layouted.edges });
    } catch (e) {
      console.warn("[layout] dagre layout failed (possibly cyclic graph):", e);
    }
  },

  // Export/Import
  exportWorkflows: (workflowIds?: string[]) => {
    const targets = workflowIds
      ? state.workflows.filter((w) => workflowIds.includes(w.id))
      : state.workflows;
    if (targets.length === 0) return;
    const serializable = targets.map((w) => ({
      ...w,
      nodes: w.nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          fileBytes: undefined,
          output: undefined,
          error: undefined,
          outputBytesLen: undefined,
        },
      })),
    }));
    const blob = new Blob([JSON.stringify({ version: 1, workflows: serializable }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowforge-crypto-workflows.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  parseImportFile: (file: File): Promise<Workflow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          const imported = parsed.workflows ?? (Array.isArray(parsed) ? parsed : [parsed]);
          if (!Array.isArray(imported) || imported.length === 0) {
            reject(new Error("Invalid workflow file"));
            return;
          }
          const cleaned: Workflow[] = [];
          for (const w of imported) {
            if (!w.nodes || !w.edges) continue;
            const nodes = w.nodes.filter((n: GraphNode) => n.data && NODE_KIND_META[n.data.kind]);
            if (nodes.length === 0) continue;
            nodes.forEach((n: GraphNode) => {
              if (n.data) {
                n.data.fileBytes = undefined;
                n.data.output = undefined;
                n.data.error = undefined;
                n.data.outputBytesLen = undefined;
              }
            });
            cleaned.push({
              id: nextWfId(),
              name: w.name || "Imported",
              nodes,
              edges: w.edges || [],
              selectedNodeId: null,
              selectedEdgeId: null,
            });
          }
          if (cleaned.length === 0) {
            reject(new Error("No valid workflows found in file"));
            return;
          }
          resolve(cleaned);
        } catch {
          reject(new Error("Invalid workflow file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  },
  addWorkflows: (workflows: Workflow[]) => {
    if (workflows.length === 0) return 0;
    snapshot();
    state = {
      ...state,
      workflows: [...state.workflows, ...workflows],
      activeId: workflows[workflows.length - 1].id,
    };
    emit();
    return workflows.length;
  },

  // plugin ops
  addPluginUrl: (url: string, persist = true) => {
    const pUrls = state.pluginUrls || [];
    const sUrls = state.sessionPluginUrls || [];

    if (persist) {
      if (pUrls.includes(url)) return;
      // If it was in session, move it to persisted
      state = {
        ...state,
        pluginUrls: [...pUrls, url],
        sessionPluginUrls: sUrls.filter((u) => u !== url),
      };
    } else {
      if (pUrls.includes(url) || sUrls.includes(url)) return;
      state = { ...state, sessionPluginUrls: [...sUrls, url] };
    }
    emit();
  },
  removePluginUrl: (url: string) => {
    state = {
      ...state,
      pluginUrls: (state.pluginUrls || []).filter((u) => u !== url),
      sessionPluginUrls: (state.sessionPluginUrls || []).filter((u) => u !== url),
    };
    emit();
  },
  getAllPluginUrls: () => {
    const all = [...(state.pluginUrls || []), ...(state.sessionPluginUrls || [])];
    return Array.from(new Set(all));
  },

  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useGraphStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    graphStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
