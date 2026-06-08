import { useCallback, useEffect, useState } from "react";

import { graphStore, useGraphStore } from "../store";
import { getStoredFile } from "@/lib/crypto/fileStore";
import { SaveOutputDialog } from "./SaveOutputDialog";

type ExportOutputWorkerResponse = {
  id: number;
  value?: Uint8Array;
  error?: string;
};

export function SaveOutputBridge({
  triggerRef,
}: {
  triggerRef: React.MutableRefObject<((id: string) => void) | null>;
}) {
  const [nodeId, setNodeId] = useState<string | null>(null);

  useEffect(() => {
    triggerRef.current = (id: string) => setNodeId(id);
    return () => {
      triggerRef.current = null;
    };
  }, [triggerRef]);

  const node = useGraphStore((s) => {
    if (!nodeId) return null;
    const active = s.workflows.find((w) => w.id === s.activeId);
    return active?.nodes.find((n) => n.id === nodeId) ?? null;
  });

  const resolveOutput = useCallback(
    (outputKey?: string): Promise<Uint8Array> => {
      if (!nodeId) {
        return Promise.reject(new Error("No node selected"));
      }

      const active = graphStore.getActive();
      const selectedIds = new Set<string>([nodeId]);
      const queue = [nodeId];
      for (const id of queue) {
        for (const edge of active.edges) {
          if (edge.target === id && !selectedIds.has(edge.source)) {
            selectedIds.add(edge.source);
            queue.push(edge.source);
          }
        }
      }

      const selectedEdges = active.edges.filter(
        (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target),
      );
      const selectedNodes = active.nodes.filter((n) => selectedIds.has(n.id));
      const nodes = selectedNodes.map((n) => {
        if (n.data.kind === "file") {
          return { ...n, data: { ...n.data, fileBytes: undefined } };
        }
        return n;
      });
      const fileTransfers: [string, File][] = [];
      for (const n of selectedNodes) {
        if (n.data.kind !== "file" || typeof n.data.fileRefId !== "string") continue;
        const file = getStoredFile(n.data.fileRefId);
        if (file) fileTransfers.push([n.id, file]);
      }

      return new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL("../../../lib/crypto/exportOutput.worker.ts", import.meta.url),
          { type: "module" },
        );
        const id = Date.now();
        const timeout = window.setTimeout(() => {
          worker.terminate();
          reject(new Error("Save output timed out"));
        }, 60000);

        worker.onmessage = (event: MessageEvent<ExportOutputWorkerResponse>) => {
          if (event.data?.id !== id) return;
          window.clearTimeout(timeout);
          worker.terminate();
          if (event.data.error) {
            reject(new Error(event.data.error));
            return;
          }
          if (!event.data.value) {
            reject(new Error("Save output worker returned no data"));
            return;
          }
          resolve(event.data.value);
        };
        worker.onerror = () => {
          window.clearTimeout(timeout);
          worker.terminate();
          reject(new Error("Save output worker crashed"));
        };

        worker.postMessage({
          id,
          nodes,
          edges: selectedEdges,
          targetNodeId: nodeId,
          outputKey,
          pluginUrls: graphStore.getAllPluginUrls(),
          fileTransfers,
        });
      });
    },
    [nodeId],
  );

  if (!node) return null;

  return (
    <SaveOutputDialog
      open={nodeId !== null}
      onOpenChange={(open) => {
        if (!open) setNodeId(null);
      }}
      node={{
        ...node,
        data: {
          ...node.data,
          fileBytes: undefined,
        },
      }}
      onResolveOutput={resolveOutput}
    />
  );
}
