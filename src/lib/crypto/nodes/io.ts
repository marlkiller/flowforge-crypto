import { registerNodeDef } from "../registry";
import { getField, getNumberField, parseAs } from "../utils";
import { utf8ToBytes, bytesToUtf8 } from "../service";
import type { DataFormat } from "../service";

registerNodeDef("input", {
  meta: {
    kind: "input",
    label: "Input",
    category: "io",
    description: "Source — parses text as UTF-8 / HEX / Base64 / Bool.",
    defaultOutput: "utf8",
    supportedFormats: ["utf8", "hex", "base64", "bool"],
    inputs: [
      {
        id: "inputFormat",
        label: "Interpret as",
        type: "select",
        options: [
          { label: "UTF-8", value: "utf8" },
          { label: "Hex", value: "hex" },
          { label: "Base64", value: "base64" },
          { label: "Bool", value: "bool" },
        ],
        connectable: false,
      },
      {
        id: "text",
        label: "Value",
        type: "textarea",
        placeholder: "Enter input...",
        connectable: false,
      },
    ],
  },
  runner: (node) => {
    const fmt: DataFormat = (node.data["inputFormat"] as DataFormat) ?? "utf8";
    try {
      return parseAs(getField(node, "text"), fmt);
    } catch (e) {
      throw new Error(`Input (${fmt}): ${(e as Error).message}`);
    }
  },
});

registerNodeDef("file", {
  meta: {
    kind: "file",
    label: "File",
    category: "io",
    description: "Source — reads bytes from a local file.",
    defaultOutput: "hex",
  },
  runner: (node) => {
    const fileBytes = node.data["fileBytes"] as Uint8Array | undefined;
    if (!fileBytes) throw new Error("No file selected");
    return fileBytes;
  },
});

registerNodeDef("join", {
  meta: {
    kind: "join",
    label: "Join",
    category: "io",
    description: "Concatenate multiple inputs with a separator.",
    defaultOutput: "hex",
    inputs: [
      {
        id: "count",
        label: "Inputs",
        type: "number",
        placeholder: "2",
        defaultValue: "2",
        connectable: false,
      },
      {
        id: "separator",
        label: "Separator",
        type: "select",
        options: [
          { label: "Newline (\\n)", value: "newline" },
          { label: "Space", value: "space" },
          { label: "Comma (,)", value: "comma" },
          { label: "None", value: "none" },
        ],
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const count = getNumberField(node, "count", 2);
    const sepType = getField(node, "separator", "newline");

    let sep = "";
    if (sepType === "newline") sep = "\n";
    else if (sepType === "space") sep = " ";
    else if (sepType === "comma") sep = ",";

    const sepBytes = utf8ToBytes(sep);
    const parts: Uint8Array[] = [];

    for (let i = 1; i <= count; i++) {
      const val = inputs[`in_${i}`];
      if (val) {
        if (parts.length > 0 && sepBytes.length > 0) {
          parts.push(sepBytes);
        }
        parts.push(val);
      }
    }

    const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
    const res = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
      res.set(p, offset);
      offset += p.length;
    }
    return res;
  },
});

registerNodeDef("output", {
  meta: {
    kind: "output",
    label: "Output",
    category: "io",
    description: "Sink — displays bytes in chosen format.",
    defaultOutput: "utf8",
    supportedFormats: ["utf8", "hex", "base64", "bool"],
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) => inputs["data"] ?? inputs["default"] ?? new Uint8Array(0),
});

registerNodeDef("slice", {
  meta: {
    kind: "slice",
    label: "Slice",
    category: "io",
    description: "Extract a range of bytes (supports negative indices).",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "start", label: "Start Offset", type: "number", defaultValue: 0, connectable: false },
      {
        id: "end",
        label: "End Offset",
        type: "number",
        placeholder: "Optional (e.g. -32)",
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const data = inputs["data"] || new Uint8Array(0);
    const start = getNumberField(node, "start", 0);
    const endVal = node.data["end"];
    const endStr = endVal !== undefined ? String(endVal) : undefined;

    if (endStr === undefined || endStr.trim() === "") {
      return data.slice(start);
    }
    const end = parseInt(endStr, 10);
    return data.slice(start, end);
  },
});

registerNodeDef("template", {
  meta: {
    kind: "template",
    label: "Template",
    category: "io",
    description: "Format a string by replacing {in_1}, {in_2}, ... with wired inputs.",
    defaultOutput: "utf8",
    inputs: [
      { id: "template", label: "Template", type: "textarea", defaultValue: "", connectable: false },
      { id: "count", label: "Inputs", type: "number", defaultValue: 2, connectable: false },
    ],
  },
  runner: (node, inputs) => {
    const template = getField(node, "template", "");
    const count = getNumberField(node, "count", 2);
    let result = template;
    for (let i = 1; i <= count; i++) {
      const key = `in_${i}`;
      const val = inputs[key];
      if (val && val instanceof Uint8Array && val.length > 0) {
        result = result.replace(new RegExp(`\\{${key}\\}`, "g"), bytesToUtf8(val));
      }
    }
    return utf8ToBytes(result);
  },
});

registerNodeDef("timestamp", {
  meta: {
    kind: "timestamp",
    label: "Timestamp",
    category: "io",
    description: "Generate current timestamp as ISO 8601 string or Unix epoch seconds.",
    defaultOutput: "utf8",
    inputs: [
      {
        id: "format",
        label: "Format",
        type: "select",
        defaultValue: "iso",
        options: [
          { label: "ISO 8601", value: "iso" },
          { label: "Unix Seconds", value: "unix" },
          { label: "Unix Milliseconds", value: "unixMs" },
        ],
        connectable: false,
      },
    ],
  },
  runner: (node) => {
    const format = getField(node, "format", "iso");
    const now = Date.now();
    switch (format) {
      case "unix":
        return utf8ToBytes(String(Math.floor(now / 1000)));
      case "unixMs":
        return utf8ToBytes(String(now));
      case "iso":
      default:
        return utf8ToBytes(new Date(now).toISOString());
    }
  },
});
