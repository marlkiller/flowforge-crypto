import type { NodeDef, GraphNode } from "../types";
import { utf8ToBytes, bytesToHex, hexToBytes } from "../service";
import { getParamBytes } from "../utils";
import { sm2 } from "sm-crypto";

export const smNodes: Record<string, NodeDef> = {
  sm2_keygen: {
    meta: {
      kind: "sm2_keygen",
      label: "SM2 Key Gen",
      category: "asymmetric",
      description:
        "Generate an SM2 key pair (Chinese national elliptic curve standard, GB/T 32918-2016).",
      defaultOutput: "hex",
      outputs: [
        { id: "publicKey", label: "Public Key" },
        { id: "privateKey", label: "Private Key" },
      ],
    },
    runner: async () => {
      const kp = sm2.generateKeyPairHex();
      return {
        publicKey: hexToBytes(kp.publicKey),
        privateKey: hexToBytes(kp.privateKey),
      };
    },
  },
  sm2_sign: {
    meta: {
      kind: "sm2_sign",
      label: "SM2 Sign",
      category: "asymmetric",
      description: "Sign data using an SM2 private key (SM2 signature with SM3 hash).",
      defaultOutput: "hex",
      inputs: [
        { id: "data", label: "Data" },
        { id: "privateKey", label: "Private Key (hex)" },
      ],
      fields: [
        {
          id: "privateKey",
          label: "Private Key (Hex)",
          type: "password",
          placeholder: "64-char hex SM2 private key...",
        },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
      if (!privateKeyBytes) throw new Error("Private Key is required for SM2 Sign");

      const sig = sm2.doSignature(bytesToHex(data), bytesToHex(privateKeyBytes), {
        hash: true,
        der: false,
      });
      return hexToBytes(sig);
    },
  },
  sm2_verify: {
    meta: {
      kind: "sm2_verify",
      label: "SM2 Verify",
      category: "asymmetric",
      description: "Verify an SM2 signature using an SM2 public key.",
      defaultOutput: "utf8",
      inputs: [
        { id: "data", label: "Data" },
        { id: "signature", label: "Signature (hex)" },
        { id: "publicKey", label: "Public Key (hex)" },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const signature = inputs["signature"] ?? new Uint8Array(0);
      const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
      if (!publicKeyBytes) throw new Error("Public Key is required for SM2 Verify");

      const isValid = sm2.doVerifySignature(
        bytesToHex(data),
        bytesToHex(signature),
        bytesToHex(publicKeyBytes),
        { hash: true, der: false },
      );
      return utf8ToBytes(isValid ? "Valid" : "Invalid");
    },
  },
  sm2_encrypt: {
    meta: {
      kind: "sm2_encrypt",
      label: "SM2 Encrypt",
      category: "asymmetric",
      description: "Encrypt data using an SM2 public key.",
      defaultOutput: "hex",
      inputs: [
        { id: "data", label: "Data" },
        { id: "publicKey", label: "Public Key" },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
      if (!publicKeyBytes) throw new Error("Public Key is required for SM2 Encrypt");

      const enc = sm2.doEncrypt(bytesToHex(data), bytesToHex(publicKeyBytes), {
        cipherMode: 1,
      });
      return hexToBytes(enc);
    },
  },
  sm2_decrypt: {
    meta: {
      kind: "sm2_decrypt",
      label: "SM2 Decrypt",
      category: "asymmetric",
      description: "Decrypt data using an SM2 private key.",
      defaultOutput: "utf8",
      inputs: [
        { id: "data", label: "Data" },
        { id: "privateKey", label: "Private Key" },
      ],
      fields: [
        {
          id: "privateKey",
          label: "Private Key (Hex)",
          type: "password",
          placeholder: "64-char hex SM2 private key...",
        },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
      if (!privateKeyBytes) throw new Error("Private Key is required for SM2 Decrypt");

      const dec = sm2.doDecrypt(bytesToHex(data), bytesToHex(privateKeyBytes));
      try {
        return hexToBytes(dec);
      } catch {
        return utf8ToBytes(dec);
      }
    },
  },
};
