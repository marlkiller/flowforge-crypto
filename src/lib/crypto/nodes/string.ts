import { registerNodeDef } from "../registry";
import { utf8ToBytes, bytesToUtf8 } from "../service";

registerNodeDef("uppercase", {
  meta: {
    kind: "uppercase",
    label: "Upper Case",
    category: "string",
    description: "UTF-8 text → uppercase.",
  },
  runner: (_, inputs) =>
    utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).toUpperCase()),
});

registerNodeDef("lowercase", {
  meta: {
    kind: "lowercase",
    label: "Lower Case",
    category: "string",
    description: "UTF-8 text → lowercase.",
  },
  runner: (_, inputs) =>
    utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).toLowerCase()),
});

registerNodeDef("reverse", {
  meta: {
    kind: "reverse",
    label: "Reverse",
    category: "string",
    description: "Reverse UTF-8 string.",
  },
  runner: (_, inputs) =>
    utf8ToBytes([...bytesToUtf8(inputs["data"] ?? new Uint8Array(0))].reverse().join("")),
});

registerNodeDef("trim", {
  meta: {
    kind: "trim",
    label: "Trim",
    category: "string",
    description: "Trim leading/trailing whitespace.",
  },
  runner: (_, inputs) => utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).trim()),
});

registerNodeDef("length", {
  meta: {
    kind: "length",
    label: "Length",
    category: "string",
    description: "Emit decimal byte length.",
  },
  runner: (_, inputs) => utf8ToBytes(String((inputs["data"] ?? new Uint8Array(0)).byteLength)),
});
