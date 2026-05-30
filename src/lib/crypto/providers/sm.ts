import { registerProvider, bytesToHex, hexToBytes } from "../service";
import { sm3 as sm3Hash, sm4 as sm4Cipher } from "sm-crypto";

registerProvider({
  type: "hash",
  name: "SM3",
  async digest(data) {
    const result = sm3Hash(data);
    return hexToBytes(result);
  },
});

registerProvider({
  type: "cipher",
  name: "SM4-ECB",
  keySizes: [16],
  defaultIvSize: 0,
  async encrypt(key, _iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    const keyHex = bytesToHex(key);
    const result = sm4Cipher.encrypt(data, keyHex, { mode: "ecb" });
    return hexToBytes(result);
  },
  async decrypt(key, _iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    const keyHex = bytesToHex(key);
    const dataHex = bytesToHex(data);
    const result = sm4Cipher.decrypt(dataHex, keyHex, {
      mode: "ecb",
      output: "array",
    }) as number[];
    return new Uint8Array(result);
  },
});

registerProvider({
  type: "cipher",
  name: "SM4-CBC",
  keySizes: [16],
  defaultIvSize: 16,
  async encrypt(key, iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    if (!iv || iv.length !== 16) throw new Error("SM4-CBC requires a 16-byte IV");
    const keyHex = bytesToHex(key);
    const ivHex = bytesToHex(iv);
    const result = sm4Cipher.encrypt(data, keyHex, {
      mode: "cbc",
      iv: ivHex,
    });
    return hexToBytes(result);
  },
  async decrypt(key, iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    if (!iv || iv.length !== 16) throw new Error("SM4-CBC requires a 16-byte IV");
    const keyHex = bytesToHex(key);
    const ivHex = bytesToHex(iv);
    const dataHex = bytesToHex(data);
    const result = sm4Cipher.decrypt(dataHex, keyHex, {
      mode: "cbc",
      iv: ivHex,
      output: "array",
    }) as number[];
    return new Uint8Array(result);
  },
});
