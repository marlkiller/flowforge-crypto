import type { NodeDef, NodeKindMeta } from "./types";
import { ioNodes } from "./nodes/io";
import { stringNodes } from "./nodes/string";
import { encodingNodes } from "./nodes/encoding";
import { hashNodes } from "./nodes/hash";
import { cipherNodes } from "./nodes/cipher";
import { rsaNodes } from "./nodes/rsa";
import { macNodes } from "./nodes/mac";
import { kdfNodes } from "./nodes/kdf";
import { eccNodes } from "./nodes/ecc";
import { otpNodes } from "./nodes/otp";
import { jwtNodes } from "./nodes/jwt";
import { entropyNodes } from "./nodes/entropy";
import { legacyNodes } from "./nodes/legacy";
import type { DataFormat } from "./service";

const ALL_NODE_DEFS: Record<string, NodeDef>[] = [
  ioNodes,
  stringNodes,
  encodingNodes,
  hashNodes,
  cipherNodes,
  rsaNodes,
  macNodes,
  kdfNodes,
  eccNodes,
  otpNodes,
  jwtNodes,
  entropyNodes,
  legacyNodes,
];

export const NODE_REGISTRY: Record<string, NodeDef> = ALL_NODE_DEFS.reduce(
  (acc, defs) => ({ ...acc, ...defs }),
  {},
);

export type KnownNodeKind = keyof typeof NODE_REGISTRY;

export const NODE_KIND_META: Record<string, NodeKindMeta> = Object.fromEntries(
  Object.entries(NODE_REGISTRY).map(([k, v]) => [k, v.meta]),
);

export type CategoryMeta = {
  label: string;
  accent: string;
  chip: string;
  dot: string;
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  io: {
    label: "I/O",
    accent: "text-sky-300",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    dot: "bg-sky-400",
  },
  string: {
    label: "String",
    accent: "text-purple-300",
    chip: "bg-purple-500/15 text-purple-300 border-purple-500/40",
    dot: "bg-purple-400",
  },
  encoding: {
    label: "Encoding",
    accent: "text-amber-300",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    dot: "bg-amber-400",
  },
  hash: {
    label: "Hash",
    accent: "text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    dot: "bg-emerald-400",
  },
  cipher: {
    label: "Symmetric",
    accent: "text-rose-300",
    chip: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    dot: "bg-rose-400",
  },
  asymmetric: {
    label: "Asymmetric",
    accent: "text-indigo-300",
    chip: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
    dot: "bg-indigo-400",
  },
  mac: {
    label: "MAC",
    accent: "text-cyan-300",
    chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    dot: "bg-cyan-400",
  },
  kdf: {
    label: "KDF",
    accent: "text-orange-300",
    chip: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    dot: "bg-orange-400",
  },
  entropy: {
    label: "Entropy",
    accent: "text-lime-300",
    chip: "bg-lime-500/15 text-lime-300 border-lime-500/40",
    dot: "bg-lime-400",
  },
  protocol: {
    label: "Protocol",
    accent: "text-blue-300",
    chip: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    dot: "bg-blue-400",
  },
  legacy: {
    label: "Legacy",
    accent: "text-zinc-400",
    chip: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
    dot: "bg-zinc-400",
  },
};

export function getActiveCategories(): string[] {
  const cats = new Set(Object.values(NODE_REGISTRY).map((n) => n.meta.category));
  return Array.from(cats);
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
