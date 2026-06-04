import type { GraphNode, GraphEdge } from "./types";
import "./setup";
import { executeGraph } from "./executor";
import { loadExternalNode } from "./registry";

onmessage = async (
  e: MessageEvent<{
    id: number;
    nodes: GraphNode[];
    edges: GraphEdge[];
    pluginUrls?: string[];
    fileTransfers?: [string, Uint8Array][];
  }>,
) => {
  const { id, nodes, edges, pluginUrls, fileTransfers } = e.data;
  try {
    // Restore transferred file bytes into nodes (zero-copy transfer)
    if (fileTransfers) {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const [nodeId, bytes] of fileTransfers) {
        const node = nodeMap.get(nodeId);
        if (node) {
          (node as any).data = { ...node.data, fileBytes: bytes };
        }
      }
    }

    // Pre-load all plugins in the worker
    if (pluginUrls && pluginUrls.length > 0) {
      await Promise.all(pluginUrls.map((url) => loadExternalNode(url).catch(() => {})));
    }

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
