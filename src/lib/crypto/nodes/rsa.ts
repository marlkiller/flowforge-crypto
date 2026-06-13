import { registerNodeDef } from "../registry";
import type { GraphNode, DataValue } from "../types";
import {
  CryptoService,
  getProvider,
  hexToBytes,
  type RsaProvider,
  type MacProvider,
  utf8ToBytes,
} from "../service";
import { getField, getNumberField, getParamBytes } from "../utils";

import {
  RSA_KEYGEN_META,
  RSA_META,
  RSA_SIGN_META,
  RSA_VERIFY_META,
  RSA_EXTRACT_META,
} from "./meta";
import * as forge from "node-forge";

const cleanHex = (s: string) => s.replace(/^0x/i, "").replace(/[:\s]/g, "");

const bytesToHexStr = (v: Uint8Array): string =>
  Array.from(v)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const getRawInput = (
  node: GraphNode,
  inputs: Record<string, any>,
  id: string,
): string | undefined => {
  const wired = inputs[id];
  if (wired) {
    const dv: DataValue = wired?.value !== undefined ? wired : { type: "raw", value: wired };
    if (typeof dv.value === "string") return cleanHex(dv.value);
    if (dv.value instanceof Uint8Array && dv.value.length > 0) {
      return cleanHex(bytesToHexStr(dv.value));
    }
  }
  const val = getField(node, id);
  return val ? cleanHex(val) : undefined;
};

registerNodeDef("rsa_keygen", {
  meta: RSA_KEYGEN_META,
  runner: async (node) => {
    const algo = (node.data["algorithm"] as any) || "RSA-OAEP";
    const modulusLength = getNumberField(node, "modulusLength", 2048);
    const hash = getField(node, "hash", "SHA-256");
    const eStr = getField(node, "publicExponent", "010001");
    const publicExponent =
      eStr === "03" || eStr === "3" ? new Uint8Array([0x03]) : new Uint8Array([0x01, 0x00, 0x01]);

    const keyPair = await CryptoService.generateRSAKeyPair(
      algo,
      modulusLength,
      publicExponent,
      hash,
    );
    const publicKey = await CryptoService.exportKey("spki", keyPair.publicKey);
    const privateKey = await CryptoService.exportKey("pkcs8", keyPair.privateKey);

    return {
      publicKey,
      privateKey,
    };
  },
});

registerNodeDef("rsa", {
  meta: RSA_META,
  runner: async (node, inputs) => {
    const action = getField(node, "action", "encrypt");
    const scheme = getField(node, "scheme", "RSA-OAEP");
    const hash = getField(node, "hash", "SHA-256");
    const data = inputs["data"] ?? new Uint8Array(0);

    const provider = getProvider(scheme) as RsaProvider;
    if (!provider) throw new Error(`RSA provider "${scheme}" not found`);

    try {
      const baseParams = scheme === "RSA-OAEP" ? { hash } : undefined;

      if (scheme === "RAW") {
        const n = getRawInput(node as GraphNode, inputs, "modulusN");
        if (action === "decrypt") {
          const d = getRawInput(node as GraphNode, inputs, "privateExponentD");
          if (n && d) {
            return provider.decrypt(new Uint8Array(0), data, {
              ...baseParams,
              modulusN: n,
              privateExponentD: d,
            });
          }
          const key = getParamBytes(node as GraphNode, inputs, "privateKey", false);
          if (key) return provider.decrypt(key, data, baseParams);
          throw new Error("Private Key or components (n, d) required for RAW decrypt");
        } else {
          const e = getRawInput(node as GraphNode, inputs, "publicExponentE") || "010001";
          if (n && e) {
            return provider.encrypt(new Uint8Array(0), data, {
              ...baseParams,
              modulusN: n,
              publicExponentE: e,
            });
          }
          const key = getParamBytes(node as GraphNode, inputs, "publicKey", false);
          if (key) return provider.encrypt(key, data, baseParams);
          throw new Error("Public Key or components (n, e) required for RAW encrypt");
        }
      }

      if (action === "decrypt") {
        const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey")!;
        return provider.decrypt(privateKeyBytes, data, baseParams);
      } else {
        const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey")!;
        return provider.encrypt(publicKeyBytes, data, baseParams);
      }
    } catch (e) {
      throw new Error(`RSA ${action} failed: ${(e as Error).message}`);
    }
  },
});

registerNodeDef("rsa_sign", {
  meta: RSA_SIGN_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const algo = getField(node, "algorithm", "RSASSA-PKCS1-v1_5");
    const hash = getField(node, "hash", "SHA-256");

    const provider = getProvider(algo) as MacProvider;
    if (!provider) throw new Error(`Provider for ${algo} not found`);

    const params: Record<string, unknown> = { hash };

    if (algo === "RAW" || algo === "RAW-HASH") {
      const n = getRawInput(node as GraphNode, inputs, "modulusN");
      const d = getRawInput(node as GraphNode, inputs, "privateExponentD");
      if (n && d) {
        params.modulusN = n;
        params.privateExponentD = d;
        return provider.sign(new Uint8Array(0), data, params);
      }
      const key = getParamBytes(node as GraphNode, inputs, "privateKey", false);
      if (key) return provider.sign(key, data, params);
      throw new Error("Private Key or components (n, d) required for RAW sign");
    }

    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey")!;
    return provider.sign(privateKeyBytes, data, params);
  },
});

registerNodeDef("rsa_verify", {
  meta: RSA_VERIFY_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const signature = inputs["signature"] ?? new Uint8Array(0);
    const algo = getField(node, "algorithm", "RSASSA-PKCS1-v1_5");
    const hash = getField(node, "hash", "SHA-256");

    const provider = getProvider(algo) as MacProvider;
    if (!provider) throw new Error(`Provider for ${algo} not found`);

    const params: Record<string, unknown> = { hash };

    if (algo === "RAW" || algo === "RAW-HASH") {
      const n = getRawInput(node as GraphNode, inputs, "modulusN");
      const e = getRawInput(node as GraphNode, inputs, "publicExponentE") || "010001";
      if (n && e) {
        params.modulusN = n;
        params.publicExponentE = e;
        const isValid = await provider.verify(new Uint8Array(0), signature, data, params);
        const fmt = getField(node, "outputFormat", "utf8");
        if (fmt === "bool") return isValid;
        return utf8ToBytes(isValid ? "Valid Signature" : "Invalid Signature");
      }
      const key = getParamBytes(node as GraphNode, inputs, "publicKey", false);
      if (key) {
        const isValid = await provider.verify(key, signature, data, params);
        const fmt = getField(node, "outputFormat", "utf8");
        if (fmt === "bool") return isValid;
        return utf8ToBytes(isValid ? "Valid Signature" : "Invalid Signature");
      }
      throw new Error("Public Key or components (n, e) required for RAW verify");
    }

    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey")!;
    const isValid = await provider.verify(publicKeyBytes, signature, data, params);
    const fmt = getField(node, "outputFormat", "utf8");
    if (fmt === "bool") return isValid;
    return utf8ToBytes(isValid ? "Valid Signature" : "Invalid Signature");
  },
});

registerNodeDef("rsa_extract", {
  meta: RSA_EXTRACT_META,
  runner: (node, inputs) => {
    const getKeyBytes = (): Uint8Array => {
      const wired = inputs["keyData"];
      if (wired) {
        const dv: DataValue = wired?.value !== undefined ? wired : { type: "raw", value: wired };
        if (dv.value instanceof Uint8Array) return dv.value;
        if (typeof dv.value === "string") return utf8ToBytes(dv.value);
      }
      const fieldVal = getField(node, "keyData", "");
      if (fieldVal?.trim()) return utf8ToBytes(fieldVal.trim());
      throw new Error("RSA key data is required");
    };

    const raw = getKeyBytes();
    const text = new TextDecoder().decode(raw).trim();

    let privateKey: forge.pki.rsa.PrivateKey | null = null;
    let publicKey: forge.pki.rsa.PublicKey | null = null;

    if (text.startsWith("-----BEGIN ")) {
      if (text.includes("PRIVATE KEY")) {
        try {
          privateKey = forge.pki.privateKeyFromPem(text) as forge.pki.rsa.PrivateKey;
        } catch {
          /* ignore */
        }
      }
      if (!privateKey) {
        publicKey = forge.pki.publicKeyFromPem(text) as forge.pki.rsa.PublicKey;
      }
    } else {
      const buf = forge.util.createBuffer(forge.util.binary.raw.encode(raw), "raw");
      const asn1 = forge.asn1.fromDer(buf);
      try {
        privateKey = forge.pki.privateKeyFromAsn1(asn1) as forge.pki.rsa.PrivateKey;
      } catch {
        publicKey = forge.pki.publicKeyFromAsn1(asn1) as forge.pki.rsa.PublicKey;
      }
    }

    const pk = privateKey || publicKey;
    if (!pk) throw new Error("Could not parse the input as an RSA key");

    const fmt = (bi: any) => {
      const h = bi.toString(16);
      return h.length % 2 ? "0" + h : h;
    };
    const outputs: Record<string, Uint8Array> = {
      modulusN: hexToBytes(fmt((pk as any).n)),
      publicExponentE: hexToBytes(fmt((pk as any).e)),
    };
    if ((pk as any).d) {
      outputs.privateExponentD = hexToBytes(fmt((pk as any).d));
    }
    return outputs;
  },
});
