import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { utf8ToBytes } from "../service";
import { getField, getParamBytes } from "../utils";

registerNodeDef("ed_keygen", {
  meta: {
    kind: "ed_keygen",
    label: "Ed25519 Key Gen",
    category: "public-key",
    description: "Generate an Ed25519 key pair (modern Edwards-curve DSA).",
    defaultOutput: "pem",
    outputs: [
      { id: "publicKey", label: "Public Key" },
      { id: "privateKey", label: "Private Key" },
    ],
  },
  runner: async () => {
    const secretKey = ed25519.utils.randomSecretKey();
    const publicKey = ed25519.getPublicKey(secretKey);
    return { publicKey, privateKey: secretKey };
  },
});

registerNodeDef("ed_sign", {
  meta: {
    kind: "ed_sign",
    label: "Ed25519 Sign",
    category: "signature",
    description: "Sign data using an Ed25519 private key.",
    defaultOutput: "base64",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "privateKey",
        label: "Private Key",
        connectable: true,
        acceptTypes: ["PEM", "B64"],
      },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
    if (!privateKeyBytes) throw new Error("Private Key is required for Ed25519 Sign");
    return ed25519.sign(data, privateKeyBytes);
  },
});

registerNodeDef("ed_verify", {
  meta: {
    kind: "ed_verify",
    label: "Ed25519 Verify",
    category: "signature",
    description: "Verify data signature using an Ed25519 public key.",
    defaultOutput: "utf8",
    supportedFormats: ["utf8", "bool"],
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "signature",
        label: "Signature",
        connectable: true,
        acceptTypes: ["B64", "HEX"],
      },
      {
        id: "publicKey",
        label: "Public Key",
        connectable: true,
        acceptTypes: ["PEM", "B64"],
      },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const signature = inputs["signature"] ?? new Uint8Array(0);
    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!publicKeyBytes) throw new Error("Public Key is required for Ed25519 Verify");
    const isValid = ed25519.verify(signature, data, publicKeyBytes);
    const fmt = getField(node as GraphNode, "outputFormat", "utf8");
    if (fmt === "bool") return isValid;
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});

registerNodeDef("x25519_derive", {
  meta: {
    kind: "x25519_derive",
    label: "X25519 Derive",
    category: "key-exchange",
    description: "Derive shared secret using X25519 Diffie-Hellman key agreement.",
    defaultOutput: "hex",
    inputs: [
      {
        id: "privateKey",
        label: "My Private Key",
        connectable: true,
        acceptTypes: ["PEM", "B64"],
      },
      {
        id: "publicKey",
        label: "Peer Public Key",
        connectable: true,
        acceptTypes: ["PEM", "B64"],
      },
    ],
  },
  runner: async (node, inputs) => {
    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!privateKeyBytes || !publicKeyBytes) {
      throw new Error("Both private and public keys are required for X25519");
    }
    return x25519.getSharedSecret(privateKeyBytes, publicKeyBytes);
  },
});
