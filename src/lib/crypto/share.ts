import type { Workflow } from "@/components/graph/store";
import type { GraphNode, GraphEdge } from "@/lib/crypto/types";
import { NODE_KIND_META } from "@/lib/crypto/registry";
import { logger } from "@/lib/logger";
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
  parentId: "pi",
  extent: "e",
  width: "w",
  height: "h",
  measured: "m",
  style: "s",
  allowInbound: "ai",
  allowOutbound: "ao",
};

const REV_MAP = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [v, k]));

function minifyNode(n: GraphNode) {
  const result: any = {
    i: n.id,
    p: [Math.round(n.position.x), Math.round(n.position.y)],
    d: Object.entries(n.data).reduce((acc, [k, v]) => {
      if (
        [
          "fileBytes",
          "fileRefId",
          "output",
          "error",
          "outputBytesLen",
          "outputTruncated",
          "measured",
          "selected",
        ].includes(k)
      )
        return acc;
      if (k === "outputFormat" && v === "hex") return acc;
      if ((k === "type" || k === "t") && v === "crypto") return acc;
      const key = MAP[k] || k;
      acc[key] = v;
      return acc;
    }, {} as any),
  };
  if (n.parentId) result.pi = n.parentId;
  if (n.extent) result.e = n.extent;
  if (n.type && n.type !== "crypto") result.t = n.type;
  if (n.data.kind === "group" || n.data.kind === "note") {
    if (n.width) result.w = n.width;
    if (n.height) result.h = n.height;
    if (n.style) result.s = n.style;
  }
  return result;
}

function expandNode(m: any): GraphNode {
  const data: any = {};
  Object.entries(m.d).forEach(([k, v]) => {
    const key = REV_MAP[k] || k;
    data[key] = v;
  });
  if (!data.outputFormat && data.kind !== "note") data.outputFormat = "hex";

  const node: any = {
    id: m.i,
    type: m.t || "crypto",
    position: { x: m.p[0], y: m.p[1] },
    data,
  };
  if (m.pi) node.parentId = m.pi;
  if (m.e) node.extent = m.e;
  if (m.w) node.width = m.w;
  if (m.h) node.height = m.h;
  if (m.s) node.style = m.s;
  return node as GraphNode;
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
    ns: w.nodes
      .filter((n) => n.data && (NODE_KIND_META[n.data.kind] || n.type === "note"))
      .map(minifyNode),
    es: w.edges.map(minifyEdge),
  }));

  const json = JSON.stringify({ v: 2, w: minified });
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeWorkflows(encoded: string): SharedWorkflow[] {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) {
      return [];
    }
    const parsed = JSON.parse(decompressed);

    if (parsed.v === 2) {
      return parsed.w.map((w: any) => ({
        name: w.n,
        nodes: w.ns.map(expandNode),
        edges: w.es.map(expandEdge),
      }));
    }

    return [];
  } catch (e) {
    logger.error("Failed to decode shared workflows", { error: e });
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
