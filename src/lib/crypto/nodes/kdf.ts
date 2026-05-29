import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { utf8ToBytes, bytesToUtf8, getProvider, type KdfProvider } from "../service";
import { getField, getNumberField, getParamBytes } from "../utils";
import bcrypt from "bcryptjs";

registerNodeDef("pbkdf2", {
  meta: {
    kind: "pbkdf2",
    label: "PBKDF2",
    category: "kdf",
    description: "Password-Based Key Derivation Function 2.",
    defaultOutput: "hex",
    inputs: [
      { id: "password", label: "Password (utf8)" },
      { id: "salt", label: "Salt (hex)" },
    ],
    fields: [
      { id: "password", label: "Password (Raw)", type: "text", placeholder: "Enter password..." },
      { id: "salt", label: "Salt (Hex)", type: "text", placeholder: "Hex string..." },
      { id: "iterations", label: "Iterations", type: "number", defaultValue: 100000 },
      {
        id: "hash",
        label: "Hash",
        type: "select",
        defaultValue: "SHA-256",
        options: [
          { label: "SHA-1", value: "SHA-1" },
          { label: "SHA-256", value: "SHA-256" },
          { label: "SHA-384", value: "SHA-384" },
          { label: "SHA-512", value: "SHA-512" },
        ],
      },
      { id: "length", label: "Derived Length (bits)", type: "number", defaultValue: 256 },
    ],
  },
  runner: async (node, inputs) => {
    const password = getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const iterations = getNumberField(node, "iterations", 100000);
    const hash = getField(node, "hash", "SHA-256");
    const length = getNumberField(node, "length", 256);

    const provider = getProvider("PBKDF2") as KdfProvider;
    return provider.derive(password, salt, length, { iterations, hash });
  },
});

registerNodeDef("hkdf", {
  meta: {
    kind: "hkdf",
    label: "HKDF",
    category: "kdf",
    description: "HMAC-based Extract-and-Expand Key Derivation Function.",
    defaultOutput: "hex",
    inputs: [
      { id: "ikm", label: "IKM (Input Keying Material)" },
      { id: "salt", label: "Salt (hex)" },
      { id: "info", label: "Info (hex)" },
    ],
    fields: [
      {
        id: "hash",
        label: "Hash",
        type: "select",
        defaultValue: "SHA-256",
        options: [
          { label: "SHA-1", value: "SHA-1" },
          { label: "SHA-256", value: "SHA-256" },
          { label: "SHA-384", value: "SHA-384" },
          { label: "SHA-512", value: "SHA-512" },
        ],
      },
      { id: "length", label: "Derived Length (bits)", type: "number", defaultValue: 256 },
    ],
  },
  runner: async (node, inputs) => {
    const ikm = getParamBytes(node as GraphNode, inputs, "ikm") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const info = getParamBytes(node as GraphNode, inputs, "info") || new Uint8Array(0);
    const hash = getField(node, "hash", "SHA-256");
    const length = getNumberField(node, "length", 256);

    const provider = getProvider("HKDF") as KdfProvider;
    return provider.derive(ikm, salt, length, { info, hash });
  },
});

registerNodeDef("argon2", {
  meta: {
    kind: "argon2",
    label: "Argon2",
    category: "kdf",
    description: "Memory-hard password hashing (PHC winner).",
    defaultOutput: "hex",
    inputs: [
      { id: "password", label: "Password (utf8)" },
      { id: "salt", label: "Salt (hex)" },
    ],
    fields: [
      {
        id: "type",
        label: "Type",
        type: "select",
        defaultValue: "id",
        options: [
          { label: "Argon2id", value: "id" },
          { label: "Argon2i", value: "i" },
          { label: "Argon2d", value: "d" },
        ],
      },
      { id: "t", label: "Iterations (t)", type: "number", defaultValue: 3 },
      { id: "m", label: "Memory (KB)", type: "number", defaultValue: 65536 },
      { id: "p", label: "Parallelism (p)", type: "number", defaultValue: 1 },
      { id: "length", label: "Derived Length (bytes)", type: "number", defaultValue: 32 },
    ],
  },
  runner: async (node, inputs) => {
    const pwd = getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const t = getNumberField(node, "t", 3);
    const m = getNumberField(node, "m", 65536);
    const p = getNumberField(node, "p", 1);
    const len = getNumberField(node, "length", 32);
    const type = getField(node, "type", "id");

    const provider = getProvider("Argon2") as KdfProvider;
    return provider.derive(pwd, salt, len * 8, { t, m, p, type });
  },
});

registerNodeDef("scrypt", {
  meta: {
    kind: "scrypt",
    label: "Scrypt",
    category: "kdf",
    description: "Memory-hard key derivation function.",
    defaultOutput: "hex",
    inputs: [
      { id: "password", label: "Password (utf8)" },
      { id: "salt", label: "Salt (hex)" },
    ],
    fields: [
      { id: "N", label: "Cost (N)", type: "number", defaultValue: 16384 },
      { id: "r", label: "Block Size (r)", type: "number", defaultValue: 8 },
      { id: "p", label: "Parallelism (p)", type: "number", defaultValue: 1 },
      { id: "length", label: "Derived Length (bytes)", type: "number", defaultValue: 32 },
    ],
  },
  runner: async (node, inputs) => {
    const pwd = getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const N = getNumberField(node, "N", 16384);
    const r = getNumberField(node, "r", 8);
    const p = getNumberField(node, "p", 1);
    const len = getNumberField(node, "length", 32);

    const provider = getProvider("Scrypt") as KdfProvider;
    return provider.derive(pwd, salt, len * 8, { N, r, p });
  },
});

registerNodeDef("bcrypt", {
  meta: {
    kind: "bcrypt",
    label: "bcrypt",
    category: "kdf",
    description: "Password hashing function (bcrypt). Output is $2b$ encoded hash string.",
    defaultOutput: "utf8",
    inputs: [
      { id: "password", label: "Password" },
      { id: "salt", label: "Salt" },
      { id: "hash", label: "Hash", visible: (d) => (d["action"] as string) === "verify" },
    ],
    fields: [
      { id: "rounds", label: "Cost (rounds)", type: "number", defaultValue: 10 },
      {
        id: "action",
        label: "Action",
        type: "select",
        defaultValue: "hash",
        options: [
          { label: "Hash", value: "hash" },
          { label: "Verify", value: "verify" },
        ],
      },
      {
        id: "hash",
        label: "Hash to Verify",
        type: "text",
        placeholder: "$2b$10$...",
        visible: (d) => (d["action"] as string) === "verify",
      },
    ],
  },
  runner: async (node, inputs) => {
    const action = getField(node, "action", "hash");
    const password = bytesToUtf8(
      getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0),
    );
    const saltInput = getParamBytes(node as GraphNode, inputs, "salt", false);

    if (action === "verify") {
      const hashWired = inputs["hash"];
      const hashStr = hashWired ? bytesToUtf8(hashWired) : getField(node, "hash");
      if (!hashStr) throw new Error("Hash is required for verification");
      const match = bcrypt.compareSync(password, hashStr);
      return utf8ToBytes(match ? "Valid" : "Invalid");
    }

    const rounds = getNumberField(node, "rounds", 10);
    const rawSalt = saltInput && saltInput.length > 0 ? bytesToUtf8(saltInput) : "";
    const saltStr = rawSalt.match(/^\$2[abzy]\$\d+\$/) ? rawSalt : bcrypt.genSaltSync(rounds);
    const result = bcrypt.hashSync(password, saltStr);
    return utf8ToBytes(result);
  },
});
