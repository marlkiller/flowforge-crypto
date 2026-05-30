import type { Workflow } from "@/components/graph/store";
import type { GraphNode, GraphEdge } from "@/lib/crypto/types";
import { NODE_KIND_META } from "@/lib/crypto/registry";
import LZString from "lz-string";

const PREFIX = "share=";

export interface SharedWorkflow {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Minification mapping to reduce JSON size before compression
 */
const MAP: Record<string, string> = {
  // Common keys
  id: "i",
  data: "d",
  kind: "k",
  label: "l",
  type: "t",
  position: "p",
  source: "s",
  target: "t",
  sourceHandle: "sh",
  targetHandle: "th",
  outputFormat: "of",
  // Values
  crypto: "c",
  asymmetric: "a",
  cipher: "ci",
  hash: "h",
};

const REV_MAP = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [v, k]));

function minifyNode(n: GraphNode) {
  return {
    i: n.id,
    p: [Math.round(n.position.x), Math.round(n.position.y)],
    d: Object.entries(n.data).reduce((acc, [k, v]) => {
      // Skip runtime junk
      if (["fileBytes", "output", "error", "outputBytesLen"].includes(k)) return acc;
      // Skip defaults
      if (k === "outputFormat" && v === "hex") return acc;
      const key = MAP[k] || k;
      acc[key] = v;
      return acc;
    }, {} as any),
  };
}

function expandNode(m: any): GraphNode {
  const data: any = {};
  Object.entries(m.d).forEach(([k, v]) => {
    const key = REV_MAP[k] || k;
    data[key] = v;
  });
  if (!data.outputFormat) data.outputFormat = "hex";

  return {
    id: m.i,
    type: "crypto",
    position: { x: m.p[0], y: m.p[1] },
    data,
  } as GraphNode;
}

function minifyEdge(e: GraphEdge) {
  return {
    i: e.id,
    s: e.source,
    t: e.target,
    sh: e.sourceHandle || "default",
    th: e.targetHandle || "data",
  };
}

function expandEdge(m: any): GraphEdge {
  return {
    id: m.i,
    source: m.s,
    target: m.t,
    sourceHandle: m.sh === "default" ? null : m.sh,
    targetHandle: m.th === "data" ? null : m.th,
  } as GraphEdge;
}

export function encodeWorkflows(workflows: Workflow[]): string {
  const minified = workflows.map((w) => ({
    n: w.name,
    ns: w.nodes.filter((n) => n.data && NODE_KIND_META[n.data.kind]).map(minifyNode),
    es: w.edges.map(minifyEdge),
  }));

  const json = JSON.stringify({ v: 2, w: minified });
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeWorkflows(encoded: string): SharedWorkflow[] {
  try {
    let json = "";
    if (encoded.startsWith("%7B") || encoded.startsWith("{")) {
      // Legacy or uncompressed JSON
      json = decodeURIComponent(atob(encoded));
    } else {
      // LZ-String compressed
      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      if (!decompressed) {
        // Fallback for old Base64/URI encoded strings
        json = decodeURIComponent(atob(encoded));
      } else {
        json = decompressed;
      }
    }

    const parsed = JSON.parse(json);

    // Handle v2 (minified)
    if (parsed.v === 2) {
      return parsed.w.map((w: any) => ({
        name: w.n,
        nodes: w.ns.map(expandNode),
        edges: w.es.map(expandEdge),
      }));
    }

    // Handle v1 (legacy)
    const list = parsed.workflows ?? [parsed];
    const results: SharedWorkflow[] = [];
    for (const item of list) {
      if (!item.nodes || !item.edges) continue;
      const nodes = item.nodes.filter((n: any) => n.data && NODE_KIND_META[n.data.kind]);
      if (nodes.length > 0) {
        results.push({ name: item.name || "Shared Workflow", nodes, edges: item.edges || [] });
      }
    }
    return results;
  } catch (e) {
    console.error("Failed to decode workflows:", e);
    return [];
  }
}

export function generateShareUrl(encoded: string): string {
  const url = new URL(window.location.href);
  url.hash = `${PREFIX}${encoded}`;
  return url.toString();
}

export function parseShareHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(`#${PREFIX}`)) return null;
  return hash.slice(PREFIX.length + 1);
}
