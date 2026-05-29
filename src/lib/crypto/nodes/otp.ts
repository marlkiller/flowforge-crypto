import type { NodeDef, GraphNode } from "../types";
import { utf8ToBytes } from "../service";
import { getParamBytes } from "../utils";
import * as OTPAuth from "otpauth";

export const otpNodes: Record<string, NodeDef> = {
  totp: {
    meta: {
      kind: "totp",
      label: "TOTP",
      category: "protocol",
      description: "Time-based One-Time Password (RFC 6238).",
      defaultOutput: "utf8",
      inputs: [{ id: "secret", label: "Secret (base32)" }],
      fields: [
        { id: "issuer", label: "Issuer", type: "text", defaultValue: "FlowForge" },
        { id: "label", label: "Account Name", type: "text", defaultValue: "user@example.com" },
        { id: "digits", label: "Digits", type: "number", defaultValue: 6 },
        { id: "period", label: "Period (s)", type: "number", defaultValue: 30 },
        {
          id: "algorithm",
          label: "Algorithm",
          type: "select",
          defaultValue: "SHA1",
          options: [
            { label: "SHA-1", value: "SHA1" },
            { label: "SHA-256", value: "SHA256" },
            { label: "SHA-512", value: "SHA512" },
          ],
        },
      ],
    },
    runner: async (node, inputs) => {
      const secretBytes = getParamBytes(node as GraphNode, inputs, "secret");
      if (!secretBytes) throw new Error("Secret is required for TOTP");

      const totp = new OTPAuth.TOTP({
        issuer: (node.data["issuer"] as string) || "FlowForge",
        label: (node.data["label"] as string) || "user@example.com",
        algorithm: (node.data["algorithm"] as string) || "SHA1",
        digits: parseInt((node.data["digits"] as string) || "6", 10),
        period: parseInt((node.data["period"] as string) || "30", 10),
        secret: new OTPAuth.Secret({ buffer: secretBytes.buffer }),
      });

      return utf8ToBytes(totp.generate());
    },
  },
  hotp: {
    meta: {
      kind: "hotp",
      label: "HOTP",
      category: "protocol",
      description: "HMAC-based One-Time Password (RFC 4226).",
      defaultOutput: "utf8",
      inputs: [{ id: "secret", label: "Secret (base32)" }],
      fields: [
        { id: "counter", label: "Counter", type: "number", defaultValue: 0 },
        { id: "digits", label: "Digits", type: "number", defaultValue: 6 },
        {
          id: "algorithm",
          label: "Algorithm",
          type: "select",
          defaultValue: "SHA1",
          options: [
            { label: "SHA-1", value: "SHA1" },
            { label: "SHA-256", value: "SHA256" },
            { label: "SHA-512", value: "SHA512" },
          ],
        },
      ],
    },
    runner: async (node, inputs) => {
      const secretBytes = getParamBytes(node as GraphNode, inputs, "secret");
      if (!secretBytes) throw new Error("Secret is required for HOTP");

      const hotp = new OTPAuth.HOTP({
        algorithm: (node.data["algorithm"] as string) || "SHA1",
        digits: parseInt((node.data["digits"] as string) || "6", 10),
        counter: parseInt((node.data["counter"] as string) || "0", 10),
        secret: new OTPAuth.Secret({ buffer: secretBytes.buffer }),
      });

      return utf8ToBytes(hotp.generate());
    },
  },
};
