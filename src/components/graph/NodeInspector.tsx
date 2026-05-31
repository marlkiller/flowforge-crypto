import { useNodeConnections } from "@xyflow/react";
import { graphStore } from "./store";
import { NODE_KIND_META, CATEGORY_META, getSupportedFormats } from "@/lib/crypto/registry";
import type { GraphNode, NodeInputMeta } from "@/lib/crypto/types";
import type { DataFormat } from "@/lib/crypto/service";
import { Trash2, File, Upload, Link2, Settings2 } from "lucide-react";

interface Props {
  node: GraphNode | null;
}

export function NodeInspector({ node }: Props) {
  if (!node) {
    return (
      <aside className="h-full w-full rounded-xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
          <Settings2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Properties Inspector</h3>
        <p className="text-sm text-muted-foreground">
          Select a node on the canvas to configure its properties and view output.
        </p>
      </aside>
    );
  }

  const d = node.data;
  const meta = NODE_KIND_META[d.kind];
  if (!meta) {
    return (
      <aside className="h-full w-full rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-lg font-bold text-destructive mb-2">Unknown Node</h3>
        <p className="text-sm text-muted-foreground">
          Kind: "{d.kind}" — this node type is no longer registered.
        </p>
      </aside>
    );
  }
  const cat = CATEGORY_META[meta.category] ?? {
    label: meta.category,
    accent: "text-muted-foreground",
    chip: "bg-muted/50 text-muted-foreground border-border/50",
    dot: "bg-muted-foreground",
  };
  const update = (patch: Record<string, unknown>) => graphStore.updateNodeData(node.id, patch);

  const remove = () => graphStore.removeNode(node.id);

  return (
    <aside className="h-full w-full rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-background shadow-sm ${cat.chip}`}
          >
            {cat.label}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={remove}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete node"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <input
          className="w-full bg-transparent text-base font-bold text-foreground outline-none border-b border-transparent focus:border-primary transition-colors -ml-1 px-1"
          value={d.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Node name"
        />
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="px-1.5 py-0.5 rounded bg-background border border-border text-[9px] text-muted-foreground font-mono">
            {meta.label}
          </div>
          <div className="px-1.5 py-0.5 rounded bg-background border border-border text-[9px] text-muted-foreground font-mono">
            ID: {node.id}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto custom-scrollbar">
        {d.kind === "file" && (
          <Section title="File Source">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background shadow-sm text-foreground">
                <File className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-medium truncate">
                  {(d["fileName"] as string) || "No file selected"}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                id="inspector-file-input"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    update({
                      fileName: file.name,
                      fileBytes: new Uint8Array(reader.result as ArrayBuffer),
                    });
                  };
                  reader.readAsArrayBuffer(file);
                }}
              />
              <label
                htmlFor="inspector-file-input"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted hover:bg-accent text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                Select Different File
              </label>
            </div>
          </Section>
        )}

        {(meta.inputs ?? [])
          .filter((input) => input.type != null && (input.visible?.(d) ?? true))
          .map((input) => (
            <InspectorField
              key={input.id}
              nodeId={node.id}
              field={input}
              value={d[input.id] as string | undefined}
              update={update}
            />
          ))}
        {meta.category !== "ui" && (
          <>
            <Section title="Output Format">
              <FormatPicker
                value={d.outputFormat ?? "utf8"}
                onChange={(v) => update({ outputFormat: v })}
                formats={getSupportedFormats(d.kind)}
              />
            </Section>

            <Section title="Live Output">
              {typeof d.outputBytesLen === "number" && (
                <div className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Size</span>
                  <span className="text-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                    {d.outputBytesLen} bytes
                  </span>
                </div>
              )}
              {d.error ? (
                <pre className="mt-1 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive p-2.5 break-all whitespace-pre-wrap font-mono text-[11px] shadow-inner leading-relaxed">
                  {d.error}
                </pre>
              ) : (
                <pre className="mt-1 rounded-lg bg-background border border-border text-foreground p-2.5 break-all whitespace-pre-wrap font-mono text-[11px] min-h-[80px] max-h-80 overflow-auto shadow-inner custom-scrollbar leading-relaxed">
                  {d.output || (
                    <span className="text-muted-foreground italic">Pipeline waiting to run...</span>
                  )}
                </pre>
              )}
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}

function InspectorField({
  nodeId,
  field,
  value,
  update,
}: {
  nodeId: string;
  field: NodeInputMeta;
  value: string | undefined;
  update: (patch: Record<string, unknown>) => void;
}) {
  const connections = useNodeConnections({ id: nodeId, handleType: "target", handleId: field.id });
  const isConnected = connections.length > 0;

  return (
    <Section title={field.label}>
      <div className="space-y-1.5">
        {isConnected ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
              <Link2 className="w-3.5 h-3.5" />
              Connected
            </div>
            <div className="w-full bg-background/50 border border-border rounded-lg px-2.5 py-2 text-[11px] text-muted-foreground italic text-center shadow-inner">
              Disconnect to edit manually.
            </div>
          </div>
        ) : (
          <div>
            {field.type === "textarea" ? (
              <textarea
                className="w-full min-h-[90px] rounded-lg bg-background border border-border p-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y font-mono shadow-sm custom-scrollbar transition-all"
                value={value ?? ""}
                onChange={(e) => update({ [field.id]: e.target.value })}
                placeholder={field.placeholder}
              />
            ) : field.type === "select" ? (
              <div className="relative">
                <select
                  className="w-full rounded-lg bg-background border border-border px-2.5 py-2 text-xs text-foreground font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm appearance-none cursor-pointer transition-all"
                  value={value ?? field.options?.[0]?.value ?? ""}
                  onChange={(e) => update({ [field.id]: e.target.value })}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  ▼
                </div>
              </div>
            ) : (
              <input
                type={field.type}
                className="w-full rounded-lg bg-background border border-border px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono shadow-sm transition-all"
                value={value ?? ""}
                onChange={(e) => update({ [field.id]: e.target.value })}
                placeholder={field.placeholder}
              />
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="h-px bg-border flex-1" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
          {title}
        </span>
        <div className="h-px bg-border flex-1" />
      </div>
      {children}
    </div>
  );
}

function FormatPicker({
  value,
  onChange,
  formats,
}: {
  value: DataFormat;
  onChange: (v: DataFormat) => void;
  formats: DataFormat[];
}) {
  return (
    <div className="flex rounded-lg border border-border p-0.5 bg-background shadow-sm">
      {formats.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`flex-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
            value === f
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
