import type { NodeDef, GraphNode } from "../types";
import { utf8ToBytes, bytesToHex, hexToBytes, bytesToUtf8 } from "../service";
import { getParamBytes } from "../utils";
import CryptoJS from "crypto-js";

function makeLegacyCipherNode(algo: "DES" | "TripleDES", label: string): NodeDef {
  return {
    meta: {
      kind: algo.toLowerCase(),
      label,
      category: "legacy",
      description: `${label} legacy encryption (INSECURE).`,
      defaultOutput: "hex",
      inputs: [
        { id: "data", label: "Data" },
        { id: "key", label: "Key" },
        { id: "iv", label: "IV" },
      ],
      fields: [
        {
          id: "action",
          label: "Action",
          type: "select",
          options: [
            { label: "Encrypt", value: "encrypt" },
            { label: "Decrypt", value: "decrypt" },
          ],
        },
        {
            id: "mode",
            label: "Mode",
            type: "select",
            defaultValue: "CBC",
            options: [
                { label: "CBC", value: "CBC" },
                { label: "ECB", value: "ECB" },
            ],
        },
        { id: "key", label: "Key (Hex)", type: "password" },
        { id: "iv", label: "IV (Hex)", type: "text" },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
      const ivBytes = getParamBytes(node as GraphNode, inputs, "iv", false);
      const action = (node.data["action"] as string) ?? "encrypt";
      const modeStr = (node.data["mode"] as string) || "CBC";

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
        // CryptoJS decrypt expects a CipherParams object or a string.
        const cp = CryptoJS.lib.CipherParams.create({
            ciphertext: wa
        });
        const decrypted = CryptoJS[algo].decrypt(cp, key, { iv, mode });
        return hexToBytes(decrypted.toString());
      }
    },
  };
}

export const legacyNodes: Record<string, NodeDef> = {
  des: makeLegacyCipherNode("DES", "DES"),
  tripledes: makeLegacyCipherNode("TripleDES", "3DES"),
};
