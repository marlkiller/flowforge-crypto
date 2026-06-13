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
    const keyMode = getField(node, "keyMode", "key") as string;

    const provider = getProvider(scheme) as RsaProvider;
    if (!provider) throw new Error(`RSA provider "${scheme}" not found`);

    try {
      const baseParams: Record<string, unknown> = {};
      if (scheme === "RSA-OAEP") baseParams.hash = hash;

      if (keyMode === "components") {
        const n = getRawInput(node as GraphNode, inputs, "modulusN")!;
        if (action === "decrypt") {
          const d = getRawInput(node as GraphNode, inputs, "privateExponentD");
          if (!d) throw new Error("Components (n, d) required");
          const e = getRawInput(node as GraphNode, inputs, "publicExponentE") || "010001";
          return provider.decrypt(new Uint8Array(0), data, {
            ...baseParams,
            modulusN: n,
            publicExponentE: e,
            privateExponentD: d,
          });
        }
        const e = getRawInput(node as GraphNode, inputs, "publicExponentE") || "010001";
        return provider.encrypt(new Uint8Array(0), data, {
          ...baseParams,
          modulusN: n,
          publicExponentE: e,
        });
      }

      if (action === "decrypt") {
        const key = getParamBytes(node as GraphNode, inputs, "privateKey")!;
        return provider.decrypt(key, data, baseParams);
      }
      const key = getParamBytes(node as GraphNode, inputs, "publicKey")!;
      return provider.encrypt(key, data, baseParams);
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
    const keyMode = getField(node, "keyMode", "key") as string;

    const provider = getProvider(algo) as MacProvider;
    if (!provider) throw new Error(`Provider for ${algo} not found`);

    const params: Record<string, unknown> = { hash };

    if (keyMode === "components") {
      const n = getRawInput(node as GraphNode, inputs, "modulusN")!;
      const d = getRawInput(node as GraphNode, inputs, "privateExponentD");
      if (!d) throw new Error("Components (n, d) required");
      params.modulusN = n;
      params.publicExponentE =
        getRawInput(node as GraphNode, inputs, "publicExponentE") || "010001";
      params.privateExponentD = d;
      return provider.sign(new Uint8Array(0), data, params);
    }

    const key = getParamBytes(node as GraphNode, inputs, "privateKey")!;
    return provider.sign(key, data, params);
  },
});

registerNodeDef("rsa_verify", {
  meta: RSA_VERIFY_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const signature = inputs["signature"] ?? new Uint8Array(0);
    const algo = getField(node, "algorithm", "RSASSA-PKCS1-v1_5");
    const hash = getField(node, "hash", "SHA-256");
    const keyMode = getField(node, "keyMode", "key") as string;

    const fmt = (isValid: boolean) => {
      const f = getField(node, "outputFormat", "utf8");
      if (f === "bool") return isValid;
      return utf8ToBytes(isValid ? "Valid Signature" : "Invalid Signature");
    };

    const provider = getProvider(algo) as MacProvider;
    if (!provider) throw new Error(`Provider for ${algo} not found`);

    const params: Record<string, unknown> = { hash };

    if (keyMode === "components") {
      const n = getRawInput(node as GraphNode, inputs, "modulusN")!;
      const e = getRawInput(node as GraphNode, inputs, "publicExponentE") || "010001";
      params.modulusN = n;
      params.publicExponentE = e;
      return fmt(await provider.verify(new Uint8Array(0), signature, data, params));
    }

    const key = getParamBytes(node as GraphNode, inputs, "publicKey")!;
    return fmt(await provider.verify(key, signature, data, params));
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
