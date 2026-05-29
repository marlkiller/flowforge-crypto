import { registerNodeDef } from "../registry";
import { utf8ToBytes } from "../service";
import { getField, getNumberField } from "../utils";

registerNodeDef("xor", {
  meta: {
    kind: "xor",
    label: "XOR",
    category: "string",
    description: "Byte-wise XOR of two inputs.",
    defaultOutput: "hex",
    inputs: [
      { id: "a", label: "Input A" },
      { id: "b", label: "Input B" },
    ],
  },
  runner: (_, inputs) => {
    const a = inputs["a"] ?? new Uint8Array(0);
    const b = inputs["b"] ?? new Uint8Array(0);
    const len = Math.max(a.length, b.length);
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return out;
  },
});

registerNodeDef("constantTimeCompare", {
  meta: {
    kind: "constantTimeCompare",
    label: "Const-Time Compare",
    category: "string",
    description: "Timing-safe byte comparison. Outputs 'Match' or 'No Match'.",
    defaultOutput: "utf8",
    inputs: [
      { id: "a", label: "Input A" },
      { id: "b", label: "Input B" },
    ],
  },
  runner: (_, inputs) => {
    const a = inputs["a"] ?? new Uint8Array(0);
    const b = inputs["b"] ?? new Uint8Array(0);
    if (a.length !== b.length) return utf8ToBytes("No Match");
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
    return utf8ToBytes(result === 0 ? "Match" : "No Match");
  },
});

registerNodeDef("keyGen", {
  meta: {
    kind: "keyGen",
    label: "Symmetric Key Gen",
    category: "entropy",
    description: "Generate a cryptographically strong symmetric key of specified size.",
    defaultOutput: "hex",
    fields: [
      {
        id: "algorithm",
        label: "Algorithm",
        type: "select",
        defaultValue: "AES-128",
        options: [
          { label: "AES-128 (16 bytes)", value: "aes128" },
          { label: "AES-192 (24 bytes)", value: "aes192" },
          { label: "AES-256 (32 bytes)", value: "aes256" },
          { label: "ChaCha20 (32 bytes)", value: "chacha20" },
          { label: "HMAC-SHA256 (32 bytes)", value: "hmac256" },
          { label: "HMAC-SHA512 (64 bytes)", value: "hmac512" },
          { label: "Custom", value: "custom" },
        ],
      },
      {
        id: "customLength",
        label: "Length (bytes)",
        type: "number",
        defaultValue: 32,
        visible: (d) => (d["algorithm"] as string) === "custom",
      },
    ],
  },
  runner: (node) => {
    const algo = getField(node, "algorithm", "aes128");
    const lengths: Record<string, number> = {
      aes128: 16,
      aes192: 24,
      aes256: 32,
      chacha20: 32,
      hmac256: 32,
      hmac512: 64,
    };
    const len =
      algo === "custom"
        ? getNumberField(node, "customLength", 32)
        : (lengths[algo] ?? 16);
    if (len < 1) throw new Error("Key length must be positive");
    return crypto.getRandomValues(new Uint8Array(len));
  },
});
