import type {
  GraphNode,
  GraphEdge,
  ExecutionResult,
  NodeExecutionLog,
  NodeRunner,
  DataValue,
  DataType,
} from "./types";
import { loadNodeDef } from "./registry";
import { topologicalOrder } from "./topoSort";

async function nodeParams(node: GraphNode): Promise<string | undefined> {
  const def = await loadNodeDef(node.data.kind);
  const meta = def.meta;
  const parts: string[] = [];
  const formFields = meta.inputs?.filter((i) => i.type) ?? [];
  for (const field of formFields) {
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
  inputs: Record<string, DataValue>,
): Promise<Record<string, DataValue>> {
  const def = await loadNodeDef(node.data.kind);
  const runner = def.runner as NodeRunner | undefined;
  if (!runner) {
    throw new Error(`Unknown node kind: "${node.data.kind}"`);
  }

  try {
    const unwrappedInputs = new Proxy(inputs, {
      get(target, prop) {
        if (prop === "__raw") return target;
        const val = target[prop as string];
        if (val && typeof val === "object" && "value" in val) {
          return val.value;
        }
        return val;
      },
    });

    const result = await runner(node, unwrappedInputs as any);

    const wrap = (val: any): DataValue => {
      // Already a DataValue?
      if (val && typeof val === "object" && "type" in val && "value" in val) {
        return val as DataValue;
      }

      // Auto-determine type
      let type: DataType =
        (node.data.outputFormat as DataType) || (def.meta.defaultOutput as DataType) || "raw";

      if (val instanceof Uint8Array) {
        // use determined type
      } else if (typeof val === "boolean") {
        type = "bool";
      } else if (typeof val === "string") {
        // use determined type
      } else if (val && typeof val === "object" && val.constructor.name === "CryptoKey") {
        type = "cryptokey";
      }

      return { type, value: val };
    };

    if (
      result instanceof Uint8Array ||
      (result !== null &&
        typeof result === "object" &&
        "type" in (result as Record<string, unknown>)) ||
      typeof result === "boolean"
    ) {
      return { default: wrap(result) };
    }

    if (result && typeof result === "object") {
      const wrapped: Record<string, DataValue> = {};
      for (const [k, v] of Object.entries(result)) {
        wrapped[k] = wrap(v);
      }
      return wrapped;
    }

    return { default: wrap(result) };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    throw new ExecutionError(
      `Node "${node.data.label}" (${node.data.kind}) failed: ${error.message}`,
      error,
      {
        nodeId: node.id,
        nodeKind: node.data.kind,
      },
    );
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
  const outputs = new Map<string, Record<string, DataValue>>();
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
  const failedOrSkipped = new Set<string>();
  for (const id of order) {
    const node = nodeMap.get(id);
    if (!node) {
      errors.set(id, `Node "${id}" not found`);
      failedOrSkipped.add(id);
      continue;
    }

    const def = await loadNodeDef(node.data.kind);
    if (def.meta.category === "ui") {
      continue; // Skip UI-only nodes (notes, groups, etc.) from logic & logs
    }

    // Check if any upstream node failed or was skipped
    const incoming = edgesByTarget.get(id) || [];
    let upstreamFailed = false;
    for (const edge of incoming) {
      if (failedOrSkipped.has(edge.source)) {
        upstreamFailed = true;
        break;
      }
    }

    if (upstreamFailed) {
      failedOrSkipped.add(id);
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

    const nodeInputs: Record<string, DataValue> = {};

    // Collect inputs from connected edges (only from nodes that executed successfully)
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

      const firstOutput = Object.values(result)[0];
      if (firstOutput && firstOutput.value instanceof Uint8Array) {
        log.outputBytes = firstOutput.value;
      }
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
      failedOrSkipped.add(id);
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
