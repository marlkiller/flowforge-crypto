import type { GraphNode, GraphEdge } from "./types";

/**
 * Perform topological sort on the graph nodes.
 * Returns the execution order and detects cycles.
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Object containing execution order and cycle detection result
 */
export function topologicalOrder(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { order: string[]; cycle: boolean } {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();

  // Initialize in-degree and adjacency list
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    if (!indeg.has(e.source) || !indeg.has(e.target)) return;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  });

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  indeg.forEach((d, id) => {
    if (d === 0) queue.push(id);
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const nb of adj.get(id) ?? []) {
      indeg.set(nb, (indeg.get(nb) ?? 0) - 1);
      if (indeg.get(nb) === 0) queue.push(nb);
    }
  }

  return { order, cycle: order.length !== nodes.length };
}
