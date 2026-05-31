import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { utf8ToBytes, bytesToHex, hexToBytes } from "../service";
import { getParamBytes } from "../utils";
import { sm2 } from "sm-crypto";

import {
  SM2_KEYGEN_META,
  SM2_SIGN_META,
  SM2_VERIFY_META,
  SM2_ENCRYPT_META,
  SM2_DECRYPT_META,
} from "./meta";

registerNodeDef("sm2_keygen", {
  meta: SM2_KEYGEN_META,
  runner: async () => {
    const kp = sm2.generateKeyPairHex();
    return {
      publicKey: hexToBytes(kp.publicKey),
      privateKey: hexToBytes(kp.privateKey),
    };
  },
});

registerNodeDef("sm2_sign", {
  meta: SM2_SIGN_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
    if (!privateKeyBytes) throw new Error("Private Key is required for SM2 Sign");

    const sig = sm2.doSignature(bytesToHex(data), bytesToHex(privateKeyBytes), {
      hash: true,
      der: false,
    });
    return hexToBytes(sig);
  },
});

registerNodeDef("sm2_verify", {
  meta: SM2_VERIFY_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const signature = inputs["signature"] ?? new Uint8Array(0);
    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!publicKeyBytes) throw new Error("Public Key is required for SM2 Verify");

    const isValid = sm2.doVerifySignature(
      bytesToHex(data),
      bytesToHex(signature),
      bytesToHex(publicKeyBytes),
      { hash: true, der: false },
    );
    const fmt = (node.data["outputFormat"] as string) || "utf8";
    if (fmt === "boolean") return isValid;
    return utf8ToBytes(isValid ? "Valid" : "Invalid");
  },
});

registerNodeDef("sm2_encrypt", {
  meta: SM2_ENCRYPT_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!publicKeyBytes) throw new Error("Public Key is required for SM2 Encrypt");

    const enc = sm2.doEncrypt(bytesToHex(data), bytesToHex(publicKeyBytes), {
      cipherMode: 1,
    });
    return hexToBytes(enc);
  },
});

registerNodeDef("sm2_decrypt", {
  meta: SM2_DECRYPT_META,
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
    if (!privateKeyBytes) throw new Error("Private Key is required for SM2 Decrypt");

    const dec = sm2.doDecrypt(bytesToHex(data), bytesToHex(privateKeyBytes));
    try {
      return hexToBytes(dec);
    } catch {
      return utf8ToBytes(dec);
    }
  },
});
