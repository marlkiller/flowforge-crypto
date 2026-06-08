import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { graphStore } from "../store";
import { NODE_KIND_META } from "@/lib/crypto/registry";
import type { GraphEdge, GraphNode, NodeExecutionLog, ExecutionResult } from "@/lib/crypto/types";
import { formatBytes } from "@/lib/crypto/service";
import { getStoredFile } from "@/lib/crypto/fileStore";
import { formatByteSize } from "@/lib/crypto/preview";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

const EXECUTION_DEBOUNCE_MS = 500;
const EXECUTION_TIMEOUT_MS = 60000;

function formatOutputValue(
  value: Uint8Array,
  fmt: Parameters<typeof formatBytes>[1],
  label: string,
  truncated?: boolean,
  byteLength?: number,
): string {
  const text = formatBytes(value, fmt, label);
  if (!truncated) return text;
  const total = byteLength ?? value.byteLength;
  return `${text}\n\n... [preview ${formatByteSize(value.byteLength)} of ${formatByteSize(total)}]`;
}

export function useGraphExecution(
  activeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  selectedGroup: string | null = null,
) {
  const [errorCount, setErrorCount] = useState(0);
  const [execLogs, setExecLogs] = useState<NodeExecutionLog[]>([]);
  const [execRunning, setExecRunning] = useState(false);

  const executeWorkerRef = useRef<Worker | null>(null);
  const executeIdRef = useRef(0);
  const executePendingRef = useRef<
    Map<number, { resolve: (r: ExecutionResult) => void; reject: (e: Error) => void }>
  >(new Map());
  const isExecutingRef = useRef(false);
  const executionContextRef = useRef({
    activeId,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  });
  executionContextRef.current = {
    activeId,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };

  // Worker lifecycle
  useEffect(() => {
    try {
      const w = new Worker(new URL("../../../lib/crypto/executor.worker.ts", import.meta.url), {
        type: "module",
      });
      w.onmessage = (e: MessageEvent) => {
        const { id, outputs, errors, order, logs, error } = e.data;
        const p = executePendingRef.current.get(id);
        if (!p) return;
        executePendingRef.current.delete(id);
        if (error) p.reject(new Error(error));
        else p.resolve({ outputs: new Map(outputs), errors: new Map(errors), order, logs });
      };
      w.onerror = (err) => {
        const ctx = executionContextRef.current;
        logger.error("Executor worker crashed", {
          error: err instanceof ErrorEvent ? (err.error ?? err.message) : err,
          activeId: ctx.activeId,
          nodeCount: ctx.nodeCount,
          edgeCount: ctx.edgeCount,
        });
        executePendingRef.current.forEach((p) => p.reject(new Error("Worker crashed")));
        executePendingRef.current.clear();
      };
      executeWorkerRef.current = w;
      return () => {
        w.terminate();
        executeWorkerRef.current = null;
      };
    } catch (e) {
      const ctx = executionContextRef.current;
      logger.error("Failed to create executor worker", {
        error: e,
        activeId: ctx.activeId,
        nodeCount: ctx.nodeCount,
        edgeCount: ctx.edgeCount,
      });
    }
  }, []);

  const workerExecute = useCallback(
    async (nodes: GraphNode[], edges: GraphEdge[]): Promise<ExecutionResult> => {
      const worker = executeWorkerRef.current;
      if (!worker) {
        throw new Error("Worker not initialized");
      }

      const id = ++executeIdRef.current;
      const pluginUrls = graphStore.getAllPluginUrls();

      // Pass File handles to the worker; the worker reads bytes so large files avoid main-thread state/allocation.
      const fileTransfers: [string, File][] = [];
      const strippedNodes = await Promise.all(
        nodes.map((n) => {
          if (n.data.kind === "file") {
            const fileRefId = n.data.fileRefId;
            if (typeof fileRefId === "string") {
              const file = getStoredFile(fileRefId);
              if (file) {
                fileTransfers.push([n.id, file]);
              }
            }
            return { ...n, data: { ...n.data, fileBytes: undefined } };
          }
          return n;
        }),
      );

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (executePendingRef.current.has(id)) {
            executePendingRef.current.delete(id);
            logger.error("Graph execution timed out", {
              executionId: id,
              timeoutMs: EXECUTION_TIMEOUT_MS,
              nodeCount: nodes.length,
              edgeCount: edges.length,
              pluginCount: pluginUrls.length,
            });
            reject(new Error(`Execution timed out (${EXECUTION_TIMEOUT_MS / 1000}s)`));
          }
        }, EXECUTION_TIMEOUT_MS);

        executePendingRef.current.set(id, {
          resolve: (r) => {
            clearTimeout(timeout);
            resolve(r);
          },
          reject: (e) => {
            clearTimeout(timeout);
            reject(e);
          },
        });

        worker.postMessage({
          id,
          nodes: strippedNodes,
          edges,
          pluginUrls,
          fileTransfers,
        });
      });
    },
    [],
  );

  const execute = useCallback(async () => {
    if (isExecutingRef.current) return;

    isExecutingRef.current = true;
    setExecRunning(true);
    setExecLogs([]);

    const wf = graphStore.getActive();

    // When filtering by group, include connected nodes via edges (not absolute isolation)
    const filteredNodes = selectedGroup
      ? (() => {
          const groupNode = wf.nodes.find((n) => n.id === selectedGroup);
          const allowOutbound = groupNode?.data?.allowOutbound === "yes";
          const seed = new Set(
            wf.nodes
              .filter((n) => n.parentId === selectedGroup || n.id === selectedGroup)
              .map((n) => n.id),
          );

          // Build adjacency
          const inEdges = new Map<string, string[]>();
          const outEdges = new Map<string, string[]>();
          for (const e of wf.edges) {
            const ins = inEdges.get(e.target) || [];
            ins.push(e.source);
            inEdges.set(e.target, ins);
            const outs = outEdges.get(e.source) || [];
            outs.push(e.target);
            outEdges.set(e.source, outs);
          }

          // Walk upstream (always include all dependencies for correct execution)
          const selected = new Set(seed);
          const queue = Array.from(seed);
          for (const id of queue) {
            for (const src of inEdges.get(id) || []) {
              if (!selected.has(src)) {
                selected.add(src);
                queue.push(src);
              }
            }
          }

          // Walk downstream (only if allowOutbound)
          if (allowOutbound) {
            const fwd = Array.from(seed);
            for (const id of fwd) {
              for (const tgt of outEdges.get(id) || []) {
                if (!selected.has(tgt)) {
                  selected.add(tgt);
                  fwd.push(tgt);
                }
              }
            }
          }

          return wf.nodes.filter((n) => selected.has(n.id));
        })()
      : wf.nodes;
    const groupIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = selectedGroup
      ? wf.edges.filter((e) => groupIds.has(e.source) && groupIds.has(e.target))
      : wf.edges;

    try {
      const result = await workerExecute(filteredNodes, filteredEdges);
      setExecLogs(result.logs);
      const errors = Array.from(result.errors.values());
      setErrorCount(errors.length);
      logger.debug("Graph execution completed", {
        activeId,
        selectedGroup,
        nodeCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
        errorCount: errors.length,
      });

      const cur = graphStore.getActive().nodes;
      const next: GraphNode[] = cur.map((n) => {
        const error = result.errors.get(n.id);
        const outputs = result.outputs.get(n.id);
        const fmt = n.data.outputFormat ?? "utf8";

        let output = "";
        let outputBytesLen: number | undefined = undefined;
        let outputTruncated = false;
        let outputEntries:
          | {
              key: string;
              label: string;
              bytes: Uint8Array;
              byteLength?: number;
              truncated?: boolean;
            }[]
          | undefined;

        if (outputs) {
          const entries = Object.entries(outputs);
          const getLabel = (key: string) => {
            if (key === "publicKey") return "PUBLIC KEY";
            if (key === "privateKey") return "PRIVATE KEY";
            return key
              .replace(/([A-Z])/g, " $1")
              .toUpperCase()
              .trim();
          };

          if (entries.length === 1 && (entries[0][0] === "default" || entries[0][0] === "data")) {
            const dv = entries[0][1];
            output =
              dv && dv.value instanceof Uint8Array
                ? formatOutputValue(
                    dv.value,
                    fmt,
                    getLabel(entries[0][0]),
                    dv.truncated,
                    dv.byteLength,
                  )
                : dv
                  ? String(dv.value)
                  : "";
            if (dv && dv.value instanceof Uint8Array) {
              outputBytesLen = dv.byteLength ?? dv.value.byteLength;
              outputTruncated = !!dv.truncated;
            } else if (dv && typeof dv.value === "boolean") {
              outputBytesLen = 1;
            }
          } else if (entries.length > 0) {
            output = entries
              .map(([k, dv]) => {
                const val =
                  dv && dv.value instanceof Uint8Array
                    ? formatOutputValue(dv.value, fmt, getLabel(k), dv.truncated, dv.byteLength)
                    : dv
                      ? String(dv.value)
                      : "";
                return `${k.toUpperCase()}:\n${val}`;
              })
              .join("\n\n");

            const totalBytes = entries.reduce((acc, [_, dv]) => {
              if (dv && dv.value instanceof Uint8Array)
                return acc + (dv.byteLength ?? dv.value.byteLength);
              if (dv && typeof dv.value === "boolean") return acc + 1;
              return acc;
            }, 0);
            outputBytesLen = totalBytes;
            outputTruncated = entries.some(([_, dv]) => !!dv?.truncated);

            // Store raw entries for multi-output save dialog
            outputEntries = entries
              .filter(([_, dv]) => dv?.value instanceof Uint8Array)
              .map(([k, dv]) => ({
                key: k,
                label: getLabel(k),
                bytes: dv.value as Uint8Array,
                byteLength: dv.byteLength,
                truncated: !!dv.truncated,
              }));
          }
        }

        const prev = n.data;
        if (
          prev.output === output &&
          prev.error === error &&
          prev.outputBytesLen === outputBytesLen &&
          prev.outputTruncated === outputTruncated
        )
          return n;
        return {
          ...n,
          data: { ...prev, output, outputEntries, error, outputBytesLen, outputTruncated },
        };
      });
      if (next.some((n, i) => n !== cur[i])) graphStore.setNodes(next);
    } catch (error) {
      logger.error("Graph execution failed", {
        error,
        activeId,
        selectedGroup,
        nodeCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
      });
      if (executeWorkerRef.current) {
        toast.error("Execution failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      isExecutingRef.current = false;
      setExecRunning(false);
    }
  }, [activeId, workerExecute, selectedGroup]);

  // Stable key for auto-execution — only changes on structural/config changes, NOT on node drag.
  const fullKey = useMemo(() => {
    const nodesKey = nodes
      .map((n) => {
        const meta = NODE_KIND_META[n.data.kind];
        const config: Record<string, unknown> = { k: n.data.kind, f: n.data.outputFormat };
        if (meta?.inputs) {
          for (const input of meta.inputs) {
            if (input.type != null) {
              config[input.id] = n.data[input.id];
            }
          }
        }
        if (n.data.kind === "file") {
          config.fileRefId = n.data.fileRefId;
          config.fileName = n.data.fileName;
          config.fileSize = n.data.fileSize;
          config.fileLastModified = n.data.fileLastModified;
        }
        return `${n.id}:${JSON.stringify(config)}`;
      })
      .sort()
      .join("|");
    const edgesKey = edges
      .map((e) => `${e.source}>${e.target}:${e.sourceHandle ?? ""}:${e.targetHandle ?? ""}`)
      .sort()
      .join("|");
    return `${activeId}|${edgesKey}|${nodesKey}`;
  }, [nodes, edges, activeId]);
  useEffect(() => {
    if (!fullKey) return;
    const t = setTimeout(() => {
      execute();
    }, EXECUTION_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [fullKey, execute]);

  return { execRunning, execLogs, errorCount, execute };
}
