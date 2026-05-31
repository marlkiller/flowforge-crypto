import {
  registerProvider,
  CryptoService,
  ensureBufferSource,
  type CipherProvider,
} from "../service";

function makeAesProvider(mode: "CBC" | "GCM" | "CTR"): CipherProvider {
  return {
    type: "cipher",
    name: `AES-${mode}`,
    keySizes: [16, 24, 32],
    defaultIvSize: mode === "GCM" ? 12 : 16,
    async encrypt(keyRaw, iv, data) {
      const key = await CryptoService.importKey(
        "raw",
        keyRaw,
        { name: `AES-${mode}` } as any,
        false,
        ["encrypt"],
      );
      const params: any = { name: `AES-${mode}` };
      if (mode === "CBC") params.iv = iv;
      if (mode === "GCM") params.iv = iv;
      if (mode === "CTR") {
        params.counter = iv;
        params.length = 64;
      }
      return CryptoService.encrypt(params, key, data);
    },
    async decrypt(keyRaw, iv, data) {
      const key = await CryptoService.importKey(
        "raw",
        keyRaw,
        { name: `AES-${mode}` } as any,
        false,
        ["decrypt"],
      );
      const params: any = { name: `AES-${mode}` };
      if (mode === "CBC") params.iv = iv;
      if (mode === "GCM") params.iv = iv;
      if (mode === "CTR") {
        params.counter = iv;
        params.length = 64;
      }
      return CryptoService.decrypt(params, key, data);
    },
  };
}

registerProvider(makeAesProvider("CBC"));
registerProvider(makeAesProvider("GCM"));
registerProvider(makeAesProvider("CTR"));

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

registerProvider(
  makeWebCryptoProvider("AES-CBC-PKCS7", "AES-CBC", 16, (iv) => ({ name: "AES-CBC", iv })),
);
registerProvider(
  makeWebCryptoProvider(
    "AES-GCM",
    "AES-GCM",
    12,
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
