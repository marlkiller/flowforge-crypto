import type { NodeDef, GraphNode } from "../types";
import { getProvider, type MacProvider, utf8ToBytes } from "../service";
import { getParamBytes } from "../utils";

function makeHmacNode(hash: string, kind: string): NodeDef {
  const algo = `HMAC-${hash}`;
  return {
    meta: {
      kind,
      label: algo,
      category: "mac",
      description: `HMAC using ${hash} for message authentication.`,
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
  };
}

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
  hmacsha1: makeHmacNode("SHA-1", "hmacsha1"),
  hmacsha256: makeHmacNode("SHA-256", "hmacsha256"),
  hmacsha384: makeHmacNode("SHA-384", "hmacsha384"),
  hmacsha512: makeHmacNode("SHA-512", "hmacsha512"),
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
