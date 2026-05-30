import { registerNodeDef } from "../registry";
import { safeDecode } from "../utils";
import {
  utf8ToBytes,
  bytesToUtf8,
  b64ToBytes,
  bytesToB64,
  hexToBytes,
  bytesToHex,
  bytesToB32,
  b32ToBytes,
  bytesToB58,
  b58ToBytes,
} from "../service";
import type { NodeInputMeta } from "../types";

const baseEncodingFields: NodeInputMeta[] = [
  {
    id: "mode",
    label: "Mode",
    type: "select",
    options: [
      { label: "Encode", value: "encode" },
      { label: "Decode", value: "decode" },
    ],
    connectable: false,
  },
];

registerNodeDef("base64", {
  meta: {
    kind: "base64",
    label: "Base64",
    category: "encoding",
    description: "Base64 encode / decode.",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      ...baseEncodingFields,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    return node.data["mode"] === "decode"
      ? safeDecode(() => b64ToBytes(bytesToUtf8(mainInput)), "Invalid Base64 input")
      : utf8ToBytes(bytesToB64(mainInput));
  },
});

registerNodeDef("hex", {
  meta: {
    kind: "hex",
    label: "Hex",
    category: "encoding",
    description: "Hex encode / decode.",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      ...baseEncodingFields,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    return node.data["mode"] === "decode"
      ? safeDecode(() => hexToBytes(bytesToUtf8(mainInput)), "Invalid Hex input")
      : utf8ToBytes(bytesToHex(mainInput));
  },
});

registerNodeDef("url", {
  meta: {
    kind: "url",
    label: "URL",
    category: "encoding",
    description: "URL component encode / decode.",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      ...baseEncodingFields,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    return node.data["mode"] === "decode"
      ? safeDecode(
          () => utf8ToBytes(decodeURIComponent(bytesToUtf8(mainInput))),
          "Invalid URL-encoded input",
        )
      : utf8ToBytes(encodeURIComponent(bytesToUtf8(mainInput)));
  },
});

registerNodeDef("base32", {
  meta: {
    kind: "base32",
    label: "Base32",
    category: "encoding",
    description: "Base32 encode / decode (RFC 4648).",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      ...baseEncodingFields,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    return node.data["mode"] === "decode"
      ? safeDecode(() => b32ToBytes(bytesToUtf8(mainInput)), "Invalid Base32 input")
      : utf8ToBytes(bytesToB32(mainInput));
  },
});

registerNodeDef("base58", {
  meta: {
    kind: "base58",
    label: "Base58",
    category: "encoding",
    description: "Base58 encode / decode (Bitcoin alphabet).",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      ...baseEncodingFields,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    return node.data["mode"] === "decode"
      ? safeDecode(() => b58ToBytes(bytesToUtf8(mainInput)), "Invalid Base58 input")
      : utf8ToBytes(bytesToB58(mainInput));
  },
});
