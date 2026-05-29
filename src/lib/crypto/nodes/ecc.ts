import type { NodeDef, GraphNode } from "../types";
import { CryptoService, utf8ToBytes } from "../service";
import { getParamBytes } from "../utils";

export const eccNodes: Record<string, NodeDef> = {
  ec_keygen: {
    meta: {
      kind: "ec_keygen",
      label: "EC Key Gen",
      category: "asymmetric",
      description: "Generate an Elliptic Curve key pair.",
      defaultOutput: "pem",
      outputs: [
        { id: "publicKey", label: "Public Key" },
        { id: "privateKey", label: "Private Key" },
      ],
      fields: [
        {
          id: "algorithm",
          label: "Algorithm",
          type: "select",
          defaultValue: "ECDSA",
          options: [
            { label: "ECDSA", value: "ECDSA" },
            { label: "ECDH", value: "ECDH" },
          ],
        },
        {
          id: "namedCurve",
          label: "Curve",
          type: "select",
          defaultValue: "P-256",
          options: [
            { label: "P-256", value: "P-256" },
            { label: "P-384", value: "P-384" },
            { label: "P-521", value: "P-521" },
          ],
        },
      ],
    },
    runner: async (node) => {
      const algo = (node.data["algorithm"] as any) || "ECDSA";
      const curve = (node.data["namedCurve"] as any) || "P-256";

      const keyPair = await CryptoService.generateECKeyPair(algo, curve);
      const publicKey = await CryptoService.exportKey("spki", keyPair.publicKey);
      const privateKey = await CryptoService.exportKey("pkcs8", keyPair.privateKey);

      return { publicKey, privateKey };
    },
  },
  ecdsa_sign: {
    meta: {
      kind: "ecdsa_sign",
      label: "ECDSA Sign",
      category: "asymmetric",
      description: "Sign data using an ECDSA private key.",
      defaultOutput: "base64",
      inputs: [
        { id: "data", label: "Data" },
        { id: "privateKey", label: "Private Key" },
      ],
      fields: [
        {
          id: "namedCurve",
          label: "Curve",
          type: "select",
          defaultValue: "P-256",
          options: [
            { label: "P-256", value: "P-256" },
            { label: "P-384", value: "P-384" },
            { label: "P-521", value: "P-521" },
          ],
        },
        {
          id: "hash",
          label: "Hash",
          type: "select",
          defaultValue: "SHA-256",
          options: [
            { label: "SHA-256", value: "SHA-256" },
            { label: "SHA-384", value: "SHA-384" },
            { label: "SHA-512", value: "SHA-512" },
          ],
        },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const curve = (node.data["namedCurve"] as string) || "P-256";
      const hash = (node.data["hash"] as string) || "SHA-256";
      const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");

      if (!privateKeyBytes) throw new Error("Private Key is required");

      const key = await CryptoService.importECKey("pkcs8", privateKeyBytes, "ECDSA", curve, ["sign"]);
      return CryptoService.sign({ name: "ECDSA", hash }, key, data);
    },
  },
  ecdsa_verify: {
    meta: {
      kind: "ecdsa_verify",
      label: "ECDSA Verify",
      category: "asymmetric",
      description: "Verify data signature using an ECDSA public key.",
      defaultOutput: "utf8",
      inputs: [
        { id: "data", label: "Data" },
        { id: "signature", label: "Signature" },
        { id: "publicKey", label: "Public Key" },
      ],
      fields: [
        {
          id: "namedCurve",
          label: "Curve",
          type: "select",
          defaultValue: "P-256",
          options: [
            { label: "P-256", value: "P-256" },
            { label: "P-384", value: "P-384" },
            { label: "P-521", value: "P-521" },
          ],
        },
        {
          id: "hash",
          label: "Hash",
          type: "select",
          defaultValue: "SHA-256",
          options: [
            { label: "SHA-256", value: "SHA-256" },
            { label: "SHA-384", value: "SHA-384" },
            { label: "SHA-512", value: "SHA-512" },
          ],
        },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const signature = inputs["signature"] ?? new Uint8Array(0);
      const curve = (node.data["namedCurve"] as string) || "P-256";
      const hash = (node.data["hash"] as string) || "SHA-256";
      const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");

      if (!publicKeyBytes) throw new Error("Public Key is required");

      const key = await CryptoService.importECKey("spki", publicKeyBytes, "ECDSA", curve, ["verify"]);
      const isValid = await CryptoService.verify({ name: "ECDSA", hash }, key, signature, data);
      return utf8ToBytes(isValid ? "Valid" : "Invalid");
    },
  },
  ecdh: {
    meta: {
      kind: "ecdh",
      label: "ECDH Derive",
      category: "asymmetric",
      description: "Derive bits using ECDH (Elliptic Curve Diffie-Hellman).",
      defaultOutput: "hex",
      inputs: [
        { id: "privateKey", label: "My Private Key" },
        { id: "publicKey", label: "Peer Public Key" },
      ],
      fields: [
        {
          id: "namedCurve",
          label: "Curve",
          type: "select",
          defaultValue: "P-256",
          options: [
            { label: "P-256", value: "P-256" },
            { label: "P-384", value: "P-384" },
            { label: "P-521", value: "P-521" },
          ],
        },
        { id: "length", label: "Derived Length (bits)", type: "number", defaultValue: 256 },
      ],
    },
    runner: async (node, inputs) => {
      const curve = (node.data["namedCurve"] as string) || "P-256";
      const length = parseInt((node.data["length"] as string) || "256", 10);
      const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
      const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");

      if (!privateKeyBytes || !publicKeyBytes) throw new Error("Both Keys are required for ECDH");

      const privateKey = await CryptoService.importECKey("pkcs8", privateKeyBytes, "ECDH", curve, ["deriveBits"]);
      const publicKey = await CryptoService.importECKey("spki", publicKeyBytes, "ECDH", curve, []);

      return CryptoService.deriveBits(
        { name: "ECDH", public: publicKey },
        privateKey,
        length,
      );
    },
  },
};
