import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { graphStore } from "../store";
import { NODE_KIND_META } from "@/lib/crypto/registry";
import type { GraphEdge, GraphNode, NodeExecutionLog, ExecutionResult } from "@/lib/crypto/types";
import { formatBytes } from "@/lib/crypto/service";
import { toast } from "sonner";

const EXECUTION_DEBOUNCE_MS = 500;

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
        console.error("[executor] worker crashed:", err);
        executePendingRef.current.forEach((p) => p.reject(new Error("Worker crashed")));
        executePendingRef.current.clear();
      };
      executeWorkerRef.current = w;
      return () => {
        w.terminate();
        executeWorkerRef.current = null;
      };
    } catch (e) {
      console.error("[executor] failed to create worker:", e);
    }
  }, []);

  const workerExecute = useCallback(
    (nodes: GraphNode[], edges: GraphEdge[]): Promise<ExecutionResult> => {
      return new Promise((resolve, reject) => {
        const worker = executeWorkerRef.current;
        if (!worker) {
          return reject(new Error("Worker not initialized"));
        }

        const id = ++executeIdRef.current;
        const pluginUrls = graphStore.getAllPluginUrls();

        const timeout = setTimeout(() => {
          if (executePendingRef.current.has(id)) {
            executePendingRef.current.delete(id);
            reject(new Error("Execution timed out (15s)"));
          }
        }, 15000);

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
        // Extract fileBytes for zero-copy transfer (keep originals intact in store)
        const fileTransfers: [string, Uint8Array][] = [];
        const transferables: ArrayBuffer[] = [];
        const strippedNodes = nodes.map((n) => {
          if (n.data.fileBytes instanceof Uint8Array) {
            const copy = n.data.fileBytes.slice();
            fileTransfers.push([n.id, copy]);
            transferables.push(copy.buffer);
            return { ...n, data: { ...n.data, fileBytes: undefined } };
          }
          return n;
        });
        worker.postMessage(
          { id, nodes: strippedNodes, edges, pluginUrls, fileTransfers },
          transferables,
        );
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

      const cur = graphStore.getActive().nodes;
      const next: GraphNode[] = cur.map((n) => {
        const error = result.errors.get(n.id);
        const outputs = result.outputs.get(n.id);
        const fmt = n.data.outputFormat ?? "utf8";

        let output = "";
        let outputBytesLen: number | undefined = undefined;
        let outputEntries: { key: string; label: string; bytes: Uint8Array }[] | undefined;

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
                ? formatBytes(dv.value, fmt, getLabel(entries[0][0]))
                : dv
                  ? String(dv.value)
                  : "";
            if (dv && dv.value instanceof Uint8Array) {
              outputBytesLen = dv.value.byteLength;
            } else if (dv && typeof dv.value === "boolean") {
              outputBytesLen = 1;
            }
          } else if (entries.length > 0) {
            output = entries
              .map(([k, dv]) => {
                const val =
                  dv && dv.value instanceof Uint8Array
                    ? formatBytes(dv.value, fmt, getLabel(k))
                    : dv
                      ? String(dv.value)
                      : "";
                return `${k.toUpperCase()}:\n${val}`;
              })
              .join("\n\n");

            const totalBytes = entries.reduce((acc, [_, dv]) => {
              if (dv && dv.value instanceof Uint8Array) return acc + dv.value.byteLength;
              if (dv && typeof dv.value === "boolean") return acc + 1;
              return acc;
            }, 0);
            outputBytesLen = totalBytes;

            // Store raw entries for multi-output save dialog
            outputEntries = entries
              .filter(([_, dv]) => dv?.value instanceof Uint8Array)
              .map(([k, dv]) => ({
                key: k,
                label: getLabel(k),
                bytes: dv.value as Uint8Array,
              }));
          }
        }

        const prev = n.data;
        if (
          prev.output === output &&
          prev.error === error &&
          prev.outputBytesLen === outputBytesLen
        )
          return n;
        return { ...n, data: { ...prev, output, outputEntries, error, outputBytesLen } };
      });
      if (next.some((n, i) => n !== cur[i])) graphStore.setNodes(next);
    } catch (error) {
      console.error("[executor] execution failed:", error);
      if (executeWorkerRef.current) {
        toast.error("Execution failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      isExecutingRef.current = false;
      setExecRunning(false);
    }
  }, [workerExecute, selectedGroup]);

  // Stable key for auto-execution — only changes on structural/config changes, NOT on node drag.
  const execKeyRef = useRef("");
  const prevNodesKeyRef = useRef("");
  const fullKey = useMemo(() => {
    const nodesKey = nodes
      .map((n) => {
        const meta = NODE_KIND_META[n.data.kind];
        const config: Record<string, any> = { k: n.data.kind, f: n.data.outputFormat };
        if (meta?.inputs) {
          for (const input of meta.inputs) {
            if (input.type != null) {
              config[input.id] = n.data[input.id];
            }
          }
        }
        if (n.data.kind === "file") {
          config.fileName = n.data.fileName;
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
  if (fullKey !== prevNodesKeyRef.current) {
    prevNodesKeyRef.current = fullKey;
    execKeyRef.current = fullKey;
  }

  useEffect(() => {
    if (!execKeyRef.current) return;
    const t = setTimeout(() => {
      execute();
    }, EXECUTION_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [execKeyRef.current, execute]);

  return { execRunning, execLogs, errorCount, execute };
}
