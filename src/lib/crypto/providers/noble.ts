import { registerProvider } from "../service";
import { HMAC_ALGOS, makeNobleHmacProvider } from "./hmacLogic";
import { md5, ripemd160 } from "@noble/hashes/legacy.js";
import { sha3_256, sha3_384, sha3_512, keccak_256, shake128_32, shake256_64 } from "@noble/hashes/sha3.js";
import { blake2b, blake2s } from "@noble/hashes/blake2.js";
import { blake3 } from "@noble/hashes/blake3.js";
import { chacha20poly1305, xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { gcmsiv, cmac } from "@noble/ciphers/aes.js";
import { poly1305 } from "@noble/ciphers/_poly1305.js";

registerProvider({
  type: "hash",
  name: "MD5",
  async digest(data) {
    return md5(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA3-256",
  async digest(data) {
    return sha3_256(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA3-384",
  async digest(data) {
    return sha3_384(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA3-512",
  async digest(data) {
    return sha3_512(data);
  },
});

registerProvider({
  type: "hash",
  name: "Keccak-256",
  async digest(data) {
    return keccak_256(data);
  },
});

for (const [name, { fn, block }] of Object.entries(HMAC_ALGOS)) {
  registerProvider(makeNobleHmacProvider(name, fn, block));
}

registerProvider({
  type: "hash",
  name: "BLAKE2b",
  async digest(data) {
    return blake2b(data);
  },
});

registerProvider({
  type: "hash",
  name: "BLAKE2s",
  async digest(data) {
    return blake2s(data);
  },
});

registerProvider({
  type: "hash",
  name: "BLAKE3",
  async digest(data) {
    return blake3(data);
  },
});

registerProvider({
  type: "hash",
  name: "RIPEMD-160",
  async digest(data) {
    return ripemd160(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHAKE128",
  async digest(data) {
    return shake128_32(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHAKE256",
  async digest(data) {
    return shake256_64(data);
  },
});

registerProvider({
  type: "cipher",
  name: "ChaCha20-Poly1305",
  keySizes: [32],
  defaultIvSize: 12,
  async encrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for ChaCha20-Poly1305");
    return chacha20poly1305(key, iv).encrypt(data);
  },
  async decrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for ChaCha20-Poly1305");
    return chacha20poly1305(key, iv).decrypt(data);
  },
});

registerProvider({
  type: "cipher",
  name: "XChaCha20-Poly1305",
  keySizes: [32],
  defaultIvSize: 24,
  async encrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for XChaCha20-Poly1305");
    return xchacha20poly1305(key, iv).encrypt(data);
  },
  async decrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for XChaCha20-Poly1305");
    return xchacha20poly1305(key, iv).decrypt(data);
  },
});

registerProvider({
  type: "cipher",
  name: "AES-GCM-SIV",
  keySizes: [16, 32],
  defaultIvSize: 12,
  async encrypt(key, iv, data, params) {
    if (!iv) throw new Error("IV is required for AES-GCM-SIV");
    const aad = (params?.aad as Uint8Array) || new Uint8Array(0);
    return gcmsiv(key, iv, aad).encrypt(data);
  },
  async decrypt(key, iv, data, params) {
    if (!iv) throw new Error("IV is required for AES-GCM-SIV");
    const aad = (params?.aad as Uint8Array) || new Uint8Array(0);
    return gcmsiv(key, iv, aad).decrypt(data);
  },
});

registerProvider({
  type: "mac",
  name: "Poly1305",
  async sign(key, data) {
    if (key.length !== 32) throw new Error("Poly1305 requires a 32-byte key");
    return poly1305(data, key);
  },
  async verify(key, signature, data) {
    const expected = await this.sign(key, data);
    if (signature.length !== expected.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) result |= signature[i] ^ expected[i];
    return result === 0;
  },
});

registerProvider({
  type: "mac",
  name: "CMAC",
  async sign(key, data) {
    if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
      throw new Error("CMAC requires a 16/24/32-byte AES key");
    }
    return cmac(data, key);
  },
  async verify(key, signature, data) {
    const expected = await this.sign(key, data);
    if (signature.length !== expected.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) result |= signature[i] ^ expected[i];
    return result === 0;
  },
});
