import type { GraphNode, GraphEdge, ExecutionResult, NodeExecutionLog, NodeRunner } from "./types";
import { loadNodeDef } from "./registry";
import { topologicalOrder } from "./topoSort";

async function nodeParams(node: GraphNode): Promise<string | undefined> {
  const def = await loadNodeDef(node.data.kind);
  const meta = def.meta;
  const parts: string[] = [];
  for (const field of meta?.fields ?? []) {
    if (field.type === "select") {
      const val = node.data[field.id] as string | undefined;
      if (val) parts.push(`${field.id}:${val}`);
    }
  }
  if (node.data.kind === "output" && node.data.outputFormat) {
    parts.push(`outputFormat:${node.data.outputFormat}`);
  }
  return parts.length ? parts.join(" ") : undefined;
}

/**
 * Execute a single node and return its output bytes.
 * Throws a detailed execution error if the node fails.
 */
export async function executeNode(
  node: GraphNode,
  inputs: Record<string, Uint8Array>,
): Promise<Record<string, Uint8Array>> {
  const def = await loadNodeDef(node.data.kind);
  const runner = def.runner as NodeRunner | undefined;
  if (!runner) {
    throw new Error(`Unknown node kind: "${node.data.kind}"`);
  }

  try {
    const result = await runner(node, inputs);
    if (result instanceof Uint8Array) {
      return { default: result };
    }
    return result;
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    throw new ExecutionError(`Node "${node.data.label}" (${node.data.kind}) failed: ${error.message}`, error, {
      nodeId: node.id,
      nodeKind: node.data.kind,
    });
  }
}

/**
 * Execute the entire graph in topological order.
 * Returns outputs for successful nodes and errors for failed ones.
 */
export async function executeGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Promise<ExecutionResult> {
  const outputs = new Map<string, Record<string, Uint8Array>>();
  const errors = new Map<string, string>();
  const logs: NodeExecutionLog[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build reverse adjacency list (who depends on me)
  const edgesByTarget = new Map<string, GraphEdge[]>();
  edges.forEach((e) => {
    if (!nodeIds.has(e.target)) return;
    const list = edgesByTarget.get(e.target) || [];
    list.push(e);
    edgesByTarget.set(e.target, list);
  });

  // Validate graph structure first
  const { order, cycle } = topologicalOrder(nodes, edges);

  if (cycle) {
    for (const n of nodes) {
      errors.set(n.id, "Cycle detected in graph");
      logs.push({
        nodeId: n.id,
        label: n.data.label,
        kind: n.data.kind,
        params: await nodeParams(n),
        status: "error",
        error: "Cycle detected in graph",
        duration: 0,
      });
    }
    return { outputs, errors, order: [], logs };
  }

  // Pre-index nodes by ID for O(1) lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Execute nodes in order
  let encounteredError = false;
  for (const id of order) {
    const node = nodeMap.get(id);
    if (!node) {
      errors.set(id, `Node "${id}" not found`);
      encounteredError = true;
      continue;
    }

    if (encounteredError) {
      logs.push({
        nodeId: node.id,
        label: node.data.label,
        kind: node.data.kind,
        params: await nodeParams(node),
        status: "skipped",
        duration: 0,
      });
      continue;
    }

    const nodeInputs: Record<string, Uint8Array> = {};

    // Collect inputs from connected edges (only from nodes that executed successfully)
    const incoming = edgesByTarget.get(id) || [];
    for (const edge of incoming) {
      const sourceOutputs = outputs.get(edge.source);
      if (sourceOutputs) {
        const val = sourceOutputs[edge.sourceHandle || "default"];
        if (val) {
          const handleId = edge.targetHandle || "data";
          nodeInputs[handleId] = val;
        }
      }
    }

    const start = performance.now();

    const log: NodeExecutionLog = {
      nodeId: node.id,
      label: node.data.label,
      kind: node.data.kind,
      params: await nodeParams(node),
      outputFormat: node.data.outputFormat,
      status: "success",
      duration: 0,
    };

    try {
      const result = await executeNode(node, nodeInputs);
      outputs.set(id, result);
      // For logging, we still use 'default' or the first output available for the quick summary
      log.outputBytes = result["default"] || Object.values(result)[0];
      log.outputs = result;
      log.duration = performance.now() - start;
      logs.push(log);
    } catch (e) {
      const execError = e as ExecutionError;
      errors.set(id, execError.message);
      log.status = "error";
      log.error = execError.message;
      log.duration = performance.now() - start;
      logs.push(log);
      encounteredError = true;
    }
  }

  return { outputs, errors, order, logs };
}

/**
 * Custom error class for node execution failures.
 * Preserves the original error chain and adds node context.
 */
export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly cause: Error,
    public readonly context: { nodeId: string; nodeKind: string },
  ) {
    super(message);
    this.name = "ExecutionError";
    this.stack = `${this.stack}\n\nCaused by:\n${cause.stack}`;
  }
}
