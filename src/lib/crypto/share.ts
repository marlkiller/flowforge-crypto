import type { Workflow } from "@/components/graph/store";
import type { GraphNode, GraphEdge } from "@/lib/crypto/types";
import { NODE_REGISTRY } from "@/lib/crypto/registry";

const PREFIX = "share=";

export interface SharedWorkflow {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function stripRuntime(nodes: GraphNode[]): GraphNode[] {
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, fileBytes: undefined, output: undefined, error: undefined, outputBytesLen: undefined },
  }));
}

function filterValid(nodes: GraphNode[]): GraphNode[] {
  const valid = nodes.filter((n) => n.data && NODE_REGISTRY[n.data.kind]);
  valid.forEach((n) => {
    if (n.data) {
      n.data.fileBytes = undefined;
      n.data.output = undefined;
      n.data.error = undefined;
      n.data.outputBytesLen = undefined;
    }
  });
  return valid;
}

export function encodeWorkflows(workflows: Workflow[]): string {
  const serializable = workflows.map((w) => ({
    name: w.name,
    nodes: stripRuntime(w.nodes),
    edges: w.edges,
  }));
  const json = JSON.stringify({ version: 1, workflows: serializable });
  return btoa(encodeURIComponent(json));
}

export function decodeWorkflows(encoded: string): SharedWorkflow[] {
  const json = decodeURIComponent(atob(encoded));
  const parsed = JSON.parse(json);
  const list = parsed.workflows ?? [parsed];
  const results: SharedWorkflow[] = [];
  for (const item of list) {
    if (!item.nodes || !item.edges) continue;
    const nodes = filterValid(item.nodes);
    if (nodes.length > 0) {
      results.push({ name: item.name || "Shared Workflow", nodes, edges: item.edges || [] });
    }
  }
  return results;
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
