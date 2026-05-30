import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { graphStore } from "../store";
import { NODE_KIND_META } from "@/lib/crypto/registry";
import type { GraphEdge, GraphNode, NodeExecutionLog, ExecutionResult } from "@/lib/crypto/types";
import { formatBytes } from "@/lib/crypto/service";
import { toast } from "sonner";

const EXECUTION_MIN_MS = 150;

export function useGraphExecution(activeId: string, nodes: GraphNode[], edges: GraphEdge[]) {
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
        worker.postMessage({ id, nodes, edges, pluginUrls });
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

    try {
      const result = await workerExecute(wf.nodes, wf.edges);
      setExecLogs(result.logs);
      const errors = Array.from(result.errors.values());
      setErrorCount(errors.length);

      const cur = graphStore.getActive().nodes;
      const next: GraphNode[] = cur.map((n) => {
        const error = result.errors.get(n.id);
        const outputs = result.outputs.get(n.id);
        const fmt = n.data.outputFormat ?? "utf8";

        let output = "";
        let outputBytesLen = 0;

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
            output = formatBytes(entries[0][1], fmt, getLabel(entries[0][0]));
            outputBytesLen = entries[0][1].byteLength;
          } else if (entries.length > 0) {
            output = entries
              .map(([k, b]) => `${k.toUpperCase()}:\n${formatBytes(b, fmt, getLabel(k))}`)
              .join("\n\n");
            outputBytesLen = entries.reduce((acc, [_, b]) => acc + b.byteLength, 0);
          }
        }

        const prev = n.data;
        if (
          prev.output === output &&
          prev.error === error &&
          prev.outputBytesLen === outputBytesLen
        )
          return n;
        return { ...n, data: { ...prev, output, error, outputBytesLen } };
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
  }, [workerExecute]);

  const execKey = useMemo(() => {
    const summary = {
      activeId,
      pluginUrls: graphStore.getAllPluginUrls(),
      nodes: nodes.map((n) => {
        const meta = NODE_KIND_META[n.data.kind];
        const config: Record<string, any> = { k: n.data.kind, f: n.data.outputFormat };
        if (meta?.inputs) {
          for (const input of meta.inputs) {
            if (input.type != null) {
              config[input.id] = n.data[input.id];
            }
          }
        }
        return { id: n.id, c: config };
      }),
      edges: edges.map((e) => ({
        s: e.source,
        t: e.target,
        sh: e.sourceHandle,
        th: e.targetHandle,
      })),
    };
    return JSON.stringify(summary);
  }, [nodes, edges, activeId]);

  useEffect(() => {
    if (!execKey) return;
    const t = setTimeout(() => {
      execute();
    }, EXECUTION_MIN_MS);
    return () => clearTimeout(t);
  }, [execKey, execute]);

  return { execRunning, execLogs, errorCount, execute };
}
