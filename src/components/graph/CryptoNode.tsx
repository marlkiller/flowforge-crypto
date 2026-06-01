import { Handle, Position, useNodeConnections, type NodeProps } from "@xyflow/react";
import { NODE_KIND_META, CATEGORY_META, SECURITY_META } from "@/lib/crypto/registry";
import type { NodeData, NodeInputMeta } from "@/lib/crypto/types";
import { formatAcceptType } from "@/lib/crypto/types";
import { File as FileIcon, Link2, ChevronDown } from "lucide-react";
import { CategoryIcon } from "./parts/CategoryIcon";
import { memo } from "react";
import { graphStore } from "./store";

function getHandleStyle(types?: string[]) {
  const type = types?.[0]?.toLowerCase() || "raw";
  let colorClass = "handle-raw";
  let shapeClass = "";

  if (["utf8", "string", "text"].includes(type)) {
    colorClass = "handle-string";
  } else if (["hex", "base64", "base32", "base58"].includes(type)) {
    colorClass = "handle-hex";
  } else if (["pem", "cert", "x509"].includes(type)) {
    colorClass = "handle-cert";
  } else if (["cryptokey", "key", "privatekey", "publickey"].includes(type)) {
    colorClass = "handle-key";
    shapeClass = "handle-diamond";
  } else if (["bool"].includes(type)) {
    colorClass = "handle-bool";
    shapeClass = "handle-square";
  } else if (["json", "object"].includes(type)) {
    colorClass = "handle-json";
  }

  return `${colorClass} ${shapeClass}`;
}

const MAX_OUTPUT_LEN = 256;

function formatOutput(output: string) {
  if (output.length <= MAX_OUTPUT_LEN) return output;
  return (
    output.slice(0, MAX_OUTPUT_LEN) +
    `\n\n... [${(output.length / 1024).toFixed(1)}KB total, truncated]`
  );
}

export const CryptoNode = memo(({ id, data, selected }: NodeProps) => {
  const d = data as NodeData;
  const meta = NODE_KIND_META[d.kind];

  // Compute derived values before any hooks (needed for both early return and normal flow)
  const cat = meta
    ? (CATEGORY_META[meta.category] ?? {
        label: meta.category,
        icon: "Hash",
        accent: "text-muted-foreground",
        chip: "bg-muted/50 text-muted-foreground border-border/50",
        dot: "bg-muted-foreground",
      })
    : null;

  let dynamicInputs = meta?.inputs || [];
  const dynamicOutputs = meta?.outputs || [];

  if (d.kind === "join" || d.kind === "template") {
    const count = parseInt((d["count"] as string) || "2", 10);
    const staticIds = d.kind === "join" ? ["count", "separator"] : ["count", "template"];
    const staticInputs = dynamicInputs.filter((i) => staticIds.includes(i.id));
    dynamicInputs = [...staticInputs];
    for (let i = 1; i <= count; i++) {
      dynamicInputs.push({ id: `in_${i}`, label: `Input ${i}`, connectable: true });
    }
  }

  const allInputs = dynamicInputs.length > 0 ? dynamicInputs : [];

  const allOutputs =
    dynamicOutputs.length > 0
      ? dynamicOutputs
      : meta?.outputs
        ? meta.outputs
        : d.kind !== "output"
          ? [{ id: "default", label: "Output" }]
          : [];

  const visibleOutputs = allOutputs.filter((output) => output.visible?.(d) ?? true);
  const visibleInputs = allInputs.filter((input) => input.visible?.(d) ?? true);

  if (!meta) {
    return (
      <div
        className={`group min-w-[200px] max-w-[260px] rounded-xl border border-destructive/50 bg-card/90 shadow-lg ${selected ? "ring-4 ring-destructive/20" : ""}`}
      >
        <div className="px-3 py-2 text-xs text-destructive font-bold">Unknown node: "{d.kind}"</div>
      </div>
    );
  }

  const update = (patch: Record<string, unknown>) => graphStore.updateNodeData(id, patch);

  const hasError = !!d.error;
  const security = meta.security ? SECURITY_META[meta.security] : null;

  return (
    <div
      className={`group min-w-[200px] max-w-[260px] rounded-xl border bg-card shadow-lg transition-[border-color,box-shadow,transform] duration-200 ${
        hasError
          ? "border-destructive ring-4 ring-destructive/20 shadow-2xl z-10"
          : selected
            ? "border-primary ring-4 ring-primary/20 scale-[1.02] shadow-2xl z-10"
            : "border-border hover:border-primary/50 hover:shadow-xl"
      }`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-b border-border/50 bg-muted/30 overflow-hidden ${cat!.chip}`}
      >
        <span className="text-sm font-bold text-foreground truncate min-w-0 flex-1">{d.label}</span>
        <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
          {security && (
            <span
              title={security.title}
              className={`rounded border px-1 py-0 text-[8px] font-bold uppercase leading-3 ${security.className}`}
            >
              {security.label}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-80 px-2 py-0.5 rounded-full bg-background/50 border border-border/50">
            <CategoryIcon name={cat!.icon} className="w-3 h-3" />
            {cat!.label}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2 text-[11px] relative">
        {visibleInputs.map((input) => {
          const hasHandle = input.connectable !== false;
          const hasForm = input.type != null;
          if (hasHandle && !hasForm) {
            return <OrphanInput key={input.id} nodeId={id} input={input} />;
          }
          return (
            <NodeField
              key={input.id}
              nodeId={id}
              field={input}
              value={d[input.id] as string | undefined}
              update={update}
              hasHandle={hasHandle}
            />
          );
        })}

        {d.kind === "file" && Boolean(d.fileName) && (
          <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background shadow-sm text-foreground">
            <FileIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[10px] font-medium truncate">{d["fileName"] as string}</span>
          </div>
        )}

        {/* Output handles */}
        {visibleOutputs.length > 0 && (
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
                  style={{ top: 10, right: -13 }}
                  className={getHandleStyle([
                    output.type || d.outputFormat || meta.defaultOutput || "raw",
                  ])}
                />
              </div>
            ))}
          </div>
        )}

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
              <span className="font-bold">✕ </span>
              {d.error}
            </div>
          ) : (
            <div className="rounded-md bg-background border border-border text-foreground px-2.5 py-1.5 break-all font-mono max-h-20 overflow-auto text-[10px] shadow-inner custom-scrollbar whitespace-pre-wrap">
              {d.output ? (
                formatOutput(d.output)
              ) : (
                <span className="text-muted-foreground italic">No output yet</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function NodeField({
  nodeId,
  field,
  value,
  update,
  hasHandle,
  sourceHandleId,
}: {
  nodeId: string;
  field: NodeInputMeta;
  value: string | undefined;
  update: (patch: Partial<NodeData>) => void;
  hasHandle: boolean;
  sourceHandleId?: string;
}) {
  const connections = useNodeConnections({ id: nodeId, handleType: "target", handleId: field.id });
  const isConnected = connections.length > 0;

  const error = !isConnected && field.validate ? field.validate(value) : null;

  return (
    <div className="space-y-1 relative">
      {hasHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id={field.id}
          style={{ top: 10, left: -13 }}
          className={getHandleStyle(field.acceptTypes)}
        />
      )}

      {sourceHandleId && (
        <Handle
          type="source"
          position={Position.Right}
          id={sourceHandleId}
          style={{ top: 10, right: -13 }}
          className={getHandleStyle(undefined)}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${error ? "text-destructive" : "text-muted-foreground"}`}
          >
            {field.label}
          </span>
          {hasHandle && field.acceptTypes && field.acceptTypes.length > 0 && (
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded">
              ({field.acceptTypes.map(formatAcceptType).join("/")})
            </span>
          )}
          {error && <span className="ml-2 normal-case font-medium text-[9px]">({error})</span>}
        </div>
        {isConnected && <Link2 className="w-3 h-3 text-primary animate-pulse" />}
      </div>

      {isConnected ? (
        <div className="w-full bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5 text-[10px] text-primary font-medium italic shadow-inner">
          Value linked to input
        </div>
      ) : field.type === "select" ? (
        <div className="relative group/select">
          <select
            className={`nodrag w-full bg-background/50 border rounded-md px-2.5 py-1 text-[10px] text-foreground shadow-sm outline-none focus:ring-1 transition-all font-medium appearance-none cursor-pointer ${error ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-border hover:border-primary/30 focus:border-primary focus:ring-primary"}`}
            value={value ?? field.options?.[0]?.value}
            onChange={(e) => update({ [field.id]: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground pointer-events-none group-hover/select:text-primary transition-colors" />
        </div>
      ) : field.type === "text" || field.type === "number" ? (
        <input
          type={field.type}
          className={`nodrag w-full bg-background/50 border rounded-md px-2.5 py-1 text-[10px] text-foreground shadow-sm outline-none focus:ring-1 font-mono transition-all placeholder:text-muted-foreground/30 ${error ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-border hover:border-primary/30 focus:border-primary focus:ring-primary"}`}
          value={value ?? ""}
          onChange={(e) => update({ [field.id]: e.target.value })}
          placeholder={field.placeholder}
          onClick={(e) => e.stopPropagation()}
        />
      ) : field.type === "password" || field.type === "textarea" ? (
        <div
          className="w-full bg-muted/20 border border-dashed border-border rounded-md px-2.5 py-1 text-[9px] text-muted-foreground italic text-center cursor-help"
          title="Sensitive or large content - edit in Properties Inspector"
        >
          Edit in Inspector
        </div>
      ) : null}
    </div>
  );
}

function OrphanInput({ nodeId, input }: { nodeId: string; input: NodeInputMeta }) {
  const connections = useNodeConnections({ id: nodeId, handleType: "target", handleId: input.id });
  const isConnected = connections.length > 0;

  return (
    <div className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Handle
            type="target"
            position={Position.Left}
            id={input.id}
            style={{ top: 8, left: -13 }}
            className={getHandleStyle(input.acceptTypes)}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {input.label}
          </span>
          {input.acceptTypes && input.acceptTypes.length > 0 && (
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded">
              ({input.acceptTypes.map(formatAcceptType).join("/")})
            </span>
          )}
        </div>
        {isConnected && <Link2 className="w-3 h-3 text-primary animate-pulse" />}
      </div>
      {isConnected && (
        <div className="w-full bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5 text-[10px] text-primary font-medium italic shadow-inner">
          Value linked to input
        </div>
      )}
    </div>
  );
}
