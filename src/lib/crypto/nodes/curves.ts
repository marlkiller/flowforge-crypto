import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { utf8ToBytes } from "../service";
import { getField, getParamBytes } from "../utils";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { ed448, x448 } from "@noble/curves/ed448.js";
import { bls12_381 } from "@noble/curves/bls12-381.js";
import { sha256 } from "@noble/hashes/sha2.js";

registerNodeDef("secp256k1_keygen", {
  meta: {
    kind: "secp256k1_keygen",
    label: "secp256k1 Key Gen",
    category: "asymmetric",
    description: "Generate a secp256k1 key pair (Bitcoin/Ethereum curve).",
    defaultOutput: "hex",
    outputs: [
      { id: "publicKey", label: "Public Key (uncompressed)" },
      { id: "privateKey", label: "Private Key" },
    ],
  },
  runner: async () => {
    const secretKey = secp256k1.utils.randomSecretKey();
    const publicKey = secp256k1.getPublicKey(secretKey, false);
    return { publicKey, privateKey: secretKey };
  },
});

registerNodeDef("secp256k1_sign", {
  meta: {
    kind: "secp256k1_sign",
    label: "secp256k1 Sign",
    category: "signature",
    description: "Sign data using a secp256k1 private key (ECDSA).",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "privateKey", label: "Private Key", connectable: true, acceptTypes: ["hex", "base64"] },
      {
        id: "hashFirst",
        label: "Hash First",
        type: "select",
        defaultValue: "true",
        options: [
          { label: "Yes (hash data first)", value: "true" },
          { label: "No (raw 32-byte digest)", value: "false" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const sk = getParamBytes(node as GraphNode, inputs, "privateKey");
    if (!sk) throw new Error("Private key is required for secp256k1 signing");
    const hashFirst = getField(node, "hashFirst", "true") === "true";
    const msg = hashFirst ? sha256(data) : data;
    return secp256k1.sign(msg, sk);
  },
});

registerNodeDef("secp256k1_verify", {
  meta: {
    kind: "secp256k1_verify",
    label: "secp256k1 Verify",
    category: "signature",
    description: "Verify a secp256k1 signature using a public key.",
    defaultOutput: "utf8",
    supportedFormats: ["utf8", "bool"],
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "signature", label: "Signature", connectable: true, acceptTypes: ["raw"] },
      { id: "publicKey", label: "Public Key", connectable: true, acceptTypes: ["hex", "base64"] },
      {
        id: "hashFirst",
        label: "Hash First",
        type: "select",
        defaultValue: "true",
        options: [
          { label: "Yes (hash data first)", value: "true" },
          { label: "No (raw 32-byte digest)", value: "false" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const sig = inputs["signature"] ?? new Uint8Array(0);
    const pubKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!pubKeyBytes) throw new Error("Public key is required for verification");
    const hashFirst = getField(node, "hashFirst", "true") === "true";
    const msg = hashFirst ? sha256(data) : data;
    const isValid = secp256k1.verify(sig, msg, pubKeyBytes);
    const fmt = getField(node as GraphNode, "outputFormat", "utf8");
    if (fmt === "bool") return isValid;
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});

registerNodeDef("ecdh_secp256k1", {
  meta: {
    kind: "ecdh_secp256k1",
    label: "secp256k1 ECDH",
    category: "key-exchange",
    description: "Derive a shared secret using secp256k1 ECDH.",
    defaultOutput: "hex",
    inputs: [
      {
        id: "privateKey",
        label: "My Private Key",
        connectable: true,
        acceptTypes: ["hex", "base64"],
      },
      {
        id: "publicKey",
        label: "Peer Public Key",
        connectable: true,
        acceptTypes: ["hex", "base64"],
      },
    ],
  },
  runner: async (node, inputs) => {
    const sk = getParamBytes(node as GraphNode, inputs, "privateKey");
    const pk = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!sk || !pk) throw new Error("Both private and public keys are required");
    return secp256k1.getSharedSecret(sk, pk);
  },
});

registerNodeDef("ed448_keygen", {
  meta: {
    kind: "ed448_keygen",
    label: "Ed448 Key Gen",
    category: "asymmetric",
    description: "Generate an Ed448 (Edwards-curve) key pair.",
    defaultOutput: "hex",
    outputs: [
      { id: "publicKey", label: "Public Key" },
      { id: "privateKey", label: "Private Key" },
    ],
  },
  runner: async () => {
    const secretKey = ed448.utils.randomSecretKey();
    const publicKey = ed448.getPublicKey(secretKey);
    return { publicKey, privateKey: secretKey };
  },
});

registerNodeDef("ed448_sign", {
  meta: {
    kind: "ed448_sign",
    label: "Ed448 Sign",
    category: "signature",
    description: "Sign data using an Ed448 private key.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "privateKey", label: "Private Key", connectable: true, acceptTypes: ["hex", "base64"] },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const sk = getParamBytes(node as GraphNode, inputs, "privateKey");
    if (!sk) throw new Error("Private key is required for Ed448 signing");
    return ed448.sign(data, sk);
  },
});

registerNodeDef("ed448_verify", {
  meta: {
    kind: "ed448_verify",
    label: "Ed448 Verify",
    category: "signature",
    description: "Verify a signature using an Ed448 public key.",
    defaultOutput: "utf8",
    supportedFormats: ["utf8", "bool"],
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "signature", label: "Signature", connectable: true, acceptTypes: ["raw"] },
      { id: "publicKey", label: "Public Key", connectable: true, acceptTypes: ["hex", "base64"] },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const sig = inputs["signature"] ?? new Uint8Array(0);
    const pk = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!pk) throw new Error("Public key is required for verification");
    const isValid = ed448.verify(sig, data, pk);
    const fmt = getField(node as GraphNode, "outputFormat", "utf8");
    if (fmt === "bool") return isValid;
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});

registerNodeDef("x448_keygen", {
  meta: {
    kind: "x448_keygen",
    label: "X448 Key Gen",
    category: "key-exchange",
    description: "Generate a key pair for X448 Diffie-Hellman.",
    outputs: [
      { id: "privateKey", label: "Private Key" },
      { id: "publicKey", label: "Public Key" },
    ],
  },
  runner: async () => {
    const priv = x448.utils.randomSecretKey();
    const pub = x448.getPublicKey(priv);
    return {
      privateKey: priv,
      publicKey: pub,
    };
  },
});

registerNodeDef("x448_derive", {
  meta: {
    kind: "x448_derive",
    label: "X448 Derive",
    category: "key-exchange",
    description: "Derive a shared secret using X448 Diffie-Hellman.",
    defaultOutput: "hex",
    inputs: [
      {
        id: "privateKey",
        label: "My Private Key",
        connectable: true,
        acceptTypes: ["hex", "base64"],
      },
      {
        id: "publicKey",
        label: "Peer Public Key",
        connectable: true,
        acceptTypes: ["hex", "base64"],
      },
    ],
  },
  runner: async (node, inputs) => {
    const sk = getParamBytes(node as GraphNode, inputs, "privateKey");
    const pk = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!sk || !pk) throw new Error("Both private and public keys are required");
    return x448.getSharedSecret(sk, pk);
  },
});

const bls = bls12_381.shortSignatures;
const G1 = bls12_381.G1;
const G2 = bls12_381.G2;

registerNodeDef("bls_keygen", {
  meta: {
    kind: "bls_keygen",
    label: "BLS12-381 Key Gen",
    category: "asymmetric",
    description: "Generate a BLS12-381 key pair for BLS signatures (short sigs in G1).",
    defaultOutput: "hex",
    outputs: [
      { id: "publicKey", label: "Public Key (G2)" },
      { id: "privateKey", label: "Private Key" },
    ],
  },
  runner: async () => {
    const keys = bls.keygen();
    const pkBytes = keys.publicKey.toBytes();
    return { publicKey: pkBytes, privateKey: keys.secretKey };
  },
});

registerNodeDef("bls_sign", {
  meta: {
    kind: "bls_sign",
    label: "BLS12-381 Sign",
    category: "signature",
    description: "Sign data using a BLS12-381 private key.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "privateKey", label: "Private Key", connectable: true, acceptTypes: ["hex", "base64"] },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const sk = getParamBytes(node as GraphNode, inputs, "privateKey");
    if (!sk) throw new Error("Private key is required for BLS signing");
    const hashPoint = bls.hash(data);
    const sig = bls.sign(hashPoint, sk);
    return sig.toBytes();
  },
});

registerNodeDef("bls_verify", {
  meta: {
    kind: "bls_verify",
    label: "BLS12-381 Verify",
    category: "signature",
    description: "Verify a BLS12-381 signature using a public key.",
    defaultOutput: "utf8",
    supportedFormats: ["utf8", "bool"],
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "signature", label: "Signature", connectable: true, acceptTypes: ["raw"] },
      { id: "publicKey", label: "Public Key", connectable: true, acceptTypes: ["hex", "base64"] },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const sigBytes = inputs["signature"] ?? new Uint8Array(0);
    const pkBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!pkBytes) throw new Error("Public key is required for verification");
    const hashPoint = bls.hash(data);
    const sigPoint = G1.Point.fromBytes(sigBytes);
    const pubKeyPoint = G2.Point.fromBytes(pkBytes);
    const isValid = bls.verify(sigPoint, hashPoint, pubKeyPoint);
    const fmt = getField(node as GraphNode, "outputFormat", "utf8");
    if (fmt === "bool") return isValid;
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});
