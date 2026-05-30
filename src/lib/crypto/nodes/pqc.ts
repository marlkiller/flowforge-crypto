import { registerNodeDef } from "../registry";
import { utf8ToBytes } from "../service";
import { getField } from "../utils";
import { ml_kem512, ml_kem768, ml_kem1024 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
import {
  slh_dsa_sha2_128f, slh_dsa_sha2_128s,
  slh_dsa_sha2_192f, slh_dsa_sha2_192s,
  slh_dsa_sha2_256f, slh_dsa_sha2_256s,
  slh_dsa_shake_128f, slh_dsa_shake_128s,
  slh_dsa_shake_192f, slh_dsa_shake_192s,
  slh_dsa_shake_256f, slh_dsa_shake_256s,
} from "@noble/post-quantum/slh-dsa.js";

const KEM_VARIANTS: Record<string, typeof ml_kem512> = {
  "ML-KEM-512": ml_kem512,
  "ML-KEM-768": ml_kem768,
  "ML-KEM-1024": ml_kem1024,
};

const MLDSA_VARIANTS: Record<string, typeof ml_dsa44> = {
  "ML-DSA-44": ml_dsa44,
  "ML-DSA-65": ml_dsa65,
  "ML-DSA-87": ml_dsa87,
};

const SLHDSA_VARIANTS: Record<string, any> = {
  "SLH-DSA-SHA2-128f": slh_dsa_sha2_128f,
  "SLH-DSA-SHA2-128s": slh_dsa_sha2_128s,
  "SLH-DSA-SHA2-192f": slh_dsa_sha2_192f,
  "SLH-DSA-SHA2-192s": slh_dsa_sha2_192s,
  "SLH-DSA-SHA2-256f": slh_dsa_sha2_256f,
  "SLH-DSA-SHA2-256s": slh_dsa_sha2_256s,
  "SLH-DSA-SHAKE-128f": slh_dsa_shake_128f,
  "SLH-DSA-SHAKE-128s": slh_dsa_shake_128s,
  "SLH-DSA-SHAKE-192f": slh_dsa_shake_192f,
  "SLH-DSA-SHAKE-192s": slh_dsa_shake_192s,
  "SLH-DSA-SHAKE-256f": slh_dsa_shake_256f,
  "SLH-DSA-SHAKE-256s": slh_dsa_shake_256s,
};

registerNodeDef("ml_kem_keygen", {
  meta: {
    kind: "ml_kem_keygen",
    label: "ML-KEM Key Gen",
    category: "pqc",
    description: "Generate an ML-KEM (FIPS 203) key pair for key encapsulation.",
    defaultOutput: "hex",
    outputs: [
      { id: "publicKey", label: "Public Key" },
      { id: "privateKey", label: "Private Key" },
    ],
    inputs: [
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "ML-KEM-768",
        options: [
          { label: "ML-KEM-512", value: "ML-KEM-512" },
          { label: "ML-KEM-768", value: "ML-KEM-768" },
          { label: "ML-KEM-1024", value: "ML-KEM-1024" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node) => {
    const variant = getField(node, "parameterSet", "ML-KEM-768");
    const kem = KEM_VARIANTS[variant];
    if (!kem) throw new Error(`Unknown ML-KEM variant: ${variant}`);
    const keys = kem.keygen();
    return { publicKey: keys.publicKey, privateKey: keys.secretKey };
  },
});

registerNodeDef("ml_kem_encaps", {
  meta: {
    kind: "ml_kem_encaps",
    label: "ML-KEM Encapsulate",
    category: "pqc",
    description: "Generate a shared secret and ciphertext using a peer's ML-KEM public key.",
    defaultOutput: "hex",
    outputs: [
      { id: "ciphertext", label: "Ciphertext" },
      { id: "sharedSecret", label: "Shared Secret" },
    ],
    inputs: [
      { id: "publicKey", label: "Public Key", connectable: true, acceptTypes: ["raw"] },
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "ML-KEM-768",
        options: [
          { label: "ML-KEM-512", value: "ML-KEM-512" },
          { label: "ML-KEM-768", value: "ML-KEM-768" },
          { label: "ML-KEM-1024", value: "ML-KEM-1024" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const variant = getField(node, "parameterSet", "ML-KEM-768");
    const kem = KEM_VARIANTS[variant];
    if (!kem) throw new Error(`Unknown ML-KEM variant: ${variant}`);
    const pubKey = inputs["publicKey"] ?? new Uint8Array(0);
    if (pubKey.length === 0) throw new Error("Public key is required for encapsulation");
    const result = kem.encapsulate(pubKey);
    return { ciphertext: result.cipherText, sharedSecret: result.sharedSecret };
  },
});

registerNodeDef("ml_kem_decaps", {
  meta: {
    kind: "ml_kem_decaps",
    label: "ML-KEM Decapsulate",
    category: "pqc",
    description: "Decapsulate a shared secret from a ciphertext using your ML-KEM private key.",
    defaultOutput: "hex",
    inputs: [
      { id: "ciphertext", label: "Ciphertext", connectable: true, acceptTypes: ["raw"] },
      { id: "privateKey", label: "Private Key", connectable: true, acceptTypes: ["raw"] },
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "ML-KEM-768",
        options: [
          { label: "ML-KEM-512", value: "ML-KEM-512" },
          { label: "ML-KEM-768", value: "ML-KEM-768" },
          { label: "ML-KEM-1024", value: "ML-KEM-1024" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const variant = getField(node, "parameterSet", "ML-KEM-768");
    const kem = KEM_VARIANTS[variant];
    if (!kem) throw new Error(`Unknown ML-KEM variant: ${variant}`);
    const ct = inputs["ciphertext"] ?? new Uint8Array(0);
    const sk = inputs["privateKey"] ?? new Uint8Array(0);
    if (ct.length === 0 || sk.length === 0) {
      throw new Error("Both ciphertext and private key are required");
    }
    return kem.decapsulate(ct, sk);
  },
});

registerNodeDef("ml_dsa_keygen", {
  meta: {
    kind: "ml_dsa_keygen",
    label: "ML-DSA Key Gen",
    category: "pqc",
    description: "Generate an ML-DSA (FIPS 204) key pair for digital signatures.",
    defaultOutput: "hex",
    outputs: [
      { id: "publicKey", label: "Public Key" },
      { id: "privateKey", label: "Private Key" },
    ],
    inputs: [
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "ML-DSA-65",
        options: [
          { label: "ML-DSA-44", value: "ML-DSA-44" },
          { label: "ML-DSA-65", value: "ML-DSA-65" },
          { label: "ML-DSA-87", value: "ML-DSA-87" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node) => {
    const variant = getField(node, "parameterSet", "ML-DSA-65");
    const dsa = MLDSA_VARIANTS[variant];
    if (!dsa) throw new Error(`Unknown ML-DSA variant: ${variant}`);
    const keys = dsa.keygen();
    return { publicKey: keys.publicKey, privateKey: keys.secretKey };
  },
});

registerNodeDef("ml_dsa_sign", {
  meta: {
    kind: "ml_dsa_sign",
    label: "ML-DSA Sign",
    category: "pqc",
    description: "Sign data using an ML-DSA private key.",
    defaultOutput: "base64",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "privateKey", label: "Private Key", connectable: true, acceptTypes: ["raw"] },
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "ML-DSA-65",
        options: [
          { label: "ML-DSA-44", value: "ML-DSA-44" },
          { label: "ML-DSA-65", value: "ML-DSA-65" },
          { label: "ML-DSA-87", value: "ML-DSA-87" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const variant = getField(node, "parameterSet", "ML-DSA-65");
    const dsa = MLDSA_VARIANTS[variant];
    if (!dsa) throw new Error(`Unknown ML-DSA variant: ${variant}`);
    const data = inputs["data"] ?? new Uint8Array(0);
    const sk = inputs["privateKey"] ?? new Uint8Array(0);
    if (sk.length === 0) throw new Error("Private key is required for ML-DSA signing");
    return dsa.sign(data, sk);
  },
});

registerNodeDef("ml_dsa_verify", {
  meta: {
    kind: "ml_dsa_verify",
    label: "ML-DSA Verify",
    category: "pqc",
    description: "Verify an ML-DSA signature using a public key.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "signature", label: "Signature", connectable: true, acceptTypes: ["raw"] },
      { id: "publicKey", label: "Public Key", connectable: true, acceptTypes: ["raw"] },
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "ML-DSA-65",
        options: [
          { label: "ML-DSA-44", value: "ML-DSA-44" },
          { label: "ML-DSA-65", value: "ML-DSA-65" },
          { label: "ML-DSA-87", value: "ML-DSA-87" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const variant = getField(node, "parameterSet", "ML-DSA-65");
    const dsa = MLDSA_VARIANTS[variant];
    if (!dsa) throw new Error(`Unknown ML-DSA variant: ${variant}`);
    const data = inputs["data"] ?? new Uint8Array(0);
    const sig = inputs["signature"] ?? new Uint8Array(0);
    const pubKey = inputs["publicKey"] ?? new Uint8Array(0);
    if (pubKey.length === 0) throw new Error("Public key is required for ML-DSA verification");
    const isValid = dsa.verify(sig, data, pubKey);
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});

registerNodeDef("slh_dsa_keygen", {
  meta: {
    kind: "slh_dsa_keygen",
    label: "SLH-DSA Key Gen",
    category: "pqc",
    description: "Generate an SLH-DSA (FIPS 205) key pair for stateless hash-based signatures.",
    defaultOutput: "hex",
    outputs: [
      { id: "publicKey", label: "Public Key" },
      { id: "privateKey", label: "Private Key" },
    ],
    inputs: [
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "SLH-DSA-SHAKE-128s",
        options: Object.keys(SLHDSA_VARIANTS).map((k) => ({ label: k, value: k })),
        connectable: false,
      },
    ],
  },
  runner: async (node) => {
    const variant = getField(node, "parameterSet", "SLH-DSA-SHAKE-128s");
    const dsa = SLHDSA_VARIANTS[variant];
    if (!dsa) throw new Error(`Unknown SLH-DSA variant: ${variant}`);
    const keys = dsa.keygen();
    return { publicKey: keys.publicKey, privateKey: keys.secretKey };
  },
});

registerNodeDef("slh_dsa_sign", {
  meta: {
    kind: "slh_dsa_sign",
    label: "SLH-DSA Sign",
    category: "pqc",
    description: "Sign data using an SLH-DSA private key.",
    defaultOutput: "base64",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "privateKey", label: "Private Key", connectable: true, acceptTypes: ["raw"] },
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "SLH-DSA-SHAKE-128s",
        options: Object.keys(SLHDSA_VARIANTS).map((k) => ({ label: k, value: k })),
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const variant = getField(node, "parameterSet", "SLH-DSA-SHAKE-128s");
    const dsa = SLHDSA_VARIANTS[variant];
    if (!dsa) throw new Error(`Unknown SLH-DSA variant: ${variant}`);
    const data = inputs["data"] ?? new Uint8Array(0);
    const sk = inputs["privateKey"] ?? new Uint8Array(0);
    if (sk.length === 0) throw new Error("Private key is required for SLH-DSA signing");
    return dsa.sign(data, sk);
  },
});

registerNodeDef("slh_dsa_verify", {
  meta: {
    kind: "slh_dsa_verify",
    label: "SLH-DSA Verify",
    category: "pqc",
    description: "Verify an SLH-DSA signature using a public key.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      { id: "signature", label: "Signature", connectable: true, acceptTypes: ["raw"] },
      { id: "publicKey", label: "Public Key", connectable: true, acceptTypes: ["raw"] },
      {
        id: "parameterSet",
        label: "Parameter Set",
        type: "select",
        defaultValue: "SLH-DSA-SHAKE-128s",
        options: Object.keys(SLHDSA_VARIANTS).map((k) => ({ label: k, value: k })),
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const variant = getField(node, "parameterSet", "SLH-DSA-SHAKE-128s");
    const dsa = SLHDSA_VARIANTS[variant];
    if (!dsa) throw new Error(`Unknown SLH-DSA variant: ${variant}`);
    const data = inputs["data"] ?? new Uint8Array(0);
    const sig = inputs["signature"] ?? new Uint8Array(0);
    const pubKey = inputs["publicKey"] ?? new Uint8Array(0);
    if (pubKey.length === 0) throw new Error("Public key is required for SLH-DSA verification");
    const isValid = dsa.verify(sig, data, pubKey);
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});
