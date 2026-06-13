import { registerProvider, CryptoService, toPEM, type MacProvider, parseBytes } from "../service";
import forge from "node-forge";

type ForgePkiWithSubjectPublicKeyInfo = typeof forge.pki & {
  publicKeyToSubjectPublicKeyInfo(publicKey: forge.pki.PublicKey): forge.asn1.Asn1;
};

const forgePki = forge.pki as ForgePkiWithSubjectPublicKeyInfo;

function forgeDerBuffer(bytes: Uint8Array): forge.util.ByteBuffer {
  return forge.util.createBuffer(forge.util.binary.raw.encode(bytes), "raw");
}

function forgeBytesToUint8Array(bytes: string): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i);
  return out;
}

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
    if (params?.modulusN && params?.publicExponentE) {
      const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
      const e = new forge.jsbn.BigInteger(params.publicExponentE as string, 16);
      const publicKey = forge.pki.rsa.setPublicKey(n, e);
      const hash = (params?.hash as string) || "SHA-256";
      const md = getForgeHash(hash);
      const input = String.fromCharCode(...data);
      const output = publicKey.encrypt(input, "RSA-OAEP", { md });
      return Uint8Array.from(output, (c) => c.charCodeAt(0));
    }
    const raw = ensureRawKey(keyRaw);
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("spki", raw, "RSA-OAEP", hash, ["encrypt"]);
    return CryptoService.encrypt({ name: "RSA-OAEP" }, key, data);
  },
  async decrypt(keyRaw, data, params) {
    if (params?.modulusN && params?.privateExponentD) {
      const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
      const e = new forge.jsbn.BigInteger((params.publicExponentE as string) || "010001", 16);
      const d = new forge.jsbn.BigInteger(params.privateExponentD as string, 16);
      const privateKey = makePrivateKey(n, e, d);
      const hash = (params?.hash as string) || "SHA-256";
      const md = getForgeHash(hash);
      const input = String.fromCharCode(...data);
      const output = privateKey.decrypt(input, "RSA-OAEP", { md });
      return Uint8Array.from(output, (c) => c.charCodeAt(0));
    }
    const raw = ensureRawKey(keyRaw);
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("pkcs8", raw, "RSA-OAEP", hash, ["decrypt"]);
    return CryptoService.decrypt({ name: "RSA-OAEP" }, key, data);
  },
});

registerProvider({
  type: "rsa",
  name: "RSAES-PKCS1-V1_5",
  async encrypt(keyRaw, data, params) {
    if (params?.modulusN && params?.publicExponentE) {
      const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
      const e = new forge.jsbn.BigInteger(params.publicExponentE as string, 16);
      const publicKey = forge.pki.rsa.setPublicKey(n, e);
      const input = String.fromCharCode(...data);
      const output = publicKey.encrypt(input, "RSAES-PKCS1-V1_5");
      return Uint8Array.from(output, (c) => c.charCodeAt(0));
    }
    const raw = ensureRawKey(keyRaw);
    const pem = toPEM(raw, "PUBLIC KEY");
    const key = forge.pki.publicKeyFromPem(pem);
    const input = String.fromCharCode(...data);
    const output = key.encrypt(input, "RSAES-PKCS1-V1_5");
    return Uint8Array.from(output, (c) => c.charCodeAt(0));
  },
  async decrypt(keyRaw, data, params) {
    if (params?.modulusN && params?.privateExponentD) {
      const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
      const e = new forge.jsbn.BigInteger((params.publicExponentE as string) || "010001", 16);
      const d = new forge.jsbn.BigInteger(params.privateExponentD as string, 16);
      const privateKey = makePrivateKey(n, e, d);
      const input = String.fromCharCode(...data);
      const output = privateKey.decrypt(input, "RSAES-PKCS1-V1_5");
      return Uint8Array.from(output, (c) => c.charCodeAt(0));
    }
    const raw = ensureRawKey(keyRaw);
    const pem = toPEM(raw, "PRIVATE KEY");
    const key = forge.pki.privateKeyFromPem(pem);
    const input = String.fromCharCode(...data);
    const output = key.decrypt(input, "RSAES-PKCS1-V1_5");
    return Uint8Array.from(output, (c) => c.charCodeAt(0));
  },
});

export function rawModPow(
  data: Uint8Array,
  n: forge.jsbn.BigInteger,
  exp: forge.jsbn.BigInteger,
): Uint8Array {
  const m = new forge.jsbn.BigInteger(
    forge.util.bytesToHex(forge.util.binary.raw.encode(data)),
    16,
  );
  if (m.compareTo(n) >= 0) throw new Error("Data too large for key modulus");
  const result = m.modPow(exp, n);
  const nBytes = (n.bitLength() + 7) >> 3;
  const hex = result.toString(16).padStart(nBytes * 2, "0");
  const resultHex = hex.length > nBytes * 2 ? hex.slice(-nBytes * 2) : hex;
  return new Uint8Array(resultHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

export function resolvePrivateKey(
  keyRaw: Uint8Array,
  params?: Record<string, unknown>,
): { n: forge.jsbn.BigInteger; d: forge.jsbn.BigInteger } {
  if (params?.modulusN && params?.privateExponentD) {
    return {
      n: new forge.jsbn.BigInteger(params.modulusN as string, 16),
      d: new forge.jsbn.BigInteger(params.privateExponentD as string, 16),
    };
  }
  const raw = ensureRawKey(keyRaw);
  let privateKey: forge.pki.rsa.PrivateKey;
  try {
    const asn1 = forge.asn1.fromDer(forgeDerBuffer(raw));
    privateKey = forge.pki.privateKeyFromAsn1(asn1) as forge.pki.rsa.PrivateKey;
  } catch {
    privateKey = forge.pki.privateKeyFromPem(toPEM(raw, "PRIVATE KEY")) as forge.pki.rsa.PrivateKey;
  }
  return { n: privateKey.n, d: privateKey.d };
}

export function resolvePublicKey(
  keyRaw: Uint8Array,
  params?: Record<string, unknown>,
): { n: forge.jsbn.BigInteger; e: forge.jsbn.BigInteger } {
  if (params?.modulusN && params?.publicExponentE) {
    return {
      n: new forge.jsbn.BigInteger(params.modulusN as string, 16),
      e: new forge.jsbn.BigInteger(params.publicExponentE as string, 16),
    };
  }
  const raw = ensureRawKey(keyRaw);
  let publicKey: forge.pki.rsa.PublicKey;
  try {
    const asn1 = forge.asn1.fromDer(forgeDerBuffer(raw));
    publicKey = forge.pki.publicKeyFromAsn1(asn1) as forge.pki.rsa.PublicKey;
  } catch {
    publicKey = forge.pki.publicKeyFromPem(toPEM(raw, "PUBLIC KEY")) as forge.pki.rsa.PublicKey;
  }
  return { n: publicKey.n, e: publicKey.e };
}

function makePrivateKey(
  n: forge.jsbn.BigInteger,
  e: forge.jsbn.BigInteger,
  d: forge.jsbn.BigInteger,
): forge.pki.rsa.PrivateKey {
  return (forge.pki.rsa.setPrivateKey as any)(n, e, d);
}

function getForgeHash(hashAlgo: string): forge.md.MessageDigest {
  const name = hashAlgo.toLowerCase().replace("-", "");
  const md = (forge.md as any)[name]?.create();
  if (!md) throw new Error(`Unsupported hash algorithm: ${hashAlgo}`);
  return md;
}

registerProvider({
  type: "rsa",
  name: "RAW",
  async encrypt(keyRaw, data, params) {
    const { n, e } = resolvePublicKey(keyRaw, params);
    return rawModPow(data, n, e);
  },
  async decrypt(keyRaw, data, params) {
    const { n, d } = resolvePrivateKey(keyRaw, params);
    return rawModPow(data, n, d);
  },
  async sign(keyRaw: Uint8Array, data: Uint8Array, params?: Record<string, unknown>) {
    const { n, d } = resolvePrivateKey(keyRaw, params);
    return rawModPow(data, n, d);
  },
  async verify(
    keyRaw: Uint8Array,
    signature: Uint8Array,
    data: Uint8Array,
    params?: Record<string, unknown>,
  ) {
    const { n, e } = resolvePublicKey(keyRaw, params);
    const mPrimed = rawModPow(signature, n, e);
    const mOrig = new forge.jsbn.BigInteger(
      forge.util.bytesToHex(forge.util.binary.raw.encode(data)),
      16,
    );
    const mPrimeInt = new forge.jsbn.BigInteger(
      forge.util.bytesToHex(forge.util.binary.raw.encode(mPrimed)),
      16,
    );
    return mPrimeInt.equals(mOrig);
  },
});

registerProvider({
  type: "mac",
  name: "RAW-HASH",
  async sign(keyRaw, data, params) {
    const { n, d } = resolvePrivateKey(keyRaw, params);
    const hashAlgo = (params?.hash as string) || "SHA-256";
    const hashBytes = await CryptoService.digest(hashAlgo, data);
    const keySize = (n.bitLength() + 7) >> 3;
    const paddingLen = keySize - hashBytes.length - 3;

    const padded = new Uint8Array(keySize);
    padded[0] = 0x00;
    padded[1] = 0x01;
    padded.fill(0xff, 2, 2 + paddingLen);
    padded[2 + paddingLen] = 0x00;
    padded.set(hashBytes, 2 + paddingLen + 1);

    return rawModPow(padded, n, d);
  },
  async verify(keyRaw, signature, data, params) {
    const { n, e } = resolvePublicKey(keyRaw, params);
    const hashAlgo = (params?.hash as string) || "SHA-256";
    const decrypted = rawModPow(signature, n, e);

    if (decrypted[0] !== 0x00 || decrypted[1] !== 0x01) return false;

    let sep = 2;
    while (sep < decrypted.length && decrypted[sep] === 0xff) sep++;
    if (sep >= decrypted.length || decrypted[sep] !== 0x00) return false;

    const extractedHash = decrypted.slice(sep + 1);
    const expectedHash = await CryptoService.digest(hashAlgo, data);

    if (extractedHash.length !== expectedHash.length) return false;
    for (let i = 0; i < extractedHash.length; i++) {
      if (extractedHash[i] !== expectedHash[i]) return false;
    }
    return true;
  },
});

registerProvider({
  type: "mac",
  name: "RSASSA-PKCS1-v1_5",
  async sign(keyRaw, data, params) {
    if (params?.modulusN && params?.privateExponentD) {
      const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
      const e = new forge.jsbn.BigInteger((params.publicExponentE as string) || "010001", 16);
      const d = new forge.jsbn.BigInteger(params.privateExponentD as string, 16);
      const privateKey = makePrivateKey(n, e, d);
      const hashAlgo = (params?.hash as string) || "SHA-256";
      const md = getForgeHash(hashAlgo);
      md.update(forge.util.binary.raw.encode(data));
      const signature = privateKey.sign(md);
      return new Uint8Array(forge.util.binary.raw.decode(signature));
    }
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
        const privateKey = forge.pki.privateKeyFromAsn1(forge.asn1.fromDer(forgeDerBuffer(raw)));
        const asn1 = forge.pki.privateKeyToAsn1(privateKey);
        const privateKeyInfo = forge.pki.wrapRsaPrivateKey(asn1);
        const der = forge.asn1.toDer(privateKeyInfo).getBytes();
        pkcs8 = forgeBytesToUint8Array(der);
      }

      const key = await CryptoService.importRSAKey("pkcs8", pkcs8, "RSASSA-PKCS1-v1_5", hashAlgo, [
        "sign",
      ]);
      return await CryptoService.sign({ name: "RSASSA-PKCS1-v1_5", hash: hashAlgo }, key, data);
    } catch {
      /* empty */
    }

    try {
      const privateKey = forge.pki.privateKeyFromAsn1(forge.asn1.fromDer(forgeDerBuffer(raw)));
      const md = getForgeHash(hashAlgo);
      md.update(forge.util.binary.raw.encode(data));
      const signature = privateKey.sign(md);
      return new Uint8Array(forge.util.binary.raw.decode(signature));
    } catch (e) {
      throw new Error(`RSA sign failed: ${(e as Error).message}`);
    }
  },
  async verify(keyRaw, signature, data, params) {
    if (params?.modulusN && params?.publicExponentE) {
      const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
      const e = new forge.jsbn.BigInteger(params.publicExponentE as string, 16);
      const publicKey = forge.pki.rsa.setPublicKey(n, e);
      const hashAlgo = (params?.hash as string) || "SHA-256";
      const md = getForgeHash(hashAlgo);
      md.update(forge.util.binary.raw.encode(data));
      return publicKey.verify(md.digest().bytes(), forge.util.binary.raw.encode(signature));
    }
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
          const publicKey = forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(forgeDerBuffer(raw)));
          const spkiAsn1 = forgePki.publicKeyToSubjectPublicKeyInfo(publicKey);
          const der = forge.asn1.toDer(spkiAsn1).getBytes();
          spki = forgeBytesToUint8Array(der);
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
    } catch {
      /* empty */
    }

    try {
      const publicKey = forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(forgeDerBuffer(raw)));
      const md = getForgeHash(hashAlgo);
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
      if (name === "RSA-PSS" && params?.modulusN && params?.privateExponentD) {
        const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
        const e = new forge.jsbn.BigInteger((params.publicExponentE as string) || "010001", 16);
        const d = new forge.jsbn.BigInteger(params.privateExponentD as string, 16);
        const privateKey = makePrivateKey(n, e, d);
        const hashAlgo = (params?.hash as string) || "SHA-256";
        const md = getForgeHash(hashAlgo);
        md.update(forge.util.binary.raw.encode(data));
        const pss = forge.pss.create({
          md,
          mgf: forge.mgf.mgf1.create(md),
          saltLength: 32,
        });
        const signature = privateKey.sign(md, pss);
        return new Uint8Array(forge.util.binary.raw.decode(signature));
      }
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
      if (name === "RSA-PSS" && params?.modulusN && params?.publicExponentE) {
        const n = new forge.jsbn.BigInteger(params.modulusN as string, 16);
        const e = new forge.jsbn.BigInteger(params.publicExponentE as string, 16);
        const publicKey = forge.pki.rsa.setPublicKey(n, e);
        const hashAlgo = (params?.hash as string) || "SHA-256";
        const md = getForgeHash(hashAlgo);
        md.update(forge.util.binary.raw.encode(data));
        const pss = forge.pss.create({
          md,
          mgf: forge.mgf.mgf1.create(md),
          saltLength: 32,
        });
        return publicKey.verify(md.digest().bytes(), forge.util.binary.raw.encode(signature), pss);
      }
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
