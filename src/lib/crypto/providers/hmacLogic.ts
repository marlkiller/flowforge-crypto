import { md5, ripemd160 } from "@noble/hashes/legacy.js";
import { sha224, sha512_224, sha512_256 } from "@noble/hashes/sha2.js";
import { sha3_224, sha3_256, sha3_384, sha3_512, keccak_224, keccak_256, keccak_384, keccak_512, shake128_32, shake256_64 } from "@noble/hashes/sha3.js";
import { blake2b, blake2s } from "@noble/hashes/blake2.js";
import { blake3 } from "@noble/hashes/blake3.js";
import { blake224, blake256, blake384, blake512 } from "@noble/hashes/blake1.js";
import { sm3 as sm3Hash } from "sm-crypto";
import { whirlpool, whirlpool0, whirlpoolT, sha0 } from "./extraHashes";
import type { MacProvider } from "../service";

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function hmacCore(
  hashFn: (data: Uint8Array) => Uint8Array,
  blockSize: number,
  key: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  if (key.length > blockSize) key = hashFn(key);
  if (key.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(key);
    key = padded;
  }
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = key[i]! ^ 0x36;
    opad[i] = key[i]! ^ 0x5c;
  }
  const inner = new Uint8Array(blockSize + data.length);
  inner.set(ipad);
  inner.set(data, blockSize);
  const innerHash = hashFn(inner);
  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, blockSize);
  return hashFn(outer);
}

export function makeNobleHmacProvider(
  hashName: string,
  hashFn: (data: Uint8Array) => Uint8Array,
  blockSize: number,
): MacProvider {
  return {
    type: "mac",
    name: `HMAC-${hashName}`,
    async sign(keyRaw, data) {
      return hmacCore(hashFn, blockSize, keyRaw, data);
    },
    async verify(keyRaw, signature, data) {
      const expected = await this.sign!(keyRaw, data);
      if (expected.length !== signature.length) return false;
      let ok = 0;
      for (let i = 0; i < expected.length; i++) ok |= expected[i]! ^ signature[i]!;
      return ok === 0;
    },
  };
}

export const HMAC_ALGOS: Record<string, { fn: (d: Uint8Array) => Uint8Array; block: number }> = {
  "MD5":          { fn: md5,          block: 64 },
  "SHA3-256":     { fn: sha3_256,     block: 136 },
  "SHA3-384":     { fn: sha3_384,     block: 104 },
  "SHA3-512":     { fn: sha3_512,     block: 72 },
  "Keccak-256":   { fn: keccak_256,   block: 136 },
  "BLAKE2b":      { fn: blake2b,      block: 128 },
  "BLAKE2s":      { fn: blake2s,      block: 64 },
  "BLAKE3":       { fn: blake3,       block: 64 },
  "RIPEMD-160":   { fn: ripemd160,    block: 64 },
  "SHAKE128":     { fn: shake128_32,  block: 168 },
  "SHAKE256":     { fn: shake256_64,  block: 136 },
  "SHA-224":      { fn: sha224,       block: 64 },
  "SHA-512/224":  { fn: sha512_224,   block: 128 },
  "SHA-512/256":  { fn: sha512_256,   block: 128 },
  "SHA3-224":     { fn: sha3_224,     block: 144 },
  "Keccak-224":   { fn: keccak_224,   block: 144 },
  "Keccak-384":   { fn: keccak_384,   block: 104 },
  "Keccak-512":   { fn: keccak_512,   block: 72 },
  "BLAKE-224":    { fn: blake224,     block: 64 },
  "BLAKE-256":    { fn: blake256,     block: 64 },
  "BLAKE-384":    { fn: blake384,     block: 64 },
  "BLAKE-512":    { fn: blake512,     block: 64 },
  "SM3":          { fn: (d) => fromHex(sm3Hash(d)), block: 64 },
  "Whirlpool":    { fn: whirlpool,    block: 64 },
  "Whirlpool-0":  { fn: whirlpool0,   block: 64 },
  "Whirlpool-T":  { fn: whirlpoolT,   block: 64 },
  "SHA-0":        { fn: sha0,         block: 64 },
};
