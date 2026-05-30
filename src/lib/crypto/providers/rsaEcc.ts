import { registerProvider, CryptoService, toPEM, type MacProvider } from "../service";
import forge from "node-forge";

registerProvider({
  type: "rsa",
  name: "RSA-OAEP",
  async encrypt(keyRaw, data, params) {
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("spki", keyRaw, "RSA-OAEP", hash, ["encrypt"]);
    return CryptoService.encrypt({ name: "RSA-OAEP" }, key, data);
  },
  async decrypt(keyRaw, data, params) {
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("pkcs8", keyRaw, "RSA-OAEP", hash, ["decrypt"]);
    return CryptoService.decrypt({ name: "RSA-OAEP" }, key, data);
  },
});

registerProvider({
  type: "rsa",
  name: "RSAES-PKCS1-V1_5",
  async encrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PUBLIC KEY");
    const key = forge.pki.publicKeyFromPem(pem);
    const input = String.fromCharCode(...data);
    const output = key.encrypt(input, "RSAES-PKCS1-V1_5");
    return Uint8Array.from(output, (c) => c.charCodeAt(0));
  },
  async decrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PRIVATE KEY");
    const key = forge.pki.privateKeyFromPem(pem);
    const input = String.fromCharCode(...data);
    const output = key.decrypt(input, "RSAES-PKCS1-V1_5");
    return Uint8Array.from(output, (c) => c.charCodeAt(0));
  },
});

registerProvider({
  type: "rsa",
  name: "RAW",
  async encrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PUBLIC KEY");
    const key = forge.pki.publicKeyFromPem(pem);
    const n = (key as any).n as forge.jsbn.BigInteger;
    const e = (key as any).e as forge.jsbn.BigInteger;
    const m = new forge.jsbn.BigInteger(
      Array.from(data)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      16,
    );
    if (m.compareTo(n) >= 0) throw new Error("Data too large for key modulus");
    const c = m.modPow(e, n);
    const nBytes = Math.ceil(n.bitLength() / 8);
    const hex = c.toString(16).padStart(nBytes * 2, "0");
    return new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  },
  async decrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PRIVATE KEY");
    const key = forge.pki.privateKeyFromPem(pem);
    const n = (key as any).n as forge.jsbn.BigInteger;
    const d = (key as any).d as forge.jsbn.BigInteger;
    const c = new forge.jsbn.BigInteger(
      Array.from(data)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      16,
    );
    const m = c.modPow(d, n);
    const nBytes = Math.ceil(n.bitLength() / 8);
    const hex = m.toString(16).padStart(nBytes * 2, "0");
    const trimmed = hex.replace(/^0+/, "") || "0";
    const even = trimmed.length % 2 === 0 ? trimmed : "0" + trimmed;
    return new Uint8Array(even.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  },
});

function makeSignatureProvider(name: "RSASSA-PKCS1-v1_5" | "RSA-PSS" | "ECDSA"): MacProvider {
  return {
    type: "mac",
    name,
    async sign(keyRaw, data, params) {
      const hash = (params?.hash as string) || "SHA-256";
      const isRSA = name.startsWith("RSA");
      const key = isRSA
        ? await CryptoService.importRSAKey("pkcs8", keyRaw, name, hash, ["sign"])
        : await CryptoService.importECKey("pkcs8", keyRaw, "ECDSA", params?.namedCurve as string, [
            "sign",
          ]);

      const signParams: any = { name, hash };
      if (name === "RSA-PSS") signParams.saltLength = 32;

      return CryptoService.sign(signParams, key, data);
    },
    async verify(keyRaw, signature, data, params) {
      const hash = (params?.hash as string) || "SHA-256";
      const isRSA = name.startsWith("RSA");
      const key = isRSA
        ? await CryptoService.importRSAKey("spki", keyRaw, name, hash, ["verify"])
        : await CryptoService.importECKey("spki", keyRaw, "ECDSA", params?.namedCurve as string, [
            "verify",
          ]);

      const signParams: any = { name, hash };
      if (name === "RSA-PSS") signParams.saltLength = 32;

      return CryptoService.verify(signParams, key, signature, data);
    },
  };
}

registerProvider(makeSignatureProvider("RSASSA-PKCS1-v1_5"));
registerProvider(makeSignatureProvider("RSA-PSS"));
registerProvider(makeSignatureProvider("ECDSA"));
