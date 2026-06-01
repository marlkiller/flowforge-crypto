import { registerNodeDef } from "../registry";
import { utf8ToBytes, bytesToUtf8 } from "../service";

registerNodeDef("uppercase", {
  meta: {
    kind: "uppercase",
    label: "Upper Case",
    category: "data",
    description: "UTF-8 text → uppercase.",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) =>
    utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).toUpperCase()),
});

registerNodeDef("lowercase", {
  meta: {
    kind: "lowercase",
    label: "Lower Case",
    category: "data",
    description: "UTF-8 text → lowercase.",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) =>
    utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).toLowerCase()),
});

registerNodeDef("reverse", {
  meta: {
    kind: "reverse",
    label: "Reverse",
    category: "data",
    description: "Reverse UTF-8 string.",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) =>
    utf8ToBytes([...bytesToUtf8(inputs["data"] ?? new Uint8Array(0))].reverse().join("")),
});

registerNodeDef("trim", {
  meta: {
    kind: "trim",
    label: "Trim",
    category: "data",
    description: "Trim leading/trailing whitespace.",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) => utf8ToBytes(bytesToUtf8(inputs["data"] ?? new Uint8Array(0)).trim()),
});

registerNodeDef("length", {
  meta: {
    kind: "length",
    label: "Length",
    category: "data",
    description: "Emit decimal byte length.",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) => utf8ToBytes(String((inputs["data"] ?? new Uint8Array(0)).byteLength)),
});
