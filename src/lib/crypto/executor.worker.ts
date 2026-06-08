import type { DataValue, GraphNode, GraphEdge, NodeExecutionLog } from "./types";
import "./setup";
import { executeGraph } from "./executor";
import { loadExternalNode } from "./registry";
import { OUTPUT_PREVIEW_BYTES } from "./preview";

function sanitizeDataValue(value: DataValue): DataValue {
  if (!(value.value instanceof Uint8Array) || value.value.byteLength <= OUTPUT_PREVIEW_BYTES) {
    return value;
  }

  return {
    ...value,
    value: value.value.slice(0, OUTPUT_PREVIEW_BYTES),
    byteLength: value.value.byteLength,
    truncated: true,
  };
}

function sanitizeOutputs(outputs: Record<string, DataValue>): Record<string, DataValue> {
  return Object.fromEntries(
    Object.entries(outputs).map(([key, value]) => [key, sanitizeDataValue(value)]),
  );
}

function sanitizeLog(log: NodeExecutionLog): NodeExecutionLog {
  const outputBytes =
    log.outputBytes && log.outputBytes.byteLength > OUTPUT_PREVIEW_BYTES
      ? log.outputBytes.slice(0, OUTPUT_PREVIEW_BYTES)
      : log.outputBytes;

  return {
    ...log,
    outputBytes,
    outputBytesLen: log.outputBytes?.byteLength,
    outputs: log.outputs ? sanitizeOutputs(log.outputs) : undefined,
  };
}

onmessage = async (
  e: MessageEvent<{
    id: number;
    nodes: GraphNode[];
    edges: GraphEdge[];
    pluginUrls?: string[];
    fileTransfers?: [string, File][];
  }>,
) => {
  const { id, nodes, edges, pluginUrls, fileTransfers } = e.data;
  try {
    // Restore transferred file bytes into nodes (zero-copy transfer)
    if (fileTransfers) {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const [nodeId, file] of fileTransfers) {
        const node = nodeMap.get(nodeId);
        if (node) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          node.data = { ...node.data, fileBytes: bytes };
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
      outputs: Array.from(result.outputs.entries()).map(([nodeId, outputs]) => [
        nodeId,
        sanitizeOutputs(outputs),
      ]),
      errors: Array.from(result.errors.entries()),
      order: result.order,
      logs: result.logs.map(sanitizeLog),
    });
  } catch (error) {
    postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
