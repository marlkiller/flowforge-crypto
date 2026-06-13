import { registerNodeDef } from "../registry";
import { safeDecode, getField } from "../utils";
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
import {
  customB64Encode,
  customB64Decode,
  customB32Encode,
  customB32Decode,
  customB58Encode,
  customB58Decode,
  validateAlphabetSize,
  BASE64_ALPHABET,
  BASE32_ALPHABET,
  BASE58_ALPHABET,
  B64_PRESETS,
  B32_PRESETS,
  B58_PRESETS,
} from "../providers/custom-base";
import type { NodeInputMeta } from "../types";

const modeField: NodeInputMeta = {
  id: "mode",
  label: "Mode",
  type: "select",
  options: [
    { label: "Encode", value: "encode" },
    { label: "Decode", value: "decode" },
  ],
  connectable: false,
};

function resolveAlphabet(
  preset: string,
  custom: string,
  presets: Record<string, string>,
  defaultAlphabet: string,
): string {
  if (preset === "__custom__") return custom;
  return presets[preset] || defaultAlphabet;
}

// ─── Base64 ───────────────────────────────────────────────────────

const b64PresetField: NodeInputMeta = {
  id: "alphabetPreset",
  label: "Alphabet",
  type: "select",
  connectable: false,
  defaultValue: "",
  options: [
    { label: "Standard (A-Za-z0-9+/)", value: "" },
    { label: "URL-safe (A-Za-z0-9-_)", value: "url_safe" },
    { label: "GEDCOM (.0-9A-Za-z_)", value: "gedcom" },
    { label: "Custom...", value: "__custom__" },
  ],
  tooltip: "Select a preset alphabet or choose Custom to enter your own",
};

const b64CustomField: NodeInputMeta = {
  id: "alphabetCustom",
  label: "Custom Alphabet",
  type: "text",
  connectable: false,
  placeholder: "64 unique characters...",
  tooltip: "Enter your own 64-character alphabet",
  validate: validateAlphabetSize(64),
  visible: (d) => d["alphabetPreset"] === "__custom__",
};

registerNodeDef("base64", {
  meta: {
    kind: "base64",
    label: "Base64",
    category: "encoding",
    description: "Base64 encode / decode with optional custom alphabet.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      modeField,
      b64PresetField,
      b64CustomField,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const preset = getField(node, "alphabetPreset");
    const alphabet = resolveAlphabet(
      preset,
      getField(node, "alphabetCustom", "").trim(),
      B64_PRESETS,
      BASE64_ALPHABET,
    );
    if (node.data["mode"] === "decode") {
      return safeDecode(
        () =>
          alphabet
            ? customB64Decode(bytesToUtf8(mainInput), alphabet)
            : b64ToBytes(bytesToUtf8(mainInput)),
        "Invalid Base64 input",
      );
    }
    return utf8ToBytes(alphabet ? customB64Encode(mainInput, alphabet) : bytesToB64(mainInput));
  },
});

// ─── Hex ──────────────────────────────────────────────────────────

registerNodeDef("hex", {
  meta: {
    kind: "hex",
    label: "Hex",
    category: "encoding",
    description: "Hex encode / decode.",
    defaultOutput: "utf8",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }, modeField],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    return node.data["mode"] === "decode"
      ? safeDecode(() => hexToBytes(bytesToUtf8(mainInput)), "Invalid Hex input")
      : utf8ToBytes(bytesToHex(mainInput));
  },
});

// ─── URL ──────────────────────────────────────────────────────────

registerNodeDef("url", {
  meta: {
    kind: "url",
    label: "URL",
    category: "encoding",
    description: "URL component encode / decode.",
    defaultOutput: "utf8",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }, modeField],
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

// ─── Base32 ───────────────────────────────────────────────────────

const b32PresetField: NodeInputMeta = {
  id: "alphabetPreset",
  label: "Alphabet",
  type: "select",
  connectable: false,
  defaultValue: "",
  options: [
    { label: "RFC 4648 (A-Z2-7)", value: "" },
    { label: "RFC 4648 hex (0-9A-V)", value: "rfc4648_hex" },
    { label: "Crockford (0-9A-Z excl ILOU)", value: "crockford" },
    { label: "z-base-32", value: "zbase32" },
    { label: "Custom...", value: "__custom__" },
  ],
  tooltip: "Select a preset alphabet or choose Custom to enter your own",
};

const b32CustomField: NodeInputMeta = {
  id: "alphabetCustom",
  label: "Custom Alphabet",
  type: "text",
  connectable: false,
  placeholder: "32 unique characters...",
  tooltip: "Enter your own 32-character alphabet",
  validate: validateAlphabetSize(32),
  visible: (d) => d["alphabetPreset"] === "__custom__",
};

registerNodeDef("base32", {
  meta: {
    kind: "base32",
    label: "Base32",
    category: "encoding",
    description: "Base32 encode / decode with optional custom alphabet.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      modeField,
      b32PresetField,
      b32CustomField,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const alphabet = resolveAlphabet(
      getField(node, "alphabetPreset"),
      getField(node, "alphabetCustom", "").trim(),
      B32_PRESETS,
      BASE32_ALPHABET,
    );
    if (node.data["mode"] === "decode") {
      return safeDecode(
        () =>
          alphabet
            ? customB32Decode(bytesToUtf8(mainInput), alphabet)
            : b32ToBytes(bytesToUtf8(mainInput)),
        "Invalid Base32 input",
      );
    }
    return utf8ToBytes(alphabet ? customB32Encode(mainInput, alphabet) : bytesToB32(mainInput));
  },
});

// ─── Base58 ───────────────────────────────────────────────────────

const b58PresetField: NodeInputMeta = {
  id: "alphabetPreset",
  label: "Alphabet",
  type: "select",
  connectable: false,
  defaultValue: "",
  options: [
    { label: "Bitcoin", value: "" },
    { label: "Flickr", value: "flickr" },
    { label: "Custom...", value: "__custom__" },
  ],
  tooltip: "Select a preset alphabet or choose Custom to enter your own",
};

const b58CustomField: NodeInputMeta = {
  id: "alphabetCustom",
  label: "Custom Alphabet",
  type: "text",
  connectable: false,
  placeholder: "58 unique characters...",
  tooltip: "Enter your own 58-character alphabet",
  validate: validateAlphabetSize(58),
  visible: (d) => d["alphabetPreset"] === "__custom__",
};

registerNodeDef("base58", {
  meta: {
    kind: "base58",
    label: "Base58",
    category: "encoding",
    description: "Base58 encode / decode with optional custom alphabet.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      modeField,
      b58PresetField,
      b58CustomField,
    ],
  },
  runner: (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const alphabet = resolveAlphabet(
      getField(node, "alphabetPreset"),
      getField(node, "alphabetCustom", "").trim(),
      B58_PRESETS,
      BASE58_ALPHABET,
    );
    if (node.data["mode"] === "decode") {
      return safeDecode(
        () =>
          alphabet
            ? customB58Decode(bytesToUtf8(mainInput), alphabet)
            : b58ToBytes(bytesToUtf8(mainInput)),
        "Invalid Base58 input",
      );
    }
    return utf8ToBytes(alphabet ? customB58Encode(mainInput, alphabet) : bytesToB58(mainInput));
  },
});
