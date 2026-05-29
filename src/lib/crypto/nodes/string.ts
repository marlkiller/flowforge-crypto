import type { NodeDef } from "../types";
import { utf8ToBytes, bytesToUtf8 } from "../service";

export const stringNodes: Record<string, NodeDef> = {
  uppercase: {
    meta: {
      kind: "uppercase",
      label: "Upper Case",
      category: "string",
      description: "UTF-8 text → uppercase.",
    },
    runner: (_, inputs) =>
      utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).toUpperCase()),
  },
  lowercase: {
    meta: {
      kind: "lowercase",
      label: "Lower Case",
      category: "string",
      description: "UTF-8 text → lowercase.",
    },
    runner: (_, inputs) =>
      utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).toLowerCase()),
  },
  reverse: {
    meta: {
      kind: "reverse",
      label: "Reverse",
      category: "string",
      description: "Reverse UTF-8 string.",
    },
    runner: (_, inputs) =>
      utf8ToBytes([...bytesToUtf8(inputs["data"] ?? new Uint8Array(0))].reverse().join("")),
  },
  trim: {
    meta: {
      kind: "trim",
      label: "Trim",
      category: "string",
      description: "Trim leading/trailing whitespace.",
    },
    runner: (_, inputs) => utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).trim()),
  },
  length: {
    meta: {
      kind: "length",
      label: "Length",
      category: "string",
      description: "Emit decimal byte length.",
    },
    runner: (_, inputs) => utf8ToBytes(String((inputs["data"] ?? new Uint8Array(0)).byteLength)),
  },
};
