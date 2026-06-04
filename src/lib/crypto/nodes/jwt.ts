import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { utf8ToBytes, bytesToUtf8 } from "../service";
import { getField, getParamBytes } from "../utils";
import * as jose from "jose";
import { JWT_SIGN_META, JWT_VERIFY_META } from "./meta";

registerNodeDef("jwt_sign", {
  meta: JWT_SIGN_META,
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

    const alg = getField(node, "algorithm", "HS256");
    const issuer = getField(node, "issuer");
    const subject = getField(node, "subject");
    const expiresIn = getField(node, "expiresIn");

    let key: any = keyBytes;
    if (alg.startsWith("RS") || alg.startsWith("ES")) {
      const pem = bytesToUtf8(keyBytes).trim();
      key = await jose.importPKCS8(pem, alg);
    }

    const jwt = new jose.SignJWT(payload).setProtectedHeader({ alg });

    if (issuer) jwt.setIssuer(issuer);
    if (subject) jwt.setSubject(subject);
    if (expiresIn) jwt.setExpirationTime(expiresIn);
    jwt.setIssuedAt();

    const token = await jwt.sign(key);
    return utf8ToBytes(token);
  },
});

registerNodeDef("jwt_verify", {
  meta: JWT_VERIFY_META,
  runner: async (node, inputs) => {
    const token = bytesToUtf8(inputs["token"] ?? new Uint8Array(0));
    const keyBytes = getParamBytes(node as GraphNode, inputs, "key");
    if (!keyBytes) throw new Error("Key is required for JWT verification");

    const alg = getField(node, "algorithm", "HS256");

    let key: any = keyBytes;
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
});
