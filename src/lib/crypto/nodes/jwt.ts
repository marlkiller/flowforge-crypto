import type { NodeDef, GraphNode } from "../types";
import { utf8ToBytes, bytesToUtf8 } from "../service";
import { getParamBytes } from "../utils";
import * as jose from "jose";

export const jwtNodes: Record<string, NodeDef> = {
  jwt_sign: {
    meta: {
      kind: "jwt_sign",
      label: "JWT Sign",
      category: "protocol",
      description: "Sign a JSON Web Token.",
      defaultOutput: "utf8",
      inputs: [
        { id: "payload", label: "Payload (JSON)" },
        { id: "key", label: "Secret/Private Key" },
      ],
      fields: [
        {
          id: "algorithm",
          label: "Algorithm",
          type: "select",
          defaultValue: "HS256",
          options: [
            { label: "HS256 (HMAC SHA-256)", value: "HS256" },
            { label: "HS512 (HMAC SHA-512)", value: "HS512" },
            { label: "RS256 (RSA PKCS#1 v1.5 SHA-256)", value: "RS256" },
            { label: "ES256 (ECDSA P-256 SHA-256)", value: "ES256" },
          ],
        },
        { id: "issuer", label: "Issuer (iss)", type: "text", placeholder: "optional..." },
        { id: "subject", label: "Subject (sub)", type: "text", placeholder: "optional..." },
        { id: "expiresIn", label: "Expires In (e.g. 2h)", type: "text", defaultValue: "2h" },
      ],
    },
    runner: async (node, inputs) => {
      const payloadStr = bytesToUtf8(inputs["payload"] ?? utf8ToBytes("{}"));
      const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
      if (!keyBytes) throw new Error("Key is required for JWT signing");

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        throw new Error("Invalid JSON payload");
      }

      const alg = (node.data["algorithm"] as string) || "HS256";
      const issuer = node.data["issuer"] as string;
      const subject = node.data["subject"] as string;
      const expiresIn = node.data["expiresIn"] as string;

      let key: jose.KeyLike | Uint8Array = keyBytes;
      if (alg.startsWith("RS") || alg.startsWith("ES")) {
        const pem = bytesToUtf8(keyBytes).trim();
        // Assume private key for signing
        key = await jose.importPKCS8(pem, alg);
      }

      const jwt = new jose.SignJWT(payload)
        .setProtectedHeader({ alg });
      
      if (issuer) jwt.setIssuer(issuer);
      if (subject) jwt.setSubject(subject);
      if (expiresIn) jwt.setExpirationTime(expiresIn);
      jwt.setIssuedAt();

      const token = await jwt.sign(key);
      return utf8ToBytes(token);
    },
  },
  jwt_verify: {
    meta: {
      kind: "jwt_verify",
      label: "JWT Verify",
      category: "protocol",
      description: "Verify a JSON Web Token.",
      defaultOutput: "utf8",
      inputs: [
        { id: "token", label: "JWT Token" },
        { id: "key", label: "Secret/Public Key" },
      ],
      fields: [
        {
            id: "algorithm",
            label: "Expected Alg",
            type: "select",
            defaultValue: "HS256",
            options: [
              { label: "HS256", value: "HS256" },
              { label: "HS512", value: "HS512" },
              { label: "RS256", value: "RS256" },
              { label: "ES256", value: "ES256" },
            ],
          },
      ],
    },
    runner: async (node, inputs) => {
      const token = bytesToUtf8(inputs["token"] ?? new Uint8Array(0));
      const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
      if (!keyBytes) throw new Error("Key is required for JWT verification");

      const alg = (node.data["algorithm"] as string) || "HS256";
      
      let key: jose.KeyLike | Uint8Array = keyBytes;
      if (alg.startsWith("RS") || alg.startsWith("ES")) {
          key = await jose.importSPKI(bytesToUtf8(keyBytes), alg);
      }

      try {
        const { payload, protectedHeader } = await jose.jwtVerify(token, key, { algorithms: [alg] });
        return utf8ToBytes(JSON.stringify({ payload, header: protectedHeader }, null, 2));
      } catch (e) {
        throw new Error(`JWT Verification failed: ${(e as Error).message}`);
      }
    },
  },
};
