import { registerProvider, CryptoService } from "../service";
import { argon2id, argon2i, argon2d } from "@noble/hashes/argon2.js";
import { scrypt } from "@noble/hashes/scrypt.js";

registerProvider({
  type: "kdf",
  name: "PBKDF2",
  async derive(password, salt, length, params) {
    const baseKey = await CryptoService.importKey("raw", password, "PBKDF2", false, ["deriveBits"]);
    return CryptoService.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: (params?.iterations as number) || 100000,
        hash: (params?.hash as string) || "SHA-256",
      } as any,
      baseKey,
      length,
    );
  },
});

registerProvider({
  type: "kdf",
  name: "HKDF",
  async derive(ikm, salt, length, params) {
    const baseKey = await CryptoService.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    return CryptoService.deriveBits(
      {
        name: "HKDF",
        salt,
        info: (params?.info as Uint8Array) || new Uint8Array(0),
        hash: (params?.hash as string) || "SHA-256",
      } as any,
      baseKey,
      length,
    );
  },
});

registerProvider({
  type: "kdf",
  name: "Argon2",
  async derive(password, salt, length, params) {
    const type = (params?.type as string) || "id";
    const opts = {
      t: (params?.t as number) || 3,
      m: (params?.m as number) || 65536,
      p: (params?.p as number) || 1,
      dkLen: length / 8, // length is in bits, argon2 expects bytes
    };
    if (type === "id") return argon2id(password, salt, opts);
    if (type === "i") return argon2i(password, salt, opts);
    return argon2d(password, salt, opts);
  },
});

registerProvider({
  type: "kdf",
  name: "Scrypt",
  async derive(password, salt, length, params) {
    return scrypt(password, salt, {
      N: (params?.N as number) || 16384,
      r: (params?.r as number) || 8,
      p: (params?.p as number) || 1,
      dkLen: length / 8,
    });
  },
});
