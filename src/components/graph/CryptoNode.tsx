import { Handle, Position, useNodeConnections, type NodeProps } from "@xyflow/react";
import { NODE_KIND_META, CATEGORY_META } from "@/lib/crypto/registry";
import type { NodeData, NodeFieldMeta } from "@/lib/crypto/types";
import { graphStore } from "./store";
import { Upload, File as FileIcon, Link2 } from "lucide-react";
import { useEffect } from "react";

export function CryptoNode({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const meta = NODE_KIND_META[d.kind];
  if (!meta) {
    return (
      <div
        className={`group min-w-[200px] max-w-[260px] rounded-xl border border-destructive/50 bg-card/90 shadow-lg ${selected ? "ring-4 ring-destructive/20" : ""}`}
      >
        <div className="px-3 py-2 text-xs text-destructive font-bold">
          Unknown node: "{d.kind}"
        </div>
      </div>
    );
  }
  const cat = CATEGORY_META[meta.category] ?? {
    label: meta.category,
    accent: "text-muted-foreground",
    chip: "bg-muted/50 text-muted-foreground border-border/50",
    dot: "bg-muted-foreground",
  };

  const hasOutput = d.kind !== "output";

  // Dynamic inputs support
  let dynamicInputs = meta.inputs || [];
  let dynamicFields = meta.fields || [];
  let dynamicOutputs = meta.outputs || [];

  if (d.kind === "join") {
    const count = parseInt((d["count"] as string) || "2", 10);
    dynamicInputs = [];
    for (let i = 1; i <= count; i++) {
      dynamicInputs.push({ id: `in_${i}`, label: `Input ${i}` });
    }
  }

  const isSourceNode = ["input", "file", "rsa_keygen", "ec_keygen"].includes(d.kind);

  const allInputs =
    dynamicInputs.length > 0
      ? dynamicInputs
      : meta.inputs
        ? meta.inputs
        : !isSourceNode
          ? [{ id: "data", label: "Data" }]
          : [];

  const allOutputs =
    dynamicOutputs.length > 0
      ? dynamicOutputs
      : meta.outputs
        ? meta.outputs
        : d.kind !== "output"
          ? [{ id: "default", label: "Output" }]
          : [];

  const visibleOutputs = allOutputs.filter((output) => output.visible?.(d) ?? true);
  const visibleInputs = allInputs.filter((input) => input.visible?.(d) ?? true);

  // Separate inputs into those that map to fields and those that don't (like 'data')
  const fieldInputIds = new Set(dynamicFields.map((f) => f.id));
  const orphanInputs = visibleInputs.filter((i) => !fieldInputIds.has(i.id));

  // Filter fields based on metadata `visible` predicate
  const visibleFields = dynamicFields.filter((field) => field.visible?.(d) ?? true);

  // Disconnect edges attached to handles that are no longer visible
  useEffect(() => {
    const wf = graphStore.getActive();
    const visibleIds = new Set(visibleInputs.map((i) => i.id));
    const keep = wf.edges.filter((e) => {
      if (e.target !== id) return true;
      return visibleIds.has(e.targetHandle || "data");
    });
    if (keep.length !== wf.edges.length) {
      graphStore.setEdges(keep);
    }
  }, [d.cipherMode, d.kind, d.count, id]);

  const update = (patch: Record<string, unknown>) => graphStore.updateNodeData(id, patch);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      update({ "fileName": file.name, "fileBytes": bytes });
    };
    reader.readAsArrayBuffer(file);
  };

  const hasError = !!d.error;

  return (
    <div
      className={`group min-w-[200px] max-w-[260px] rounded-xl border bg-card/90 backdrop-blur-sm shadow-lg transition-all duration-200 ${
        hasError
          ? "border-destructive ring-4 ring-destructive/20 shadow-2xl z-10"
          : selected
            ? "border-primary ring-4 ring-primary/20 scale-[1.02] shadow-2xl z-10"
            : "border-border hover:border-primary/50 hover:shadow-xl"
      }`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-b border-border/50 bg-muted/30 ${cat.chip}`}
      >
        <span className="text-sm font-bold text-foreground truncate">{d.label}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 px-2 py-0.5 rounded-full bg-background/50 border border-border/50">
          {cat.label}
        </span>
      </div>

      <div className="p-3 space-y-2 text-[11px] relative">
        {/* Orphan inputs (like 'Data') that don't have a matching field */}
        {orphanInputs.map((input) => (
          <div key={input.id} className="relative h-5 flex items-center">
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              className="!w-4 !h-4 !bg-muted-foreground !border-2 !border-background !-left-[22px] transition-transform hover:scale-125 z-20"
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {input.label}
            </span>
          </div>
        ))}

        {d.kind === "file" && (
          <div className="space-y-1.5">
            <label className="nodrag flex flex-col items-center justify-center w-full h-20 rounded-lg border-2 border-dashed border-border bg-background/50 hover:bg-accent hover:border-primary/50 cursor-pointer transition-all group/file">
              <input
                type="file"
                className="hidden"
                onChange={onFileChange}
                onClick={(e) => e.stopPropagation()}
              />
              {d.fileName ? (
                <div className="flex flex-col items-center gap-1.5 text-foreground px-2 text-center">
                  <FileIcon className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-medium line-clamp-1">{d["fileName"] as string}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover/file:text-foreground">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Click to browse</span>
                </div>
              )}
            </label>
          </div>
        )}

        {visibleFields.map((field) => (
          <NodeField
            key={field.id}
            nodeId={id}
            field={field}
            value={d[field.id] as string | undefined}
            update={update}
            hasHandle={visibleInputs.some((i) => i.id === field.id)}
          />
        ))}

        {/* Multi-output handles */}
        {visibleOutputs.length > 1 || (visibleOutputs.length === 1 && visibleOutputs[0].id !== "default") ? (
          <div className="pt-2 border-t border-border/50 space-y-2">
            {visibleOutputs.map((output) => (
              <div key={output.id} className="relative h-5 flex items-center justify-end">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary mr-1">
                  {output.label}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.id}
                  className="!w-4 !h-4 !bg-primary !border-2 !border-background !-right-[22px] transition-transform hover:scale-125 z-20"
                />
              </div>
            ))}
          </div>
        ) : visibleOutputs.length === 1 ? (
          <Handle
            type="source"
            position={Position.Right}
            id="default"
            className="!w-3.5 !h-3.5 !bg-primary !border-2 !border-background transition-transform hover:scale-125 z-20"
          />
        ) : null}

        <div className="pt-1.5 border-t border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Output
              {typeof d.outputBytesLen === "number" && (
                <span className="ml-1 text-foreground/50 normal-case font-medium">
                  · {d.outputBytesLen}B
                </span>
              )}
            </span>
            <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {(d.outputFormat ?? "utf8").toUpperCase()}
            </span>
          </div>
          {d.error ? (
            <div className="rounded-md bg-destructive/15 border border-destructive/50 text-destructive px-2.5 py-2 break-all font-mono text-[10px] shadow-inner whitespace-pre-wrap">
              <span className="font-bold">✕ </span>{d.error}
            </div>
          ) : (
            <div className="rounded-md bg-background border border-border text-foreground px-2.5 py-1.5 break-all font-mono max-h-20 overflow-auto text-[10px] shadow-inner custom-scrollbar whitespace-pre-wrap">
              {d.output || <span className="text-muted-foreground italic">No output yet</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NodeField({
  nodeId,
  field,
  value,
  update,
  hasHandle,
  sourceHandleId,
}: {
  nodeId: string;
  field: NodeFieldMeta;
  value: string | undefined;
  update: (patch: Partial<NodeData>) => void;
  hasHandle: boolean;
  sourceHandleId?: string;
}) {
  const connections = useNodeConnections({ id: nodeId, handleType: "target", handleId: field.id });
  const isConnected = connections.length > 0;

  return (
    <div className="space-y-1 relative">
      {hasHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id={field.id}
          className="!w-3.5 !h-3.5 !bg-muted-foreground !border-2 !border-background !-left-[20px] top-2.5 transition-transform hover:scale-125 z-20"
        />
      )}

      {sourceHandleId && (
        <Handle
          type="source"
          position={Position.Right}
          id={sourceHandleId}
          className="!w-3.5 !h-3.5 !bg-primary !border-2 !border-background !-right-[20px] top-2.5 transition-transform hover:scale-125 z-20"
        />
      )}

      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {field.label}
        </div>
        {isConnected && <Link2 className="w-3 h-3 text-primary animate-pulse" />}
      </div>

      {isConnected ? (
        <div className="w-full bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5 text-[10px] text-primary font-medium italic shadow-inner">
          Value linked to input
        </div>
      ) : field.type === "textarea" ? (
        <textarea
          className="nodrag w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-[10px] font-mono text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none min-h-[44px] custom-scrollbar placeholder:text-muted-foreground/50 transition-all"
          value={value || ""}
          onChange={(e) => update({ [field.id]: e.target.value })}
          placeholder={field.placeholder}
          onClick={(e) => e.stopPropagation()}
        />
      ) : field.type === "select" ? (
        <select
          className="nodrag w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-[11px] text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium appearance-none cursor-pointer"
          value={value || field.options?.[0]?.value}
          onChange={(e) => update({ [field.id]: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          className="nodrag w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-[11px] text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground/50 transition-all"
          value={value || ""}
          onChange={(e) => update({ [field.id]: e.target.value })}
          placeholder={field.placeholder}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
