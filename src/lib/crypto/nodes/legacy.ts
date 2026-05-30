import { registerNodeDef } from "../registry";
import type { GraphNode, NodeDef } from "../types";
import { bytesToHex, hexToBytes, type DataFormat } from "../service";
import { getField, getParamBytes } from "../utils";
import CryptoJS from "crypto-js";

function makeLegacyCipherNode(algo: "DES" | "TripleDES", label: string): NodeDef {
  return {
    meta: {
      kind: algo.toLowerCase(),
      label,
      category: "legacy",
      description: `${label} legacy encryption (INSECURE).`,
      defaultOutput: "hex" as DataFormat,
      inputs: [
        { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
        {
          id: "key",
          label: "Key",
          connectable: true,
          acceptTypes: ["hex", "base64"],
          type: "password",
        },
        {
          id: "iv",
          label: "IV",
          connectable: true,
          acceptTypes: ["hex", "base64"],
          type: "text",
        },
        {
          id: "action",
          label: "Action",
          connectable: false,
          type: "select",
          options: [
            { label: "Encrypt", value: "encrypt" },
            { label: "Decrypt", value: "decrypt" },
          ],
        },
        {
          id: "mode",
          label: "Mode",
          connectable: false,
          type: "select",
          defaultValue: "CBC",
          options: [
            { label: "CBC", value: "CBC" },
            { label: "ECB", value: "ECB" },
          ],
        },
      ],
    },
    runner: async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const keyBytes = getParamBytes(node, inputs, "key");
      const ivBytes = getParamBytes(node, inputs, "iv", false);
      const action = getField(node, "action", "encrypt");
      const modeStr = getField(node, "mode", "CBC");

      if (!keyBytes) throw new Error("Key is required");

      const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));
      const iv = ivBytes ? CryptoJS.enc.Hex.parse(bytesToHex(ivBytes)) : undefined;
      const mode = modeStr === "CBC" ? CryptoJS.mode.CBC : CryptoJS.mode.ECB;

      if (action === "encrypt") {
        const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
        const encrypted = CryptoJS[algo].encrypt(wa, key, { iv, mode });
        return hexToBytes(encrypted.ciphertext.toString());
      } else {
        const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
        const cp = CryptoJS.lib.CipherParams.create({ ciphertext: wa });
        const decrypted = CryptoJS[algo].decrypt(cp, key, { iv, mode });
        return hexToBytes(decrypted.toString());
      }
    },
  };
}

function makeStreamCipherNode(kind: string, label: string, algo: string, hasIv: boolean): NodeDef {
  return {
    meta: {
      kind,
      label,
      category: "legacy",
      description: `${label} stream cipher.`,
      defaultOutput: "hex" as DataFormat,
      inputs: [
        { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
        {
          id: "key",
          label: "Key",
          connectable: true,
          acceptTypes: ["hex", "base64"],
          type: "password",
        },
        ...(hasIv
          ? [
              {
                id: "iv" as const,
                label: "IV" as const,
                connectable: true as const,
                acceptTypes: ["hex" as const, "base64" as const],
                type: "text" as const,
              },
            ]
          : []),
        {
          id: "action",
          label: "Action",
          connectable: false,
          type: "select" as const,
          options: [
            { label: "Encrypt", value: "encrypt" },
            { label: "Decrypt", value: "decrypt" },
          ],
        },
      ],
    },
    runner: async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const keyBytes = getParamBytes(node, inputs, "key");
      const ivBytes = hasIv ? getParamBytes(node, inputs, "iv", false) : undefined;
      const action = getField(node, "action", "encrypt");

      if (!keyBytes) throw new Error("Key is required");

      const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));
      const iv = ivBytes ? CryptoJS.enc.Hex.parse(bytesToHex(ivBytes)) : undefined;

      const opts: any = {};
      if (iv) opts.iv = iv;

      if (action === "encrypt") {
        const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
        const encrypted = (CryptoJS as any)[algo].encrypt(wa, key, opts);
        return hexToBytes(encrypted.ciphertext.toString());
      } else {
        const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
        const cp = CryptoJS.lib.CipherParams.create({ ciphertext: wa });
        const decrypted = (CryptoJS as any)[algo].decrypt(cp, key, opts);
        return hexToBytes(decrypted.toString());
      }
    },
  };
}

function makeBlowfishNode(): NodeDef {
  return {
    meta: {
      kind: "blowfish",
      label: "Blowfish",
      category: "cipher",
      description: "Blowfish block cipher (64-bit block, 32-448 bit key).",
      defaultOutput: "hex" as DataFormat,
      inputs: [
        { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
        {
          id: "key",
          label: "Key",
          connectable: true,
          acceptTypes: ["hex", "base64"],
          type: "password",
        },
        {
          id: "iv",
          label: "IV",
          connectable: true,
          acceptTypes: ["hex", "base64"],
          type: "text",
          visible: (d) => (d["mode"] as string) !== "ECB",
        },
        {
          id: "action",
          label: "Action",
          connectable: false,
          type: "select",
          options: [
            { label: "Encrypt", value: "encrypt" },
            { label: "Decrypt", value: "decrypt" },
          ],
        },
        {
          id: "mode",
          label: "Mode",
          connectable: false,
          type: "select",
          defaultValue: "CBC",
          options: [
            { label: "CBC", value: "CBC" },
            { label: "ECB", value: "ECB" },
          ],
        },
      ],
    },
    runner: async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const keyBytes = getParamBytes(node, inputs, "key");
      const ivBytes = getParamBytes(node, inputs, "iv", false);
      const action = getField(node, "action", "encrypt");
      const modeStr = getField(node, "mode", "CBC");

      if (!keyBytes) throw new Error("Key is required");

      const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));
      const iv = ivBytes ? CryptoJS.enc.Hex.parse(bytesToHex(ivBytes)) : undefined;
      const mode = modeStr === "CBC" ? CryptoJS.mode.CBC : CryptoJS.mode.ECB;

      if (action === "encrypt") {
        const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
        const encrypted = CryptoJS.Blowfish.encrypt(wa, key, { iv, mode });
        return hexToBytes(encrypted.ciphertext.toString());
      } else {
        const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
        const cp = CryptoJS.lib.CipherParams.create({ ciphertext: wa });
        const decrypted = CryptoJS.Blowfish.decrypt(cp, key, { iv, mode });
        return hexToBytes(decrypted.toString());
      }
    },
  };
}

registerNodeDef("des", makeLegacyCipherNode("DES", "DES"));
registerNodeDef("tripledes", makeLegacyCipherNode("TripleDES", "3DES"));
registerNodeDef("blowfish", makeBlowfishNode());
registerNodeDef("rc4", makeStreamCipherNode("rc4", "RC4", "RC4", false));
registerNodeDef("rabbit", makeStreamCipherNode("rabbit", "Rabbit", "Rabbit", true));
