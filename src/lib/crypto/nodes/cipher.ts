import { registerNodeDef } from "../registry";
import type { NodeDef, GraphNode } from "../types";
import type { CipherProvider } from "../service";
import { getProvider } from "../service";
import { getField, getParamBytes, validateHex, cipherEncrypt, cipherDecrypt } from "../utils";

function validateKeyLength(key: Uint8Array) {
  const kl = key.byteLength;
  if (kl !== 16 && kl !== 24 && kl !== 32) {
    throw new Error(
      `Invalid key length: ${kl} bytes. Must be 16 (AES-128), 24 (AES-192), or 32 (AES-256) bytes.`,
    );
  }
}

function validateIvLength(iv: Uint8Array | undefined, reqLen: number, mode?: string) {
  if (iv) {
    if (mode === "GCM" && (iv.byteLength === 12 || iv.byteLength === 16)) return;
    if (iv.byteLength !== reqLen) {
      throw new Error(`Invalid IV length: ${iv.byteLength} bytes. Required: ${reqLen} bytes.`);
    }
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
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "32-char hex (128-bit)...",
        validate: validateHex(16),
      },
      {
        id: "iv",
        label: "IV",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "32-char hex for CBC...",
        visible: (d) => (d["cipherMode"] as string) !== "ECB",
        validate: validateHex(16),
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        connectable: false,
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
      },
      {
        id: "cipherMode",
        label: "Mode",
        type: "select",
        connectable: false,
        defaultValue: "ECB",
        options: [
          { label: "ECB", value: "ECB" },
          { label: "CBC", value: "CBC" },
        ],
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

    const ivSize = cipherMode === "CBC" ? 16 : 0;
    const iv = ivSize > 0 ? getParamBytes(node as GraphNode, inputs, "iv", false) : undefined;

    try {
      if (action === "decrypt") {
        return cipherDecrypt(provider, keyBytes, mainInput, iv, ivSize);
      } else {
        return await cipherEncrypt(provider, keyBytes, mainInput, iv, ivSize);
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
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "32/48/64-char hex...",
        validate: validateHex([16, 24, 32]),
      },
      {
        id: "iv",
        label: "IV / Counter",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "All modes = 32 hex chars",
        visible: (d) => (d["cipherMode"] as string) !== "ECB",
        validate: validateHex([12, 16]),
      },
      {
        id: "aad",
        label: "AAD",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "optional hex for GCM...",
        visible: (d) => (d["cipherMode"] as string) === "GCM",
        validate: validateHex(),
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        connectable: false,
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
      },
      {
        id: "cipherMode",
        label: "Mode",
        type: "select",
        connectable: false,
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
        id: "padding",
        label: "Padding",
        type: "select",
        connectable: false,
        options: [
          { label: "PKCS7", value: "PKCS7" },
          { label: "None", value: "None" },
        ],
        visible: (d) => {
          const m = d["cipherMode"] as string;
          return m === "ECB" || m === "CBC";
        },
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

    const ivSize = provider.defaultIvSize;
    const iv = ivSize > 0 ? getParamBytes(node as GraphNode, inputs, "iv", false) : undefined;
    if (iv) validateIvLength(iv, ivSize, cipherMode);

    const params: Record<string, unknown> | undefined =
      cipherMode === "GCM"
        ? { aad: getParamBytes(node as GraphNode, inputs, "aad", false) }
        : undefined;

    try {
      if (action === "decrypt") {
        return cipherDecrypt(provider, keyBytes, mainInput, iv, ivSize, params);
      } else {
        return await cipherEncrypt(provider, keyBytes, mainInput, iv, ivSize, params);
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
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "64-char hex (256-bit)...",
      },
      {
        id: "iv",
        label: "Nonce",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "24-char hex (96-bit)...",
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        connectable: false,
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
      },
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
      return cipherDecrypt(provider, keyBytes, mainInput, iv, 12);
    } else {
      return await cipherEncrypt(provider, keyBytes, mainInput, iv, 12);
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
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "64-char hex (256-bit)...",
      },
      {
        id: "iv",
        label: "Nonce",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "48-char hex (192-bit)...",
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        connectable: false,
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
      },
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
      return cipherDecrypt(provider, keyBytes, mainInput, iv, 24);
    } else {
      return await cipherEncrypt(provider, keyBytes, mainInput, iv, 24);
    }
  },
});

registerNodeDef("xsalsa20poly1305", {
  meta: {
    kind: "xsalsa20poly1305",
    label: "XSalsa20-Poly1305",
    category: "cipher",
    description: "Xsalsa20-Poly1305 AEAD (libsodium secretbox, 256-bit key, 192-bit nonce).",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "64-char hex (256-bit)...",
      },
      {
        id: "iv",
        label: "Nonce",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "48-char hex (192-bit)...",
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        connectable: false,
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
      },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
    const iv = getParamBytes(node as GraphNode, inputs, "iv", false);

    if (!keyBytes || keyBytes.length !== 32) throw new Error("XSalsa20 requires a 32-byte key");

    const provider = getProvider("XSalsa20-Poly1305") as CipherProvider;
    if (!provider) throw new Error("XSalsa20-Poly1305 provider not found");

    if (action === "decrypt") {
      return cipherDecrypt(provider, keyBytes, mainInput, iv, 24);
    } else {
      return await cipherEncrypt(provider, keyBytes, mainInput, iv, 24);
    }
  },
});

registerNodeDef("twofish", {
  meta: {
    kind: "twofish",
    label: "Twofish",
    category: "cipher",
    description: "Twofish block cipher (AES finalist, 128-bit block, 128/192/256-bit key).",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "32/48/64-char hex...",
      },
      {
        id: "iv",
        label: "IV",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "32-char hex for CBC...",
        visible: (d) => (d["cipherMode"] as string) !== "ECB",
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        connectable: false,
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
      },
      {
        id: "cipherMode",
        label: "Mode",
        type: "select",
        connectable: false,
        defaultValue: "CBC",
        options: [
          { label: "CBC", value: "CBC" },
          { label: "ECB", value: "ECB" },
        ],
      },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const cipherMode = getField(node, "cipherMode", "CBC");
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");

    if (!keyBytes) throw new Error("Key is required");

    const providerName = `Twofish-${cipherMode}`;
    const provider = getProvider(providerName) as CipherProvider;
    if (!provider) throw new Error(`No provider for ${providerName}`);

    const ivSize = cipherMode === "CBC" ? 16 : 0;
    const iv = ivSize > 0 ? getParamBytes(node as GraphNode, inputs, "iv", false) : undefined;

    try {
      if (action === "decrypt") {
        return cipherDecrypt(provider, keyBytes, mainInput, iv, ivSize);
      } else {
        return await cipherEncrypt(provider, keyBytes, mainInput, iv, ivSize);
      }
    } catch (e) {
      throw new Error(`Twofish ${action} failed: ${(e as Error).message}`);
    }
  },
});

registerNodeDef("salsa20", {
  meta: {
    kind: "salsa20",
    label: "Salsa20",
    category: "cipher",
    description: "Salsa20 stream cipher (eSTREAM winner, 256-bit key, 64-bit nonce).",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "64-char hex (256-bit)...",
      },
      {
        id: "iv",
        label: "Nonce",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "16-char hex (64-bit)...",
      },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
    const iv = getParamBytes(node as GraphNode, inputs, "iv", false);

    if (!keyBytes || keyBytes.length !== 32) throw new Error("Salsa20 requires a 32-byte key");
    if (!iv || iv.length !== 8) throw new Error("Salsa20 requires an 8-byte nonce");

    const provider = getProvider("Salsa20") as CipherProvider;
    if (!provider) throw new Error("Salsa20 provider not found");

    return provider.encrypt(keyBytes, iv, mainInput);
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
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "32 or 64-char hex...",
      },
      {
        id: "iv",
        label: "Nonce",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "24-char hex (96-bit)...",
      },
      {
        id: "aad",
        label: "AAD",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "optional hex...",
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        connectable: false,
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
      },
    ],
  },
  runner: async (node, inputs) => {
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = getField(node, "action", "encrypt");
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
    const iv = getParamBytes(node as GraphNode, inputs, "iv", false);
    const aad = getParamBytes(node as GraphNode, inputs, "aad", false);

    if (!keyBytes || (keyBytes.length !== 16 && keyBytes.length !== 32)) {
      throw new Error("AES-GCM-SIV requires a 16 or 32-byte key");
    }

    const provider = getProvider("AES-GCM-SIV") as CipherProvider;
    if (!provider) throw new Error("AES-GCM-SIV provider not found");

    const params = aad ? { aad } : undefined;

    if (action === "decrypt") {
      return cipherDecrypt(provider, keyBytes, mainInput, iv, 12, params);
    } else {
      return await cipherEncrypt(provider, keyBytes, mainInput, iv, 12, params);
    }
  },
});
