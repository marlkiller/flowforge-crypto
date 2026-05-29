import type { NodeDef, GraphNode } from "../types";
import { getProvider, type MacProvider, utf8ToBytes } from "../service";
import { getParamBytes } from "../utils";

const HMAC_HASHES: { label: string; value: string; group: string }[] = [
  { label: "SHA-0",         value: "SHA-0",       group: "Legacy" },
  { label: "SHA-1",         value: "SHA-1",       group: "SHA-2" },
  { label: "SHA-224",       value: "SHA-224",     group: "SHA-2" },
  { label: "SHA-256",       value: "SHA-256",     group: "SHA-2" },
  { label: "SHA-384",       value: "SHA-384",     group: "SHA-2" },
  { label: "SHA-512",       value: "SHA-512",     group: "SHA-2" },
  { label: "SHA-512/224",   value: "SHA-512/224", group: "SHA-2" },
  { label: "SHA-512/256",   value: "SHA-512/256", group: "SHA-2" },
  { label: "SHA3-224",      value: "SHA3-224",    group: "SHA-3" },
  { label: "SHA3-256",      value: "SHA3-256",    group: "SHA-3" },
  { label: "SHA3-384",      value: "SHA3-384",    group: "SHA-3" },
  { label: "SHA3-512",      value: "SHA3-512",    group: "SHA-3" },
  { label: "Keccak-224",    value: "Keccak-224",  group: "Keccak" },
  { label: "Keccak-256",    value: "Keccak-256",  group: "Keccak" },
  { label: "Keccak-384",    value: "Keccak-384",  group: "Keccak" },
  { label: "Keccak-512",    value: "Keccak-512",  group: "Keccak" },
  { label: "BLAKE-224",     value: "BLAKE-224",   group: "BLAKE" },
  { label: "BLAKE-256",     value: "BLAKE-256",   group: "BLAKE" },
  { label: "BLAKE-384",     value: "BLAKE-384",   group: "BLAKE" },
  { label: "BLAKE-512",     value: "BLAKE-512",   group: "BLAKE" },
  { label: "BLAKE2b",       value: "BLAKE2b",     group: "BLAKE2" },
  { label: "BLAKE2s",       value: "BLAKE2s",     group: "BLAKE2" },
  { label: "BLAKE3",        value: "BLAKE3",      group: "BLAKE3" },
  { label: "MD5",           value: "MD5",         group: "Legacy" },
  { label: "RIPEMD-160",    value: "RIPEMD-160",  group: "Legacy" },
  { label: "SHAKE128",      value: "SHAKE128",    group: "SHAKE" },
  { label: "SHAKE256",      value: "SHAKE256",    group: "SHAKE" },
  { label: "SM3",           value: "SM3",         group: "SM" },
  { label: "Whirlpool",     value: "Whirlpool",   group: "Whirlpool" },
  { label: "Whirlpool-0",   value: "Whirlpool-0", group: "Whirlpool" },
  { label: "Whirlpool-T",   value: "Whirlpool-T", group: "Whirlpool" },
];

function makeMacNode(
  algo: string,
  kind: string,
  label: string,
  description: string,
  keyLabel = "Key",
): NodeDef {
  return {
    meta: {
      kind,
      label,
      category: "mac",
      description,
      defaultOutput: "hex",
      inputs: [
        { id: "data", label: "Data" },
        { id: "key", label: keyLabel },
        { id: "signature", label: "Signature" },
      ],
      fields: [
        {
          id: "action",
          label: "Action",
          type: "select",
          defaultValue: "sign",
          options: [
            { label: "Sign", value: "sign" },
            { label: "Verify", value: "verify" },
          ],
        },
        {
          id: "key",
          label: `${keyLabel} (Hex/Base64)`,
          type: "password",
          placeholder: "Secret key...",
        },
        {
          id: "signature",
          label: "Signature (Hex/Base64)",
          type: "text",
          placeholder: "Paste signature to verify...",
          visible: (d) => d["action"] === "verify",
        },
      ],
    },
    runner: async (node, inputs) => {
      const d = node.data;
      const action = (d["action"] as string) ?? "sign";
      const data = inputs["data"] ?? new Uint8Array(0);
      const keyBytes = getParamBytes(node as GraphNode, inputs, "key");

      if (!keyBytes) throw new Error(`Key is required for ${label}`);

      const provider = getProvider(algo) as MacProvider;
      if (!provider) throw new Error(`Provider for ${algo} not found`);

      if (action === "verify") {
        const signature =
          inputs["signature"] ?? getParamBytes(node as GraphNode, inputs, "signature");
        if (!signature) throw new Error("Signature is required for verification");
        const isValid = await provider.verify(keyBytes, signature, data);
        return utf8ToBytes(isValid ? "Valid" : "Invalid");
      } else {
        return provider.sign(keyBytes, data);
      }
    },
  };
}

export const macNodes: Record<string, NodeDef> = {
  hmac: {
    meta: {
      kind: "hmac",
      label: "HMAC",
      category: "mac",
      description: "Keyed-hash message authentication using any supported hash function.",
      defaultOutput: "hex",
      inputs: [
        { id: "data", label: "Data" },
        { id: "key", label: "Key" },
        { id: "signature", label: "Signature" },
      ],
      fields: [
        {
          id: "action",
          label: "Action",
          type: "select",
          defaultValue: "sign",
          options: [
            { label: "Sign", value: "sign" },
            { label: "Verify", value: "verify" },
          ],
        },
        {
          id: "hash",
          label: "Hash Function",
          type: "select",
          defaultValue: "SHA-256",
          options: HMAC_HASHES,
        },
        {
          id: "key",
          label: "Key (Hex/Base64)",
          type: "password",
          placeholder: "Shared secret key...",
        },
        {
          id: "signature",
          label: "Signature (Hex/Base64)",
          type: "text",
          placeholder: "Paste signature to verify...",
          visible: (d) => d["action"] === "verify",
        },
      ],
    },
    runner: async (node, inputs) => {
      const d = node.data;
      const action = (d["action"] as string) ?? "sign";
      const hash = (d["hash"] as string) ?? "SHA-256";
      const algo = `HMAC-${hash}`;
      const data = inputs["data"] ?? new Uint8Array(0);
      const keyBytes = getParamBytes(node as GraphNode, inputs, "key");

      if (!keyBytes) throw new Error("Key is required for HMAC");

      const provider = getProvider(algo) as MacProvider;
      if (!provider) throw new Error(`Provider for ${algo} not found`);

      if (action === "verify") {
        const signature =
          inputs["signature"] ?? getParamBytes(node as GraphNode, inputs, "signature");
        if (!signature) throw new Error("Signature is required for verification");
        const isValid = await provider.verify(keyBytes, signature, data);
        return utf8ToBytes(isValid ? "Valid" : "Invalid");
      } else {
        return provider.sign(keyBytes, data);
      }
    },
  },
  poly1305: makeMacNode(
    "Poly1305",
    "poly1305",
    "Poly1305",
    "One-time authenticator (requires 32-byte key). Requires unique key per message.",
    "Key (32 bytes)",
  ),
  cmac: makeMacNode(
    "CMAC",
    "cmac",
    "CMAC",
    "Block-cipher based MAC (AES-CMAC, NIST SP 800-38B).",
    "AES Key (16/24/32 bytes)",
  ),
};
