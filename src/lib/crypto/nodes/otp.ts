import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { utf8ToBytes } from "../service";
import { getField, getNumberField, getParamBytes } from "../utils";
import * as OTPAuth from "otpauth";

registerNodeDef("totp", {
  meta: {
    kind: "totp",
    label: "TOTP",
    category: "protocol",
    description: "Time-based One-Time Password (RFC 6238).",
    defaultOutput: "utf8",
    inputs: [
      { id: "secret", label: "Secret", connectable: true, acceptTypes: ["base32"] },
      {
        id: "issuer",
        label: "Issuer",
        connectable: false,
        type: "text",
        defaultValue: "FlowForge",
      },
      {
        id: "label",
        label: "Account Name",
        connectable: false,
        type: "text",
        defaultValue: "user@example.com",
      },
      { id: "digits", label: "Digits", connectable: false, type: "number", defaultValue: 6 },
      { id: "period", label: "Period (s)", connectable: false, type: "number", defaultValue: 30 },
      {
        id: "algorithm",
        label: "Algorithm",
        connectable: false,
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
      issuer: getField(node, "issuer", "FlowForge"),
      label: getField(node, "label", "user@example.com"),
      algorithm: getField(node, "algorithm", "SHA1"),
      digits: getNumberField(node, "digits", 6),
      period: getNumberField(node, "period", 30),
      secret: new OTPAuth.Secret({ buffer: secretBytes.buffer }),
    });

    return utf8ToBytes(totp.generate());
  },
});

registerNodeDef("hotp", {
  meta: {
    kind: "hotp",
    label: "HOTP",
    category: "protocol",
    description: "HMAC-based One-Time Password (RFC 4226).",
    defaultOutput: "utf8",
    inputs: [
      { id: "secret", label: "Secret", connectable: true, acceptTypes: ["base32"] },
      { id: "counter", label: "Counter", connectable: false, type: "number", defaultValue: 0 },
      { id: "digits", label: "Digits", connectable: false, type: "number", defaultValue: 6 },
      {
        id: "algorithm",
        label: "Algorithm",
        connectable: false,
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
      algorithm: getField(node, "algorithm", "SHA1"),
      digits: getNumberField(node, "digits", 6),
      counter: getNumberField(node, "counter", 0),
      secret: new OTPAuth.Secret({ buffer: secretBytes.buffer }),
    });

    return utf8ToBytes(hotp.generate());
  },
});
