import type { NodeDef, GraphNode } from "../types";
import { CryptoService, getProvider, type RsaProvider, type MacProvider, utf8ToBytes } from "../service";
import { getParamBytes } from "../utils";

// ─── RSA Node Definitions ──────────────────────────────────────

export const rsaNodes: Record<string, NodeDef> = {
  rsa_keygen: {
    meta: {
      kind: "rsa_keygen",
      label: "RSA Key Gen",
      category: "asymmetric",
      description: "Generate an RSA key pair.",
      defaultOutput: "pem",
      supportedFormats: ["pem", "base64", "hex", "utf8"],
      outputs: [
        { id: "publicKey", label: "Public Key" },
        { id: "privateKey", label: "Private Key" },
      ],
      fields: [
        {
          id: "algorithm",
          label: "Algorithm",
          type: "select",
          defaultValue: "RSA-OAEP",
          options: [
            { label: "RSA-OAEP", value: "RSA-OAEP" },
            { label: "RSASSA-PKCS1-v1_5", value: "RSASSA-PKCS1-v1_5" },
            { label: "RSA-PSS", value: "RSA-PSS" },
          ],
        },
        {
          id: "modulusLength",
          label: "Modulus Length (bits)",
          type: "select",
          defaultValue: "2048",
          options: [
            { label: "1024", value: "1024" },
            { label: "2048", value: "2048" },
            { label: "4096", value: "4096" },
          ],
        },
        {
          id: "hash",
          label: "Hash",
          type: "select",
          defaultValue: "SHA-256",
          options: [
            { label: "SHA-1", value: "SHA-1" },
            { label: "SHA-256", value: "SHA-256" },
            { label: "SHA-384", value: "SHA-384" },
            { label: "SHA-512", value: "SHA-512" },
          ],
        },
      ],
    },
    runner: async (node) => {
      const algo = (node.data["algorithm"] as any) || "RSA-OAEP";
      const modulusLength = parseInt((node.data["modulusLength"] as string) || "2048", 10);
      const hash = (node.data["hash"] as string) || "SHA-256";
      const publicExponent = new Uint8Array([0x01, 0x00, 0x01]);

      const keyPair = await CryptoService.generateRSAKeyPair(algo, modulusLength, publicExponent, hash);
      const publicKey = await CryptoService.exportKey("spki", keyPair.publicKey);
      const privateKey = await CryptoService.exportKey("pkcs8", keyPair.privateKey);

      return {
        publicKey,
        privateKey,
      };
    },
  },
  rsa: {
    meta: {
      kind: "rsa",
      label: "RSA",
      category: "asymmetric",
      description: "RSA encrypt/decrypt. Supports RSA-OAEP, RSAES-PKCS1-V1_5, RAW.",
      defaultOutput: "base64",
      inputs: [
        { id: "data", label: "Data" },
        { id: "publicKey", label: "Public Key", visible: (d) => d["action"] !== "decrypt" },
        { id: "privateKey", label: "Private Key", visible: (d) => d["action"] === "decrypt" },
      ],
      fields: [
        {
          id: "action",
          label: "Action",
          type: "select",
          defaultValue: "encrypt",
          options: [
            { label: "Encrypt", value: "encrypt" },
            { label: "Decrypt", value: "decrypt" },
          ],
        },
        {
          id: "scheme",
          label: "Scheme",
          type: "select",
          defaultValue: "RSA-OAEP",
          options: [
            { label: "RSA-OAEP", value: "RSA-OAEP" },
            { label: "RSAES-PKCS1-V1_5", value: "RSAES-PKCS1-V1_5" },
            { label: "RAW", value: "RAW" },
          ],
        },
        {
          id: "publicKey",
          label: "Public Key (B64/PEM)",
          type: "textarea",
          placeholder: "Paste SPKI public key...",
          visible: (d) => d["action"] !== "decrypt",
        },
        {
          id: "privateKey",
          label: "Private Key (B64/PEM)",
          type: "password",
          placeholder: "Paste PKCS8 private key...",
          visible: (d) => d["action"] === "decrypt",
        },
        {
          id: "hash",
          label: "Hash",
          type: "select",
          defaultValue: "SHA-256",
          visible: (d) => d["scheme"] === "RSA-OAEP",
          options: [
            { label: "SHA-1", value: "SHA-1" },
            { label: "SHA-256", value: "SHA-256" },
            { label: "SHA-384", value: "SHA-384" },
            { label: "SHA-512", value: "SHA-512" },
          ],
        },
      ],
    },
    runner: async (node, inputs) => {
      const action = (node.data["action"] as string) || "encrypt";
      const scheme = (node.data["scheme"] as string) || "RSA-OAEP";
      const hash = (node.data["hash"] as string) || "SHA-256";
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
  },
  rsa_sign: {
    meta: {
      kind: "rsa_sign",
      label: "RSA Sign",
      category: "asymmetric",
      description: "Digital signature generation using a private key.",
      defaultOutput: "base64",
      inputs: [
        { id: "data", label: "Data" },
        { id: "privateKey", label: "Private Key" },
      ],
      fields: [
        {
          id: "algorithm",
          label: "Algorithm",
          type: "select",
          defaultValue: "RSASSA-PKCS1-v1_5",
          options: [
            { label: "RSASSA-PKCS1-v1_5", value: "RSASSA-PKCS1-v1_5" },
            { label: "RSA-PSS", value: "RSA-PSS" },
          ],
        },
        {
          id: "hash",
          label: "Hash",
          type: "select",
          defaultValue: "SHA-256",
          options: [
            { label: "SHA-1", value: "SHA-1" },
            { label: "SHA-256", value: "SHA-256" },
            { label: "SHA-384", value: "SHA-384" },
            { label: "SHA-512", value: "SHA-512" },
          ],
        },
        {
          id: "privateKey",
          label: "Private Key (B64/PEM)",
          type: "password",
          placeholder: "Paste PKCS8 private key...",
        },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const algo = (node.data["algorithm"] as string) || "RSASSA-PKCS1-v1_5";
      const hash = (node.data["hash"] as string) || "SHA-256";

      const privateKeyBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
      if (!privateKeyBytes) throw new Error("Private Key is required");

      const provider = getProvider(algo) as MacProvider;
      if (!provider) throw new Error(`Provider for ${algo} not found`);

      return provider.sign(privateKeyBytes, data, { hash });
    },
  },
  rsa_verify: {
    meta: {
      kind: "rsa_verify",
      label: "RSA Verify",
      category: "asymmetric",
      description: "Digital signature verification using a public key.",
      defaultOutput: "utf8",
      inputs: [
        { id: "data", label: "Data" },
        { id: "signature", label: "Signature" },
        { id: "publicKey", label: "Public Key" },
      ],
      fields: [
        {
          id: "algorithm",
          label: "Algorithm",
          type: "select",
          defaultValue: "RSASSA-PKCS1-v1_5",
          options: [
            { label: "RSASSA-PKCS1-v1_5", value: "RSASSA-PKCS1-v1_5" },
            { label: "RSA-PSS", value: "RSA-PSS" },
          ],
        },
        {
          id: "hash",
          label: "Hash",
          type: "select",
          defaultValue: "SHA-256",
          options: [
            { label: "SHA-1", value: "SHA-1" },
            { label: "SHA-256", value: "SHA-256" },
            { label: "SHA-384", value: "SHA-384" },
            { label: "SHA-512", value: "SHA-512" },
          ],
        },
        {
          id: "publicKey",
          label: "Public Key (B64/PEM)",
          type: "textarea",
          placeholder: "Paste SPKI public key...",
        },
      ],
    },
    runner: async (node, inputs) => {
      const data = inputs["data"] ?? new Uint8Array(0);
      const signature = inputs["signature"] ?? new Uint8Array(0);
      const algo = (node.data["algorithm"] as string) || "RSASSA-PKCS1-v1_5";
      const hash = (node.data["hash"] as string) || "SHA-256";

      const publicKeyBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
      if (!publicKeyBytes) throw new Error("Public Key is required");

      const provider = getProvider(algo) as MacProvider;
      if (!provider) throw new Error(`Provider for ${algo} not found`);

      const isValid = await provider.verify(publicKeyBytes, signature, data, { hash });
      return utf8ToBytes(isValid ? "Valid Signature" : "Invalid Signature");
    },
  },
};
