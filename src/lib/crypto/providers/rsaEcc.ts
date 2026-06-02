import { registerProvider, CryptoService, toPEM, type MacProvider, parseBytes } from "../service";
import forge from "node-forge";

/**
 * Ensures key bytes are raw DER.
 * If input is a UTF-8 PEM string (wrapped in Uint8Array), decodes it.
 */
function ensureRawKey(keyRaw: Uint8Array): Uint8Array {
  if (
    keyRaw.length > 20 &&
    keyRaw[0] === 0x2d &&
    keyRaw[1] === 0x2d &&
    keyRaw[2] === 0x2d &&
    keyRaw[3] === 0x2d &&
    keyRaw[4] === 0x2d
  ) {
    try {
      const text = new TextDecoder().decode(keyRaw).trim();
      if (text.startsWith("-----BEGIN")) {
        return parseBytes(text, "pem");
      }
    } catch {
      /* ignore */
    }
  }
  return keyRaw;
}

registerProvider({
  type: "rsa",
  name: "RSA-OAEP",
  async encrypt(keyRaw, data, params) {
    const raw = ensureRawKey(keyRaw);
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("spki", raw, "RSA-OAEP", hash, ["encrypt"]);
    return CryptoService.encrypt({ name: "RSA-OAEP" }, key, data);
  },
  async decrypt(keyRaw, data, params) {
    const raw = ensureRawKey(keyRaw);
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("pkcs8", raw, "RSA-OAEP", hash, ["decrypt"]);
    return CryptoService.decrypt({ name: "RSA-OAEP" }, key, data);
  },
});

registerProvider({
  type: "rsa",
  name: "RSAES-PKCS1-V1_5",
  async encrypt(keyRaw, data) {
    const raw = ensureRawKey(keyRaw);
    const pem = toPEM(raw, "PUBLIC KEY");
    const key = forge.pki.publicKeyFromPem(pem);
    const input = String.fromCharCode(...data);
    const output = key.encrypt(input, "RSAES-PKCS1-V1_5");
    return Uint8Array.from(output, (c) => c.charCodeAt(0));
  },
  async decrypt(keyRaw, data) {
    const raw = ensureRawKey(keyRaw);
    const pem = toPEM(raw, "PRIVATE KEY");
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
    const raw = ensureRawKey(keyRaw);
    let publicKey: forge.pki.rsa.PublicKey;
    try {
      const asn1 = forge.asn1.fromDer(forge.util.createBuffer(raw));
      try {
        publicKey = forge.pki.publicKeyFromAsn1(asn1) as forge.pki.rsa.PublicKey;
      } catch {
        publicKey = forge.pki.publicKeyFromAsn1(asn1) as forge.pki.rsa.PublicKey;
      }
    } catch {
      publicKey = forge.pki.publicKeyFromPem(toPEM(raw, "PUBLIC KEY")) as forge.pki.rsa.PublicKey;
    }

    const n = publicKey.n;
    const e = publicKey.e;
    const m = new forge.jsbn.BigInteger(
      forge.util.bytesToHex(forge.util.binary.raw.encode(data)),
      16,
    );

    if (m.compareTo(n) >= 0) throw new Error("Data too large for key modulus");

    const c = m.modPow(e, n);

    const nBytes = (n.bitLength() + 7) >> 3;
    const hex = c.toString(16).padStart(nBytes * 2, "0");
    const resultHex = hex.length > nBytes * 2 ? hex.slice(-nBytes * 2) : hex;
    return new Uint8Array(resultHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  },
  async decrypt(keyRaw, data) {
    const raw = ensureRawKey(keyRaw);
    let privateKey: forge.pki.rsa.PrivateKey;
    try {
      const asn1 = forge.asn1.fromDer(forge.util.createBuffer(raw));
      try {
        privateKey = forge.pki.privateKeyFromAsn1(asn1) as forge.pki.rsa.PrivateKey;
      } catch {
        privateKey = forge.pki.privateKeyFromAsn1(asn1) as forge.pki.rsa.PrivateKey;
      }
    } catch {
      privateKey = forge.pki.privateKeyFromPem(
        toPEM(raw, "PRIVATE KEY"),
      ) as forge.pki.rsa.PrivateKey;
    }

    const n = privateKey.n;
    const d = privateKey.d;
    const c = new forge.jsbn.BigInteger(
      forge.util.bytesToHex(forge.util.binary.raw.encode(data)),
      16,
    );

    const m = c.modPow(d, n);

    const nBytes = (n.bitLength() + 7) >> 3;
    const hex = m.toString(16).padStart(nBytes * 2, "0");
    const resultHex = hex.length > nBytes * 2 ? hex.slice(-nBytes * 2) : hex;
    return new Uint8Array(resultHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  },
});

registerProvider({
  type: "mac",
  name: "RSASSA-PKCS1-v1_5",
  async sign(keyRaw, data, params) {
    const raw = ensureRawKey(keyRaw);
    const hashAlgo = (params?.hash as string) || "SHA-256";

    // Try WebCrypto first
    try {
      let pkcs8 = raw;
      const isPkcs1 =
        raw[0] === 0x30 &&
        ((raw[1] === 0x82 && raw[4] === 0x02 && raw[5] === 0x01 && raw[6] === 0x00) ||
          (raw[1] === 0x81 && raw[3] === 0x02 && raw[4] === 0x01 && raw[5] === 0x00) ||
          (raw[1] < 0x80 && raw[2] === 0x02 && raw[3] === 0x01 && raw[4] === 0x00));

      if (isPkcs1) {
        const privateKey = forge.pki.privateKeyFromAsn1(
          forge.asn1.fromDer(forge.util.createBuffer(raw)),
        );
        const asn1 = forge.pki.privateKeyToAsn1(privateKey);
        const privateKeyInfo = forge.pki.wrapRsaPrivateKey(asn1);
        const der = forge.asn1.toDer(privateKeyInfo).getBytes();
        pkcs8 = new Uint8Array(der.length);
        for (let i = 0; i < der.length; i++) pkcs8[i] = der.charCodeAt(i);
      }

      const key = await CryptoService.importRSAKey("pkcs8", pkcs8, "RSASSA-PKCS1-v1_5", hashAlgo, [
        "sign",
      ]);
      return await CryptoService.sign({ name: "RSASSA-PKCS1-v1_5", hash: hashAlgo }, key, data);
    } catch (e) {
      console.warn("[rsa] WebCrypto sign failed, falling back to forge:", (e as Error).message);
    }

    // Fallback to forge
    try {
      const privateKey = forge.pki.privateKeyFromAsn1(
        forge.asn1.fromDer(forge.util.createBuffer(raw)),
      );
      const md = (forge.md as any)[hashAlgo.toLowerCase().replace("-", "")]?.create();
      if (!md) throw new Error(`Unsupported hash algorithm: ${hashAlgo}`);
      md.update(forge.util.binary.raw.encode(data));
      const signature = privateKey.sign(md);
      return new Uint8Array(forge.util.binary.raw.decode(signature));
    } catch (e) {
      throw new Error(`RSA sign failed: ${(e as Error).message}`);
    }
  },
  async verify(keyRaw, signature, data, params) {
    const raw = ensureRawKey(keyRaw);
    const hashAlgo = (params?.hash as string) || "SHA-256";

    // Try WebCrypto first
    try {
      let spki = raw;
      const isPkcs1Pub =
        raw[0] === 0x30 &&
        ((raw[1] === 0x82 && raw[4] === 0x02) ||
          (raw[1] === 0x81 && raw[3] === 0x02) ||
          (raw[1] < 0x80 && raw[2] === 0x02)) &&
        !(raw[1] === 0x82 && raw[4] === 0x02 && raw[5] === 0x01 && raw[6] === 0x00);

      if (isPkcs1Pub) {
        try {
          const publicKey = forge.pki.publicKeyFromAsn1(
            forge.asn1.fromDer(forge.util.createBuffer(raw)),
          );
          const asn1 = forge.pki.publicKeyToAsn1(publicKey);
          const spkiAsn1 = forge.pki.wrapRsaPublicKey(asn1);
          const der = forge.asn1.toDer(spkiAsn1).getBytes();
          spki = new Uint8Array(der.length);
          for (let i = 0; i < der.length; i++) spki[i] = der.charCodeAt(i);
        } catch {
          // Ignore conversion error and let importRSAKey try the raw bytes
        }
      }

      const key = await CryptoService.importRSAKey("spki", spki, "RSASSA-PKCS1-v1_5", hashAlgo, [
        "verify",
      ]);
      return await CryptoService.verify(
        { name: "RSASSA-PKCS1-v1_5", hash: hashAlgo },
        key,
        signature,
        data,
      );
    } catch (e) {
      console.warn("[rsa] WebCrypto verify failed, falling back to forge:", (e as Error).message);
    }

    // Fallback to forge
    try {
      const publicKey = forge.pki.publicKeyFromAsn1(
        forge.asn1.fromDer(forge.util.createBuffer(raw)),
      );
      const md = (forge.md as any)[hashAlgo.toLowerCase().replace("-", "")]?.create();
      if (!md) throw new Error(`Unsupported hash algorithm: ${hashAlgo}`);
      md.update(forge.util.binary.raw.encode(data));
      return publicKey.verify(md.digest().bytes(), forge.util.binary.raw.encode(signature));
    } catch {
      return false;
    }
  },
});

function makeSignatureProvider(name: "RSA-PSS" | "ECDSA"): MacProvider {
  return {
    type: "mac",
    name,
    async sign(keyRaw, data, params) {
      const raw = ensureRawKey(keyRaw);
      const hash = (params?.hash as string) || "SHA-256";
      const isRSA = name.startsWith("RSA");
      const key = isRSA
        ? await CryptoService.importRSAKey("pkcs8", raw, name, hash, ["sign"])
        : await CryptoService.importECKey("pkcs8", raw, "ECDSA", params?.namedCurve as string, [
            "sign",
          ]);
      const signParams: Record<string, string | number> = { name, hash };
      if (name === "RSA-PSS") signParams.saltLength = 32;
      return CryptoService.sign(signParams, key, data);
    },
    async verify(keyRaw, signature, data, params) {
      const raw = ensureRawKey(keyRaw);
      const hash = (params?.hash as string) || "SHA-256";
      const isRSA = name.startsWith("RSA");
      const key = isRSA
        ? await CryptoService.importRSAKey("spki", raw, name, hash, ["verify"])
        : await CryptoService.importECKey("spki", raw, "ECDSA", params?.namedCurve as string, [
            "verify",
          ]);
      const signParams: Record<string, string | number> = { name, hash };
      if (name === "RSA-PSS") signParams.saltLength = 32;
      return CryptoService.verify(signParams, key, signature, data);
    },
  };
}

registerProvider(makeSignatureProvider("RSA-PSS"));
registerProvider(makeSignatureProvider("ECDSA"));
