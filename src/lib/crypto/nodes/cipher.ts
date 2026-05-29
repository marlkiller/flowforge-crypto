import type { NodeDef, GraphNode } from "../types";
import {
  ensureBufferSource,
  CryptoService,
  registerProvider,
  getProvider,
  type CipherProvider,
} from "../service";
import { getParamBytes } from "../utils";

// ─── Shared helpers ──────────────────────────────────────────────

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

function pkcs7Pad(data: Uint8Array, blockSize: number): Uint8Array {
  const paddingLen = blockSize - (data.byteLength % blockSize);
  const out = new Uint8Array(data.byteLength + paddingLen);
  out.set(data, 0);
  out.fill(paddingLen, data.byteLength);
  return out;
}

function pkcs7Unpad(data: Uint8Array, blockSize: number): Uint8Array {
  if (data.byteLength === 0 || data.byteLength % blockSize !== 0)
    throw new Error("Invalid padded data length");
  const lastByte = data[data.byteLength - 1];
  if (lastByte < 1 || lastByte > blockSize) throw new Error("Invalid PKCS7 padding value");
  for (let i = data.byteLength - lastByte; i < data.byteLength; i++) {
    if (data[i] !== lastByte) throw new Error("Invalid PKCS7 padding content");
  }
  return data.slice(0, data.byteLength - lastByte);
}

// ─── Raw AES block cipher helpers (via AES-CBC zero-IV trick) ──

const ZERO_IV = new Uint8Array(16);

async function aesImportKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", ensureBufferSource(raw), "AES-CBC", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function aesEncryptBlock(key: CryptoKey, block: Uint8Array): Promise<Uint8Array> {
  const ct = await CryptoService.encrypt({ name: "AES-CBC", iv: ZERO_IV }, key, block);
  return ct.slice(0, 16);
}

async function aesDecryptBlock(key: CryptoKey, block: Uint8Array): Promise<Uint8Array> {
  const pt2 = new Uint8Array(16);
  pt2[15] = 0x01;
  const xorInput = new Uint8Array(16);
  for (let i = 0; i < 16; i++) xorInput[i] = pt2[i] ^ block[i];
  const fakeC2 = await aesEncryptBlock(key, xorInput);
  const combined = new Uint8Array(32);
  combined.set(block, 0);
  combined.set(fakeC2, 16);
  const pt = await CryptoService.decrypt({ name: "AES-CBC", iv: ZERO_IV }, key, combined);
  return pt.slice(0, 16);
}

// ─── AES Provider Factory ──────────────────────────────────────

function makeWebCryptoProvider(
  name: string,
  algoName: string,
  ivSize: number,
  encryptParams: (iv: Uint8Array, aad?: Uint8Array) => Algorithm,
): CipherProvider {
  return {
    type: "cipher",
    name,
    keySizes: [16, 24, 32],
    defaultIvSize: ivSize,
    async encrypt(keyRaw, iv, data, params) {
      const key = await crypto.subtle.importKey(
        "raw",
        ensureBufferSource(keyRaw),
        algoName,
        false,
        ["encrypt"],
      );
      const aad = params?.["aad"] as Uint8Array | undefined;
      return CryptoService.encrypt(encryptParams(iv!, aad), key, data);
    },
    async decrypt(keyRaw, iv, data, params) {
      const key = await crypto.subtle.importKey(
        "raw",
        ensureBufferSource(keyRaw),
        algoName,
        false,
        ["decrypt"],
      );
      const aad = params?.["aad"] as Uint8Array | undefined;
      return CryptoService.decrypt(encryptParams(iv!, aad), key, data);
    },
  };
}

function makeCustomBlockProvider(
  name: string,
  ivSize: number,
  process: (
    key: CryptoKey,
    iv: Uint8Array | null,
    data: Uint8Array,
    action: "encrypt" | "decrypt",
  ) => Promise<Uint8Array>,
): CipherProvider {
  return {
    type: "cipher",
    name,
    keySizes: [16, 24, 32],
    defaultIvSize: ivSize,
    async encrypt(keyRaw, iv, data) {
      const key = await aesImportKey(keyRaw);
      return process(key, iv, data, "encrypt");
    },
    async decrypt(keyRaw, iv, data) {
      const key = await aesImportKey(keyRaw);
      return process(key, iv, data, "decrypt");
    },
  };
}

// ─── Register AES Providers ───────────────────────────────────

// Web Crypto modes
registerProvider(
  makeWebCryptoProvider("AES-CBC-PKCS7", "AES-CBC", 16, (iv) => ({ name: "AES-CBC", iv })),
);
registerProvider(
  makeWebCryptoProvider(
    "AES-GCM",
    "AES-GCM",
    16,
    (iv, aad) => ({ name: "AES-GCM", iv, ...(aad ? { additionalData: aad } : {}) }) as Algorithm,
  ),
);
registerProvider(
  makeWebCryptoProvider("AES-CTR", "AES-CTR", 16, (iv) => ({
    name: "AES-CTR",
    counter: iv,
    length: 64,
  })),
);

// Custom ECB / CBC-NoPad / CFB / OFB

// ECB encrypt/decrypt with PKCS7 padding
async function ecbProcessPKCS7(
  key: CryptoKey,
  _iv: Uint8Array | null,
  data: Uint8Array,
  action: "encrypt" | "decrypt",
) {
  if (action === "encrypt") {
    const padded = pkcs7Pad(data, 16);
    const n = padded.byteLength / 16;
    const out = new Uint8Array(n * 16);
    for (let i = 0; i < n; i++) {
      out.set(await aesEncryptBlock(key, padded.slice(i * 16, (i + 1) * 16)), i * 16);
    }
    return out;
  }
  if (data.byteLength === 0 || data.byteLength % 16 !== 0)
    throw new Error("ECB ciphertext length must be a multiple of 16");
  const n = data.byteLength / 16;
  const out = new Uint8Array(data.byteLength);
  for (let i = 0; i < n; i++) {
    out.set(await aesDecryptBlock(key, data.slice(i * 16, (i + 1) * 16)), i * 16);
  }
  return pkcs7Unpad(out, 16);
}

async function ecbProcessNoPad(
  key: CryptoKey,
  _iv: Uint8Array | null,
  data: Uint8Array,
  action: "encrypt" | "decrypt",
) {
  const lenErr = `ECB NoPadding requires ${action === "encrypt" ? "plaintext" : "ciphertext"} length to be a multiple of 16`;
  if (data.byteLength === 0 || data.byteLength % 16 !== 0) throw new Error(lenErr);
  const n = data.byteLength / 16;
  const out = new Uint8Array(data.byteLength);
  const fn = action === "encrypt" ? aesEncryptBlock : aesDecryptBlock;
  for (let i = 0; i < n; i++) {
    out.set(await fn(key, data.slice(i * 16, (i + 1) * 16)), i * 16);
  }
  return out;
}

registerProvider(makeCustomBlockProvider("AES-ECB-PKCS7", 0, ecbProcessPKCS7));
registerProvider(makeCustomBlockProvider("AES-ECB-None", 0, ecbProcessNoPad));

async function cbcProcessNoPad(
  key: CryptoKey,
  iv: Uint8Array,
  data: Uint8Array,
  action: "encrypt" | "decrypt",
) {
  const lenErr = `CBC NoPadding requires ${action === "encrypt" ? "plaintext" : "ciphertext"} length to be a multiple of 16`;
  if (data.byteLength === 0 || data.byteLength % 16 !== 0) throw new Error(lenErr);
  const n = data.byteLength / 16;
  const out = new Uint8Array(data.byteLength);
  if (action === "encrypt") {
    let prev = iv;
    for (let i = 0; i < n; i++) {
      const block = data.slice(i * 16, (i + 1) * 16);
      const xored = new Uint8Array(16);
      for (let j = 0; j < 16; j++) xored[j] = block[j] ^ prev[j];
      const enc = await aesEncryptBlock(key, xored);
      out.set(enc, i * 16);
      prev = enc;
    }
  } else {
    let prev = iv;
    for (let i = 0; i < n; i++) {
      const block = data.slice(i * 16, (i + 1) * 16);
      const dec = await aesDecryptBlock(key, block);
      for (let j = 0; j < 16; j++) out[i * 16 + j] = dec[j] ^ prev[j];
      prev = block;
    }
  }
  return out;
}

registerProvider(makeCustomBlockProvider("AES-CBC-None", 16, cbcProcessNoPad));

async function cfbProcess(key: CryptoKey, iv: Uint8Array, data: Uint8Array) {
  // CFB-128: C_i = P_i XOR AES_encrypt(C_{i-1}), C_0 = IV — same for enc and dec
  const n = Math.ceil(data.byteLength / 16);
  const out = new Uint8Array(data.byteLength);
  let prev = iv;
  for (let i = 0; i < n; i++) {
    const enc = await aesEncryptBlock(key, prev);
    const end = Math.min((i + 1) * 16, data.byteLength);
    for (let j = 0; j < end - i * 16; j++) out[i * 16 + j] = data[i * 16 + j] ^ enc[j];
    prev = out.slice(i * 16, end);
    if (prev.byteLength < 16) {
      const p = new Uint8Array(16);
      p.set(prev, 0);
      prev = p;
    }
  }
  return out;
}

async function ofbProcess(key: CryptoKey, iv: Uint8Array, data: Uint8Array) {
  // OFB-128: S_i = AES_encrypt(S_{i-1}), C_i = P_i XOR S_i — same for enc and dec
  const n = Math.ceil(data.byteLength / 16);
  const out = new Uint8Array(data.byteLength);
  let feedback = iv;
  for (let i = 0; i < n; i++) {
    feedback = await aesEncryptBlock(key, feedback);
    const end = Math.min((i + 1) * 16, data.byteLength);
    for (let j = 0; j < end - i * 16; j++) out[i * 16 + j] = data[i * 16 + j] ^ feedback[j];
  }
  return out;
}

registerProvider(
  makeCustomBlockProvider("AES-CFB", 16, (key, iv, data) => cfbProcess(key, iv!, data)),
);
registerProvider(
  makeCustomBlockProvider("AES-OFB", 16, (key, iv, data) => ofbProcess(key, iv!, data)),
);

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
      },
      {
        id: "iv",
        label: "IV (Hex)",
        type: "text",
        placeholder: "32-char hex for CBC...",
        visible: (d) => (d["cipherMode"] as string) !== "ECB",
      },
    ],
  },
  runner: async (node, inputs) => {
    const d = node.data;
    const mainInput = inputs["data"] ?? new Uint8Array(0);
    const action = (d["action"] as string) ?? "encrypt";
    const cipherMode = (d["cipherMode"] as string) ?? "ECB";
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");

    if (!keyBytes || keyBytes.length !== 16) {
      throw new Error("SM4 requires a 16-byte (128-bit) key");
    }

    const providerName = `SM4-${cipherMode}`;
    const provider = getProvider(providerName) as CipherProvider;
    if (!provider) throw new Error(`No provider for ${providerName}`);

    const iv =
      cipherMode === "CBC"
        ? getParamBytes(node as GraphNode, inputs, "iv", false)
        : undefined;

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

export const cipherNodes: Record<string, NodeDef> = {
  sm4: sm4NodeDef,
  aes: {
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
        { id: "key", label: "Key (Hex)", type: "password", placeholder: "32/48/64-char hex..." },
        {
          id: "iv",
          label: "IV / Counter (Hex)",
          type: "text",
          placeholder: "All modes = 32 hex chars",
          visible: (d) => (d["cipherMode"] as string) !== "ECB",
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
        },
      ],
    },
    runner: async (node, inputs) => {
      const d = node.data;
      const mainInput = inputs["data"] ?? new Uint8Array(0);
      const action = (d["action"] as string) ?? "encrypt";
      const cipherMode = (d["cipherMode"] as string) ?? "CBC";
      const padding = (d["padding"] as string) ?? "PKCS7";
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
              throw new Error(
                `Insufficient data for IV (expected ${provider.defaultIvSize} bytes)`,
              );
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
  },
  chacha20poly1305: {
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
      const d = node.data;
      const mainInput = inputs["data"] ?? new Uint8Array(0);
      const action = (d["action"] as string) ?? "encrypt";
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
  },
  xchacha20poly1305: {
    meta: {
      kind: "xchacha20poly1305",
      label: "XChaCha20-Poly1305",
      category: "cipher",
      description:
        "Extended-nonce ChaCha20-Poly1305 AEAD with 192-bit nonce for safe random usage.",
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
      const d = node.data;
      const mainInput = inputs["data"] ?? new Uint8Array(0);
      const action = (d["action"] as string) ?? "encrypt";
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
  },
  aesGcmSiv: {
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
      const d = node.data;
      const mainInput = inputs["data"] ?? new Uint8Array(0);
      const action = (d["action"] as string) ?? "encrypt";
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
  },
};
