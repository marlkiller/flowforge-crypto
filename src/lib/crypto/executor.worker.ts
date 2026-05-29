import type { GraphNode, GraphEdge } from "./types";
import { executeGraph } from "./executor";

onmessage = async (e: MessageEvent<{ id: number; nodes: GraphNode[]; edges: GraphEdge[] }>) => {
  const { id, nodes, edges } = e.data;
  try {
    const result = await executeGraph(nodes, edges);
    postMessage({
      id,
      outputs: Array.from(result.outputs.entries()),
      errors: Array.from(result.errors.entries()),
      order: result.order,
      logs: result.logs,
    });
  } catch (error) {
    postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
