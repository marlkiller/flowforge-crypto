import type { DataValue, GraphEdge, GraphNode } from "./types";
import "./setup";
import { executeGraph } from "./executor";
import { loadExternalNode } from "./registry";
import { logger } from "../logger";

const workerPostMessage = globalThis.postMessage.bind(globalThis) as (
  message: unknown,
  transfer?: Transferable[],
) => void;

function pickOutput(outputs: Record<string, DataValue>, outputKey?: string): DataValue | undefined {
  if (outputKey && outputs[outputKey]) return outputs[outputKey];
  const entries = Object.entries(outputs);
  if (entries.length === 1) return entries[0][1];
  return outputs.default ?? outputs.data ?? entries[0]?.[1];
}

onmessage = async (
  e: MessageEvent<{
    id: number;
    nodes: GraphNode[];
    edges: GraphEdge[];
    targetNodeId: string;
    outputKey?: string;
    pluginUrls?: string[];
    fileTransfers?: [string, File][];
  }>,
) => {
  const { id, nodes, edges, targetNodeId, outputKey, pluginUrls, fileTransfers } = e.data;

  try {
    if (fileTransfers) {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const [nodeId, file] of fileTransfers) {
        const node = nodeMap.get(nodeId);
        if (node) {
          node.data = { ...node.data, fileBytes: new Uint8Array(await file.arrayBuffer()) };
        }
      }
    }

    if (pluginUrls && pluginUrls.length > 0) {
      await Promise.all(
        pluginUrls.map((url) =>
          loadExternalNode(url).catch((error) => {
            logger.warn("Failed to preload plugin in export output worker", { url, error });
          }),
        ),
      );
    }

    const result = await executeGraph(nodes, edges);
    const error = result.errors.get(targetNodeId);
    if (error) {
      postMessage({ id, error });
      return;
    }

    const outputs = result.outputs.get(targetNodeId);
    if (!outputs) {
      postMessage({ id, error: "No output data available for this node" });
      return;
    }

    const output = pickOutput(outputs, outputKey);
    if (!output) {
      postMessage({ id, error: `Output "${outputKey ?? "default"}" is not available` });
      return;
    }

    if (output.value instanceof Uint8Array) {
      const bytes = output.value;
      const transfer = bytes.buffer as ArrayBuffer;
      workerPostMessage({ id, value: bytes }, [transfer]);
      return;
    }

    if (typeof output.value === "boolean") {
      const bytes = new Uint8Array([output.value ? 1 : 0]);
      workerPostMessage({ id, value: bytes }, [bytes.buffer]);
      return;
    }

    if (typeof output.value === "string") {
      const bytes = new TextEncoder().encode(output.value);
      workerPostMessage({ id, value: bytes }, [bytes.buffer]);
      return;
    }

    postMessage({ id, error: "This output type cannot be saved as bytes" });
  } catch (error) {
    postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
