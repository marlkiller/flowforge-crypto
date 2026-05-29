import type { NodeDef } from "../types";
import { parseAs } from "../utils";
import { utf8ToBytes, type DataFormat } from "../service";

export const ioNodes: Record<string, NodeDef> = {
  input: {
    meta: {
      kind: "input",
      label: "Input",
      category: "io",
      description: "Source — parses text as UTF-8 / HEX / Base64.",
      fields: [
        {
          id: "inputFormat",
          label: "Interpret as",
          type: "select",
          options: [
            { label: "UTF-8", value: "utf8" },
            { label: "Hex", value: "hex" },
            { label: "Base64", value: "base64" },
          ],
        },
        { id: "text", label: "Value", type: "textarea", placeholder: "Enter input..." },
      ],
    },
    runner: (node) => {
      const fmt: DataFormat = (node.data["inputFormat"] as DataFormat) ?? "utf8";
      try {
        return parseAs((node.data["text"] as string) ?? "", fmt);
      } catch (e) {
        throw new Error(`Input (${fmt}): ${(e as Error).message}`);
      }
    },
  },
  file: {
    meta: {
      kind: "file",
      label: "File",
      category: "io",
      description: "Source — reads bytes from a local file.",
    },
    runner: (node) => {
      const fileBytes = node.data["fileBytes"] as Uint8Array | undefined;
      if (!fileBytes) throw new Error("No file selected");
      return fileBytes;
    },
  },
  join: {
    meta: {
      kind: "join",
      label: "Join",
      category: "io",
      description: "Concatenate multiple inputs with a separator.",
      fields: [
        { id: "count", label: "Inputs", type: "number", placeholder: "2", defaultValue: "2" },
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
        },
      ],
      inputs: [], // To be populated dynamically
    },
    runner: (node, inputs) => {
      const count = parseInt((node.data["count"] as string) || "2", 10);
      const sepType = (node.data["separator"] as string) || "newline";
      
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
  },
  output: {
    meta: {
      kind: "output",
      label: "Output",
      category: "io",
      description: "Sink — displays bytes in chosen format.",
    },
    runner: (_, inputs) => inputs["data"] ?? inputs["default"] ?? new Uint8Array(0),
  },
};
