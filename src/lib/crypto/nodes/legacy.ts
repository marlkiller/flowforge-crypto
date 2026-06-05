import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { bytesToHex, hexToBytes } from "../service";
import { getField, getParamBytes } from "../utils";
import CryptoJS from "crypto-js";
import { DES_META, TRIPLEDES_META, BLOWFISH_META, RC4_META, RABBIT_META } from "./meta";

function makeLegacyCipherRunner(algo: "DES" | "TripleDES") {
  return async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const keyBytes = getParamBytes(node, inputs, "key");
    const ivBytes = getParamBytes(node, inputs, "iv", false);
    const action = getField(node, "action", "encrypt");
    const modeStr = getField(node, "mode", "CBC");

    if (!keyBytes) throw new Error("Key is required");

    const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));
    const iv = ivBytes ? CryptoJS.enc.Hex.parse(bytesToHex(ivBytes)) : undefined;
    const mode = modeStr === "CBC" ? CryptoJS.mode.CBC : CryptoJS.mode.ECB;

    if (action === "encrypt") {
      const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
      const encrypted = CryptoJS[algo].encrypt(wa, key, { iv, mode });
      return hexToBytes(encrypted.ciphertext.toString());
    } else {
      const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
      const cp = CryptoJS.lib.CipherParams.create({ ciphertext: wa });
      const decrypted = CryptoJS[algo].decrypt(cp, key, { iv, mode });
      return hexToBytes(decrypted.toString());
    }
  };
}

function makeStreamCipherRunner(algo: string, hasIv: boolean) {
  return async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const keyBytes = getParamBytes(node, inputs, "key");
    const ivBytes = hasIv ? getParamBytes(node, inputs, "iv", false) : undefined;
    const action = getField(node, "action", "encrypt");

    if (!keyBytes) throw new Error("Key is required");

    const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));
    const iv = ivBytes ? CryptoJS.enc.Hex.parse(bytesToHex(ivBytes)) : undefined;

    const opts: any = {};
    if (iv) opts.iv = iv;

    if (action === "encrypt") {
      const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
      const encrypted = (CryptoJS as any)[algo].encrypt(wa, key, opts);
      return hexToBytes(encrypted.ciphertext.toString());
    } else {
      const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
      const cp = CryptoJS.lib.CipherParams.create({ ciphertext: wa });
      const decrypted = (CryptoJS as any)[algo].decrypt(cp, key, opts);
      return hexToBytes(decrypted.toString());
    }
  };
}

function makeBlowfishRunner() {
  return async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const keyBytes = getParamBytes(node, inputs, "key");
    const ivBytes = getParamBytes(node, inputs, "iv", false);
    const action = getField(node, "action", "encrypt");
    const modeStr = getField(node, "mode", "CBC");

    if (!keyBytes) throw new Error("Key is required");

    const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));
    const iv = ivBytes ? CryptoJS.enc.Hex.parse(bytesToHex(ivBytes)) : undefined;
    const mode = modeStr === "CBC" ? CryptoJS.mode.CBC : CryptoJS.mode.ECB;

    if (action === "encrypt") {
      const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
      const encrypted = CryptoJS.Blowfish.encrypt(wa, key, { iv, mode });
      return hexToBytes(encrypted.ciphertext.toString());
    } else {
      const wa = CryptoJS.enc.Hex.parse(bytesToHex(data));
      const cp = CryptoJS.lib.CipherParams.create({ ciphertext: wa });
      const decrypted = CryptoJS.Blowfish.decrypt(cp, key, { iv, mode });
      return hexToBytes(decrypted.toString());
    }
  };
}

registerNodeDef("des", { meta: DES_META, runner: makeLegacyCipherRunner("DES") });
registerNodeDef("tripledes", { meta: TRIPLEDES_META, runner: makeLegacyCipherRunner("TripleDES") });
registerNodeDef("blowfish", { meta: BLOWFISH_META, runner: makeBlowfishRunner() });
registerNodeDef("rc4", { meta: RC4_META, runner: makeStreamCipherRunner("RC4", false) });
registerNodeDef("rabbit", { meta: RABBIT_META, runner: makeStreamCipherRunner("Rabbit", true) });
