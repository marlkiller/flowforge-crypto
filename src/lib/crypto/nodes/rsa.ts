import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { CryptoService, getProvider, type RsaProvider, type MacProvider, utf8ToBytes } from "../service";
import { getField, getNumberField, getParamBytes } from "../utils";

import { RSA_KEYGEN_META, RSA_META, RSA_SIGN_META, RSA_VERIFY_META } from "./meta";

registerNodeDef("rsa_keygen", {
  meta: RSA_KEYGEN_META,
  runner: async (node) => {
    const algo = (node.data["algorithm"] as any) || "RSA-OAEP";
    const modulusLength = getNumberField(node, "modulusLength", 2048);
    const hash = getField(node, "hash", "SHA-256");
    const publicExponent = new Uint8Array([0x01, 0x00, 0x01]);

    const keyPair = await CryptoService.generateRSAKeyPair(algo, modulusLength, publicExponent, hash);
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
      const params = scheme === "RSA-OAEP" ? { hash } : undefined;
      if (action === "decrypt") {
        const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey")!;
        return provider.decrypt(privateKeyBytes, data, params);
      } else {
        const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey")!;
        return provider.encrypt(publicKeyBytes, data, params);
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

    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
    if (!privateKeyBytes) throw new Error("Private Key is required");

    const provider = getProvider(algo) as MacProvider;
    if (!provider) throw new Error(`Provider for ${algo} not found`);

    return provider.sign(privateKeyBytes, data, { hash });
  },
});

registerNodeDef("rsa_verify", {
  meta: RSA_VERIFY_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const signature = inputs["signature"] ?? new Uint8Array(0);
    const algo = getField(node, "algorithm", "RSASSA-PKCS1-v1_5");
    const hash = getField(node, "hash", "SHA-256");

    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!publicKeyBytes) throw new Error("Public Key is required");

    const provider = getProvider(algo) as MacProvider;
    if (!provider) throw new Error(`Provider for ${algo} not found`);

    const isValid = await provider.verify(publicKeyBytes, signature, data, { hash });
    return utf8ToBytes(isValid ? "Valid Signature" : "Invalid Signature");
  },
});
