import { registerNodeDef } from "../registry";
import type { NodeDef, GraphNode } from "../types";
import type { CipherProvider } from "../service";
import { getProvider } from "../service";
import { getField, getParamBytes, validateHex } from "../utils";

function validateKeyLength(key: Uint8Array) {
  const kl = key.byteLength;
  if (kl !== 16 && kl !== 24 && kl !== 32) {
    throw new Error(
      `Invalid key length: ${kl} bytes. Must be 16 (AES-128), 24 (AES-192), or 32 (AES-256) bytes.`,
    );
  }
}

function validateIvLength(iv: Uint8Array | undefined, reqLen: number) {
  if (iv && iv.byteLength !== reqLen) {
    throw new Error(`Invalid IV length: ${iv.byteLength} bytes. Required: ${reqLen} bytes.`);
  }
}

// ─── SM4 Node Definition ─────────────────────────────────────

const sm4NodeDef: NodeDef = {
  meta: {
    kind: "sm4",
    label: "SM4",
    category: "cipher",
    description:
      "SM4 block cipher (Chinese national standard, GB/T 32907-2016). 128-bit key. Modes: ECB, CBC.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data" },
      { id: "key", label: "Key" },
      { id: "iv", label: "IV", visible: (d) => (d["cipherMode"] as string) !== "ECB" },
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
        id: "cipherMode",
        label: "Mode",
        type: "select",
        defaultValue: "ECB",
        options: [
          { label: "ECB", value: "ECB" },
          { label: "CBC", value: "CBC" },
        ],
      },
      {
        id: "key",
        label: "Key (Hex)",
        type: "password",
        placeholder: "32-char hex (128-bit)...",
        validate: validateHex(16),
      },
      {
        id: "iv",
        label: "IV (Hex)",
        type: "text",
        placeholder: "32-char hex for CBC...",
        visible: (d) => (d["cipherMode"] as string) !== "ECB",
        validate: validateHex(16),
      },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const cipherMode = getField(node, "cipherMode", "ECB");
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");

    if (!keyBytes || keyBytes.length !== 16) {
      throw new Error("SM4 requires a 16-byte (128-bit) key");
    }

    const providerName = `SM4-${cipherMode}`;
    const provider = getProvider(providerName) as CipherProvider;
    if (!provider) throw new Error(`No provider for ${providerName}`);

    const iv =
      cipherMode === "CBC" ? getParamBytes(node as GraphNode, inputs, "iv", false) : undefined;

    if (cipherMode === "CBC" && iv && iv.length !== 16) {
      throw new Error("SM4-CBC requires a 16-byte IV");
    }

    try {
      if (action === "decrypt") {
        const actualIv = iv || mainInput.slice(0, 16);
        const ct = iv ? mainInput : mainInput.slice(16);
        if (cipherMode === "CBC") {
          return provider.decrypt(keyBytes, actualIv, ct);
        }
        return provider.decrypt(keyBytes, null, ct);
      } else {
        if (cipherMode === "CBC") {
          const actualIv = iv || crypto.getRandomValues(new Uint8Array(16));
          const ct = await provider.encrypt(keyBytes, actualIv, mainInput);
          if (iv) return ct;
          const out = new Uint8Array(actualIv.length + ct.length);
          out.set(actualIv, 0);
          out.set(ct, actualIv.length);
          return out;
        }
        return provider.encrypt(keyBytes, null, mainInput);
      }
    } catch (e) {
      throw new Error(`SM4 ${action} failed: ${(e as Error).message}`);
    }
  },
};

// ─── Provider lookup helper ────────────────────────────────────

function getAesProvider(mode: string, padding: string): CipherProvider | undefined {
  if (mode === "CBC" && padding === "PKCS7") return getProvider("AES-CBC-PKCS7") as CipherProvider;
  if (mode === "CBC" && padding === "None") return getProvider("AES-CBC-None") as CipherProvider;
  if (mode === "ECB" && padding === "PKCS7") return getProvider("AES-ECB-PKCS7") as CipherProvider;
  if (mode === "ECB" && padding === "None") return getProvider("AES-ECB-None") as CipherProvider;
  return getProvider(`AES-${mode}`) as CipherProvider | undefined;
}

// ─── AES Node Definition ──────────────────────────────────────

registerNodeDef("sm4", sm4NodeDef);

registerNodeDef("aes", {
  meta: {
    kind: "aes",
    label: "AES",
    category: "cipher",
    description: "AES encrypt/decrypt. Key: 32/48/64-char hex. IV sizes vary by mode.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data" },
      { id: "key", label: "Key" },
      { id: "iv", label: "IV", visible: (d) => (d["cipherMode"] as string) !== "ECB" },
      { id: "aad", label: "AAD", visible: (d) => (d["cipherMode"] as string) === "GCM" },
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
        id: "cipherMode",
        label: "Mode",
        type: "select",
        options: [
          { label: "CBC", value: "CBC" },
          { label: "GCM", value: "GCM" },
          { label: "CTR", value: "CTR" },
          { label: "ECB", value: "ECB" },
          { label: "CFB", value: "CFB" },
          { label: "OFB", value: "OFB" },
        ],
      },
      {
        id: "key",
        label: "Key (Hex)",
        type: "password",
        placeholder: "32/48/64-char hex...",
        validate: validateHex([16, 24, 32]),
      },
      {
        id: "iv",
        label: "IV / Counter (Hex)",
        type: "text",
        placeholder: "All modes = 32 hex chars",
        visible: (d) => (d["cipherMode"] as string) !== "ECB",
        validate: validateHex(16),
      },
      {
        id: "padding",
        label: "Padding",
        type: "select",
        options: [
          { label: "PKCS7", value: "PKCS7" },
          { label: "None", value: "None" },
        ],
        visible: (d) => {
          const m = d["cipherMode"] as string;
          return m === "ECB" || m === "CBC";
        },
      },
      {
        id: "aad",
        label: "AAD (Hex)",
        type: "text",
        placeholder: "optional hex for GCM...",
        visible: (d) => (d["cipherMode"] as string) === "GCM",
        validate: validateHex(),
      },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const cipherMode = getField(node, "cipherMode", "CBC");
    const padding = getField(node, "padding", "PKCS7");
    const provider = getAesProvider(cipherMode, padding);
    if (!provider) throw new Error(`No provider for AES-${cipherMode} (padding: ${padding})`);

    const keyBytes = getParamBytes(node as GraphNode, inputs, "key")!;
    validateKeyLength(keyBytes);

    const iv = getParamBytes(node as GraphNode, inputs, "iv", false);
    validateIvLength(iv, provider.defaultIvSize);

    const aad =
      cipherMode === "GCM" ? getParamBytes(node as GraphNode, inputs, "aad", false) : undefined;

    try {
      if (action === "decrypt") {
        const actualIv = iv || mainInput.slice(0, provider.defaultIvSize);
        const ct = iv ? mainInput : mainInput.slice(provider.defaultIvSize);

        if (provider.defaultIvSize > 0) {
          if (!actualIv || actualIv.byteLength !== provider.defaultIvSize) {
            throw new Error(`Insufficient data for IV (expected ${provider.defaultIvSize} bytes)`);
          }
        }
        return provider.decrypt(keyBytes, actualIv, ct, { aad });
      } else {
        const actualIv = iv || crypto.getRandomValues(new Uint8Array(provider.defaultIvSize));
        const ct = await provider.encrypt(keyBytes, actualIv, mainInput, { aad });
        if (iv) return ct;
        const out = new Uint8Array(actualIv.length + ct.length);
        out.set(actualIv, 0);
        out.set(ct, actualIv.length);
        return out;
      }
    } catch (e) {
      throw new Error(`AES ${action} failed: ${(e as Error).message}`);
    }
  },
});

registerNodeDef("chacha20poly1305", {
  meta: {
    kind: "chacha20poly1305",
    label: "ChaCha20-Poly1305",
    category: "cipher",
    description: "Modern Authenticated Encryption (AEAD) with 256-bit key and 96-bit nonce.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data" },
      { id: "key", label: "Key" },
      { id: "iv", label: "Nonce (IV)" },
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
        id: "key",
        label: "Key (Hex)",
        type: "password",
        placeholder: "64-char hex (256-bit)...",
      },
      { id: "iv", label: "Nonce (Hex)", type: "text", placeholder: "24-char hex (96-bit)..." },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
    const iv = getParamBytes(node as GraphNode, inputs, "iv", false);

    if (!keyBytes || keyBytes.length !== 32) throw new Error("ChaCha20 requires a 32-byte key");

    const provider = getProvider("ChaCha20-Poly1305") as CipherProvider;
    if (!provider) throw new Error("ChaCha20-Poly1305 provider not found");

    if (action === "decrypt") {
      const actualIv = iv || mainInput.slice(0, 12);
      const ct = iv ? mainInput : mainInput.slice(12);
      return provider.decrypt(keyBytes, actualIv, ct);
    } else {
      const actualIv = iv || crypto.getRandomValues(new Uint8Array(12));
      const ct = await provider.encrypt(keyBytes, actualIv, mainInput);
      if (iv) return ct;
      const out = new Uint8Array(actualIv.length + ct.length);
      out.set(actualIv, 0);
      out.set(ct, actualIv.length);
      return out;
    }
  },
});

registerNodeDef("xchacha20poly1305", {
  meta: {
    kind: "xchacha20poly1305",
    label: "XChaCha20-Poly1305",
    category: "cipher",
    description: "Extended-nonce ChaCha20-Poly1305 AEAD with 192-bit nonce for safe random usage.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data" },
      { id: "key", label: "Key" },
      { id: "iv", label: "Nonce (IV)" },
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
        id: "key",
        label: "Key (Hex)",
        type: "password",
        placeholder: "64-char hex (256-bit)...",
      },
      { id: "iv", label: "Nonce (Hex)", type: "text", placeholder: "48-char hex (192-bit)..." },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
    const iv = getParamBytes(node as GraphNode, inputs, "iv", false);

    if (!keyBytes || keyBytes.length !== 32) throw new Error("XChaCha20 requires a 32-byte key");

    const provider = getProvider("XChaCha20-Poly1305") as CipherProvider;
    if (!provider) throw new Error("XChaCha20-Poly1305 provider not found");

    if (action === "decrypt") {
      const actualIv = iv || mainInput.slice(0, 24);
      const ct = iv ? mainInput : mainInput.slice(24);
      return provider.decrypt(keyBytes, actualIv, ct);
    } else {
      const actualIv = iv || crypto.getRandomValues(new Uint8Array(24));
      const ct = await provider.encrypt(keyBytes, actualIv, mainInput);
      if (iv) return ct;
      const out = new Uint8Array(actualIv.length + ct.length);
      out.set(actualIv, 0);
      out.set(ct, actualIv.length);
      return out;
    }
  },
});

registerNodeDef("aesGcmSiv", {
  meta: {
    kind: "aesGcmSiv",
    label: "AES-GCM-SIV",
    category: "cipher",
    description: "Nonce-misuse resistant AEAD (AES-GCM-SIV). Key: 16 or 32 bytes.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data" },
      { id: "key", label: "Key" },
      { id: "iv", label: "Nonce (IV)" },
      { id: "aad", label: "AAD" },
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
      { id: "key", label: "Key (Hex)", type: "password", placeholder: "32 or 64-char hex..." },
      { id: "iv", label: "Nonce (Hex)", type: "text", placeholder: "24-char hex (96-bit)..." },
      { id: "aad", label: "AAD (Hex)", type: "text", placeholder: "optional hex..." },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
    const iv = getParamBytes(node as GraphNode, inputs, "iv", false);
    const aad = getParamBytes(node as GraphNode, inputs, "aad", false) ?? new Uint8Array(0);

    if (!keyBytes || (keyBytes.length !== 16 && keyBytes.length !== 32)) {
      throw new Error("AES-GCM-SIV requires a 16 or 32-byte key");
    }

    const provider = getProvider("AES-GCM-SIV") as CipherProvider;
    if (!provider) throw new Error("AES-GCM-SIV provider not found");

    if (action === "decrypt") {
      const actualIv = iv || mainInput.slice(0, 12);
      const ct = iv ? mainInput : mainInput.slice(12);
      return provider.decrypt(keyBytes, actualIv, ct, { aad });
    } else {
      const actualIv = iv || crypto.getRandomValues(new Uint8Array(12));
      const ct = await provider.encrypt(keyBytes, actualIv, mainInput, { aad });
      if (iv) return ct;
      const out = new Uint8Array(actualIv.length + ct.length);
      out.set(actualIv, 0);
      out.set(ct, actualIv.length);
      return out;
    }
  },
});
