import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { utf8ToBytes, bytesToUtf8, getProvider, type KdfProvider } from "../service";
import { getField, getNumberField, getParamBytes } from "../utils";
import bcrypt from "bcryptjs";
import { PBKDF2_META, HKDF_META, ARGON2_META, SCRYPT_META, BCRYPT_META } from "./meta";

registerNodeDef("pbkdf2", {
  meta: PBKDF2_META,
  runner: async (node, inputs) => {
    const password = getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const iterations = getNumberField(node, "iterations", 100000);
    const hash = getField(node, "hash", "SHA-256");
    const length = getNumberField(node, "length", 256);

    const provider = getProvider("PBKDF2") as KdfProvider;
    return provider.derive(password, salt, length, { iterations, hash });
  },
});

registerNodeDef("hkdf", {
  meta: HKDF_META,
  runner: async (node, inputs) => {
    const ikm = getParamBytes(node as GraphNode, inputs, "ikm") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const info = getParamBytes(node as GraphNode, inputs, "info") || new Uint8Array(0);
    const hash = getField(node, "hash", "SHA-256");
    const length = getNumberField(node, "length", 256);

    const provider = getProvider("HKDF") as KdfProvider;
    return provider.derive(ikm, salt, length, { info, hash });
  },
});

registerNodeDef("argon2", {
  meta: ARGON2_META,
  runner: async (node, inputs) => {
    const pwd = getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const t = getNumberField(node, "t", 3);
    const m = getNumberField(node, "m", 65536);
    const p = getNumberField(node, "p", 1);
    const len = getNumberField(node, "length", 32);
    const type = getField(node, "type", "id");

    const provider = getProvider("Argon2") as KdfProvider;
    return provider.derive(pwd, salt, len * 8, { t, m, p, type });
  },
});

registerNodeDef("scrypt", {
  meta: SCRYPT_META,
  runner: async (node, inputs) => {
    const pwd = getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0);
    const salt = getParamBytes(node as GraphNode, inputs, "salt") || new Uint8Array(0);
    const N = getNumberField(node, "N", 16384);
    const r = getNumberField(node, "r", 8);
    const p = getNumberField(node, "p", 1);
    const len = getNumberField(node, "length", 32);

    const provider = getProvider("Scrypt") as KdfProvider;
    return provider.derive(pwd, salt, len * 8, { N, r, p });
  },
});

registerNodeDef("bcrypt", {
  meta: BCRYPT_META,
  runner: async (node, inputs) => {
    const action = getField(node, "action", "hash");
    const password = bytesToUtf8(
      getParamBytes(node as GraphNode, inputs, "password") || new Uint8Array(0),
    );
    const saltInput = getParamBytes(node as GraphNode, inputs, "salt", false);

    if (action === "verify") {
      const hashWired = inputs["hash"];
      const hashStr = hashWired ? bytesToUtf8(hashWired) : getField(node, "hash");
      if (!hashStr) throw new Error("Hash is required for verification");
      const match = bcrypt.compareSync(password, hashStr);
      const fmt = (node.data["outputFormat"] as string) || "utf8";
      if (fmt === "bool") return match;
      return utf8ToBytes(match ? "Valid" : "Invalid");
    }

    const rounds = getNumberField(node, "rounds", 10);
    const rawSalt = saltInput && saltInput.length > 0 ? bytesToUtf8(saltInput) : "";
    const saltStr = rawSalt.match(/^\$2[abzy]\$\d+\$/) ? rawSalt : bcrypt.genSaltSync(rounds);
    const result = bcrypt.hashSync(password, saltStr);
    return utf8ToBytes(result);
  },
});
