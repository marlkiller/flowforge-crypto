import type { NodeCategory, NodeDef, NodeKindMeta } from "./types";
import type { DataFormat } from "./service";

// ─── Live Registry ─────────────────────────────────────────────

const _registry: Record<string, NodeDef> = {};
const _kindMeta: Record<string, NodeKindMeta> = {};
const _loaders: Record<string, () => Promise<unknown>> = {};
const _loadingPromises: Record<string, Promise<void>> = {};

export const NODE_REGISTRY: Record<string, NodeDef> = _registry;
export const NODE_KIND_META: Record<string, NodeKindMeta> = _kindMeta;

export function registerNodeDef(kind: string, def: NodeDef) {
  _registry[kind] = def;
  _kindMeta[kind] = def.meta;
}

export function registerLazyNode(kind: string, meta: NodeKindMeta, loader: () => Promise<unknown>) {
  _kindMeta[kind] = meta;
  _loaders[kind] = loader;
}

export async function loadNodeDef(kind: string): Promise<NodeDef> {
  if (_registry[kind]) return _registry[kind];

  if (kind in _loadingPromises) {
    await _loadingPromises[kind];
    return _registry[kind];
  }

  const loader = _loaders[kind];
  if (!loader) throw new Error(`Unknown node kind: "${kind}"`);

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Loading implementation for "${kind}" timed out (5s)`)),
      5000,
    ),
  );

  _loadingPromises[kind] = Promise.race([loader() as Promise<void>, timeoutPromise]).finally(() => {
    delete _loadingPromises[kind];
  });

  await _loadingPromises[kind];
  return _registry[kind];
}

/**
 * Loads an external node definition from a URL.
 * The module should call registerNodeDef or export a NodeDef.
 */
export async function loadExternalNode(url: string): Promise<void> {
  const module = await import(/* @vite-ignore */ url);
  const def = module.nodeDef || module.default;

  if (def && def.meta && def.runner) {
    registerNodeDef(def.meta.kind, def);
  }
}

// ─── Convenience ───────────────────────────────────────────────

export type KnownNodeKind = string;

export type CategoryMeta = {
  label: string;
  icon: string;
  accent: string;
  chip: string;
  dot: string;
  color: string;
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  io: {
    label: "I/O",
    icon: "Terminal",
    accent: "text-sky-300",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    dot: "bg-sky-400",
    color: "var(--color-cat-io)",
  },
  data: {
    label: "Text/Data",
    icon: "Type",
    accent: "text-purple-300",
    chip: "bg-purple-500/15 text-purple-300 border-purple-500/40",
    dot: "bg-purple-400",
    color: "var(--color-cat-data)",
  },
  encoding: {
    label: "Encoding",
    icon: "RefreshCw",
    accent: "text-amber-300",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    dot: "bg-amber-400",
    color: "var(--color-cat-encoding)",
  },
  format: {
    label: "Key Formats",
    icon: "Braces",
    accent: "text-orange-400",
    chip: "bg-orange-500/15 text-orange-400 border-orange-500/40",
    dot: "bg-orange-500",
    color: "var(--color-cat-format)",
  },
  checksum: {
    label: "Checksums",
    icon: "Hash",
    accent: "text-yellow-300",
    chip: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
    dot: "bg-yellow-400",
    color: "var(--color-cat-checksum)",
  },
  hash: {
    label: "Hash",
    icon: "Hash",
    accent: "text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    dot: "bg-emerald-400",
    color: "var(--color-cat-hash)",
  },
  cipher: {
    label: "Symmetric",
    icon: "Lock",
    accent: "text-rose-300",
    chip: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    dot: "bg-rose-400",
    color: "var(--color-cat-cipher)",
  },
  asymmetric: {
    label: "Asymmetric",
    icon: "FileKey",
    accent: "text-indigo-300",
    chip: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
    dot: "bg-indigo-400",
    color: "var(--color-cat-asymmetric)",
  },
  signature: {
    label: "Signatures",
    icon: "PenTool",
    accent: "text-violet-300",
    chip: "bg-violet-500/15 text-violet-300 border-violet-500/40",
    dot: "bg-violet-400",
    color: "var(--color-cat-signature)",
  },
  "key-exchange": {
    label: "Key Exchange",
    icon: "ArrowRightLeft",
    accent: "text-fuchsia-300",
    chip: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
    dot: "bg-fuchsia-400",
    color: "var(--color-cat-key-exchange)",
  },
  mac: {
    label: "MAC",
    icon: "ShieldCheck",
    accent: "text-cyan-300",
    chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    dot: "bg-cyan-400",
    color: "var(--color-cat-mac)",
  },
  kdf: {
    label: "KDF",
    icon: "Wand",
    accent: "text-orange-300",
    chip: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    dot: "bg-orange-400",
    color: "var(--color-cat-kdf)",
  },
  entropy: {
    label: "Entropy",
    icon: "Shuffle",
    accent: "text-lime-300",
    chip: "bg-lime-500/15 text-lime-300 border-lime-500/40",
    dot: "bg-lime-400",
    color: "var(--color-cat-entropy)",
  },
  protocol: {
    label: "Protocol",
    icon: "Globe",
    accent: "text-blue-300",
    chip: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    dot: "bg-blue-400",
    color: "var(--color-cat-protocol)",
  },
  "secret-sharing": {
    label: "Secret Sharing",
    icon: "Split",
    accent: "text-slate-300",
    chip: "bg-slate-500/15 text-slate-300 border-slate-500/40",
    dot: "bg-slate-400",
    color: "var(--color-cat-secret-sharing)",
  },
  certificate: {
    label: "Certificates",
    icon: "BadgeCheck",
    accent: "text-green-300",
    chip: "bg-green-500/15 text-green-300 border-green-500/40",
    dot: "bg-green-400",
    color: "var(--color-cat-certificate)",
  },
  pqc: {
    label: "Post-Quantum",
    icon: "Atom",
    accent: "text-pink-300",
    chip: "bg-pink-500/15 text-pink-300 border-pink-500/40",
    dot: "bg-pink-400",
    color: "var(--color-cat-pqc)",
  },
  analysis: {
    label: "Analysis",
    icon: "Search",
    accent: "text-teal-300",
    chip: "bg-teal-500/15 text-teal-300 border-teal-500/40",
    dot: "bg-teal-400",
    color: "var(--color-cat-analysis)",
  },
  ui: {
    label: "UI",
    icon: "MousePointer2",
    accent: "text-zinc-300",
    chip: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
    dot: "bg-zinc-400",
    color: "var(--color-cat-ui)",
  },
};

export const SECURITY_META: Record<
  NonNullable<NodeKindMeta["security"]>,
  { label: string; className: string; title: string }
> = {
  caution: {
    label: "Caution",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    title: "Use with care; review parameters before production use.",
  },
  deprecated: {
    label: "Deprecated",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    title: "Deprecated for modern security-sensitive use.",
  },
  insecure: {
    label: "Weak",
    className: "border-destructive/50 bg-destructive/10 text-destructive",
    title: "Cryptographically weak or unsafe for production security.",
  },
};

export function getActiveCategories(): string[] {
  const cats = new Set(Object.values(NODE_KIND_META).map((m) => m.category));
  const order: NodeCategory[] = [
    "io",
    "ui",
    "data",
    "encoding",
    "format",
    "checksum",
    "hash",
    "cipher",
    "asymmetric",
    "signature",
    "key-exchange",
    "mac",
    "kdf",
    "protocol",
    "secret-sharing",
    "certificate",
    "entropy",
    "analysis",
    "pqc",
  ];
  const sorted = order.filter((c) => cats.has(c));
  const others = Array.from(cats).filter((c) => !order.includes(c));
  return [...sorted, ...others];
}

export function defaultOutputFormat(kind: string): DataFormat {
  return NODE_KIND_META[kind]?.defaultOutput ?? "utf8";
}

export const GLOBAL_FORMATS: DataFormat[] = ["utf8", "hex", "base64"];

export function getSupportedFormats(kind: string): DataFormat[] {
  const meta = NODE_KIND_META[kind];
  if (meta?.supportedFormats && meta.supportedFormats.length > 0) {
    return meta.supportedFormats;
  }
  return GLOBAL_FORMATS;
}
