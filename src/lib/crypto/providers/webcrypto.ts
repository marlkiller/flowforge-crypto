import { registerProvider, CryptoService, type MacProvider } from "../service";

registerProvider({
  type: "hash",
  name: "SHA-1",
  digest(data) {
    return CryptoService.digest("SHA-1", data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA-256",
  digest(data) {
    return CryptoService.digest("SHA-256", data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA-384",
  digest(data) {
    return CryptoService.digest("SHA-384", data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA-512",
  digest(data) {
    return CryptoService.digest("SHA-512", data);
  },
});

function makeHmacProvider(hash: string): MacProvider {
  return {
    type: "mac",
    name: `HMAC-${hash}`,
    async sign(keyRaw, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: "HMAC", hash }, false, [
        "sign",
      ]);
      return CryptoService.sign({ name: "HMAC" }, key, data);
    },
    async verify(keyRaw, signature, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: "HMAC", hash }, false, [
        "verify",
      ]);
      return CryptoService.verify({ name: "HMAC" }, key, signature, data);
    },
  };
}

registerProvider(makeHmacProvider("SHA-1"));
registerProvider(makeHmacProvider("SHA-256"));
registerProvider(makeHmacProvider("SHA-384"));
registerProvider(makeHmacProvider("SHA-512"));
