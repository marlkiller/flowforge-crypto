import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { CryptoService, utf8ToBytes } from "../service";
import { getField, getNumberField, getParamBytes } from "../utils";
import { EC_KEYGEN_META, ECDSA_SIGN_META, ECDSA_VERIFY_META, ECDH_META } from "./meta";

registerNodeDef("ec_keygen", {
  meta: EC_KEYGEN_META,
  runner: async (node) => {
    const algo = (node.data["algorithm"] as any) || "ECDSA";
    const curve = (node.data["namedCurve"] as any) || "P-256";

    const keyPair = await CryptoService.generateECKeyPair(algo, curve);
    const publicKey = await CryptoService.exportKey("spki", keyPair.publicKey);
    const privateKey = await CryptoService.exportKey("pkcs8", keyPair.privateKey);

    return { publicKey, privateKey };
  },
});

registerNodeDef("ecdsa_sign", {
  meta: ECDSA_SIGN_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const curve = getField(node, "namedCurve", "P-256");
    const hash = getField(node, "hash", "SHA-256");
    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");

    if (!privateKeyBytes) throw new Error("Private Key is required");

    const key = await CryptoService.importECKey("pkcs8", privateKeyBytes, "ECDSA", curve, ["sign"]);
    return CryptoService.sign({ name: "ECDSA", hash }, key, data);
  },
});

registerNodeDef("ecdsa_verify", {
  meta: ECDSA_VERIFY_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const signature = inputs["signature"] ?? new Uint8Array(0);
    const curve = getField(node, "namedCurve", "P-256");
    const hash = getField(node, "hash", "SHA-256");
    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");

    if (!publicKeyBytes) throw new Error("Public Key is required");

    const key = await CryptoService.importECKey("spki", publicKeyBytes, "ECDSA", curve, ["verify"]);
    const isValid = await CryptoService.verify({ name: "ECDSA", hash }, key, signature, data);
    const fmt = getField(node, "outputFormat", "utf8");
    if (fmt === "bool") return isValid;
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});

registerNodeDef("ecdh", {
  meta: ECDH_META,
  runner: async (node, inputs) => {
    const curve = getField(node, "namedCurve", "P-256");
    const length = getNumberField(node, "length", 256);
    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");

    if (!privateKeyBytes || !publicKeyBytes) throw new Error("Both Keys are required for ECDH");

    const privateKey = await CryptoService.importECKey("pkcs8", privateKeyBytes, "ECDH", curve, [
      "deriveBits",
    ]);
    const publicKey = await CryptoService.importECKey("spki", publicKeyBytes, "ECDH", curve, []);

    return CryptoService.deriveBits({ name: "ECDH", public: publicKey }, privateKey, length);
  },
});
