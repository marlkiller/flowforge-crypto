import { NODE_KIND_META, defaultOutputFormat } from "./registry";
import type { GraphNode } from "./types";

let nodeCounter = 1;
export const newNodeId = () => `n_${nodeCounter++}_${Date.now().toString(36).slice(-3)}`;

export function makeNode(
  kind: string,
  position: { x: number; y: number },
  initialData: Record<string, unknown> = {},
): GraphNode {
  const meta = NODE_KIND_META[kind];
  if (!meta) throw new Error(`Unknown node kind: ${kind}`);

  const data: Record<string, unknown> = {
    kind,
    label: meta.label,
    outputFormat: defaultOutputFormat(kind),
    ...initialData,
  };

  const formFields = meta.inputs?.filter((i) => i.type) ?? [];
  for (const f of formFields) {
    if (data[f.id] !== undefined) continue;

    if (f.type === "select" && f.options?.length) {
      data[f.id] = f.options[0].value;
    } else if (f.defaultValue !== undefined) {
      data[f.id] = f.defaultValue;
    }
  }

  return { id: newNodeId(), type: "crypto", position, data } as GraphNode;
}
