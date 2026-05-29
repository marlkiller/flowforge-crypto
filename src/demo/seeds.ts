import { makeNode } from "@/lib/crypto/factory";
import type { GraphNode, GraphEdge } from "@/lib/crypto/types";

export interface WorkflowSeed {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getAESStandardSeed(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { "text": "hello world", "label": "Message" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    { "text": "12345678901234567890123456789012", "inputFormat": "hex", "label": "Shared Key (Hex)" },
  );
  const srcIv = makeNode(
    "input",
    { x: 50, y: 350 },
    { "text": "12345678901234567890123456789012", "inputFormat": "hex", "label": "Shared IV (Hex)" },
  );

  const aesEnc = makeNode(
    "aes",
    { x: 400, y: 50 },
    { "action": "encrypt", "cipherMode": "CBC", "label": "AES Encrypt" },
  );
  const aesDec = makeNode(
    "aes",
    { x: 750, y: 50 },
    { "action": "decrypt", "cipherMode": "CBC", "label": "AES Decrypt" },
  );
  const outNode = makeNode("output", { x: 1100, y: 150 }, { "label": "Result" });

  return {
    name: "AES (Standard)",
    nodes: [srcData, srcKey, srcIv, aesEnc, aesDec, outNode],
    edges: [
      { id: "e1", source: srcData.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "e2", source: srcKey.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "e3", source: srcIv.id, target: aesEnc.id, targetHandle: "iv", animated: true },
      { id: "e4", source: aesEnc.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "e5", source: srcKey.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "e6", source: srcIv.id, target: aesDec.id, targetHandle: "iv", animated: true },
      { id: "e7", source: aesDec.id, target: outNode.id, animated: true },
    ],
  };
}

export function getRSAFullSuiteSeed(): WorkflowSeed {
  const keyGen = makeNode("rsa_keygen", { x: 50, y: 150 }, { label: "RSA Master Keys" });
  const input = makeNode("input", { x: 50, y: 450 }, { text: "hello world", label: "Message" });

  // Encryption Path (Top)
  const rsaEnc = makeNode("rsa", { x: 450, y: 50 }, { action: "encrypt", label: "RSA Encrypt" });
  const rsaDec = makeNode("rsa", { x: 850, y: 50 }, { action: "decrypt", label: "RSA Decrypt" });
  const outEnc = makeNode("output", { x: 1250, y: 50 }, { label: "Decrypted Msg" });

  // Signature Path (Bottom)
  const rsaSign = makeNode("rsa_sign", { x: 450, y: 350 }, { label: "RSA Sign" });
  const rsaVerify = makeNode("rsa_verify", { x: 850, y: 350 }, { label: "RSA Verify" });
  const outSign = makeNode("output", { x: 1250, y: 350 }, { label: "Sig Status" });

  return {
    name: "RSA (Full Suite)",
    nodes: [keyGen, input, rsaEnc, rsaDec, outEnc, rsaSign, rsaVerify, outSign],
    edges: [
      // Encryption logic
      { id: "f1", source: input.id, target: rsaEnc.id, targetHandle: "data", animated: true },
      { id: "f2", source: keyGen.id, target: rsaEnc.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "f3", source: rsaEnc.id, target: rsaDec.id, targetHandle: "data", animated: true },
      { id: "f4", source: keyGen.id, target: rsaDec.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "f5", source: rsaDec.id, target: outEnc.id, animated: true },

      // Signature logic
      { id: "f6", source: input.id, target: rsaSign.id, targetHandle: "data", animated: true },
      { id: "f7", source: keyGen.id, target: rsaSign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "f8", source: input.id, target: rsaVerify.id, targetHandle: "data", animated: true },
      { id: "f9", source: rsaSign.id, target: rsaVerify.id, targetHandle: "signature", animated: true },
      { id: "f10", source: keyGen.id, target: rsaVerify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "f11", source: rsaVerify.id, target: outSign.id, animated: true },
    ],
  };
}

export function getHMACSeed(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Message" });
  const key = makeNode("input", { x: 50, y: 200 }, { text: "secret-key", label: "Secret Key" });

  const hmacSign = makeNode("hmacsha256", { x: 400, y: 50 }, { action: "sign", label: "HMAC Sign" });
  const hmacVerify = makeNode("hmacsha256", { x: 750, y: 50 }, { action: "verify", label: "HMAC Verify" });
  const out = makeNode("output", { x: 1100, y: 50 }, { label: "Verify Result" });

  return {
    name: "HMAC (SHA-256)",
    nodes: [input, key, hmacSign, hmacVerify, out],
    edges: [
      { id: "h1", source: input.id, target: hmacSign.id, targetHandle: "data", animated: true },
      { id: "h2", source: key.id, target: hmacSign.id, targetHandle: "key", animated: true },
      { id: "h3", source: input.id, target: hmacVerify.id, targetHandle: "data", animated: true },
      { id: "h4", source: key.id, target: hmacVerify.id, targetHandle: "key", animated: true },
      { id: "h5", source: hmacSign.id, target: hmacVerify.id, targetHandle: "signature", animated: true },
      { id: "h6", source: hmacVerify.id, target: out.id, animated: true },
    ],
  };
}

export function getKDFSeed(): WorkflowSeed {
  const password = makeNode("input", { x: 50, y: 50 }, { text: "my-password", label: "Password" });
  const salt = makeNode("input", { x: 50, y: 200 }, { text: "random-salt", label: "Salt" });

  const pbkdf2 = makeNode("pbkdf2", { x: 400, y: 50 }, { iterations: 100000, label: "PBKDF2" });
  const data = makeNode("input", { x: 400, y: 250 }, { text: "secret data", label: "Data to Encrypt" });
  
  const aesEnc = makeNode("aes", { x: 750, y: 50 }, { action: "encrypt", label: "AES Encrypt" });
  const aesDec = makeNode("aes", { x: 1050, y: 50 }, { action: "decrypt", label: "AES Decrypt" });
  
  const out = makeNode("output", { x: 1350, y: 50 }, { label: "Decrypted result" });

  return {
    name: "KDF (PBKDF2 + AES)",
    nodes: [password, salt, pbkdf2, data, aesEnc, aesDec, out],
    edges: [
      { id: "k1", source: password.id, target: pbkdf2.id, targetHandle: "password", animated: true },
      { id: "k2", source: salt.id, target: pbkdf2.id, targetHandle: "salt", animated: true },
      // 派生出的密钥同时给加密和解密节点使用
      { id: "k3", source: pbkdf2.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "k4", source: pbkdf2.id, target: aesDec.id, targetHandle: "key", animated: true },
      
      { id: "k5", source: data.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "k6", source: aesEnc.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "k7", source: aesDec.id, target: out.id, animated: true },
    ],
  };
}

export function getECCSuiteSeed(): WorkflowSeed {
  const keyGen = makeNode("ec_keygen", { x: 50, y: 150 }, { algorithm: "ECDSA", label: "EC Key Pair" });
  const input = makeNode("input", { x: 50, y: 450 }, { text: "ecc signature test", label: "Message" });

  const eccSign = makeNode("ecdsa_sign", { x: 450, y: 150 }, { label: "ECDSA Sign" });
  const eccVerify = makeNode("ecdsa_verify", { x: 850, y: 150 }, { label: "ECDSA Verify" });
  const out = makeNode("output", { x: 1250, y: 150 }, { label: "Status" });

  return {
    name: "ECC (ECDSA Suite)",
    nodes: [keyGen, input, eccSign, eccVerify, out],
    edges: [
      { id: "e1", source: input.id, target: eccSign.id, targetHandle: "data", animated: true },
      { id: "e2", source: keyGen.id, target: eccSign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "e3", source: input.id, target: eccVerify.id, targetHandle: "data", animated: true },
      { id: "e4", source: eccSign.id, target: eccVerify.id, targetHandle: "signature", animated: true },
      { id: "e5", source: keyGen.id, target: eccVerify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "e6", source: eccVerify.id, target: out.id, animated: true },
    ],
  };
}

export function getJWTSeed(): WorkflowSeed {
  const payload = makeNode("input", { x: 50, y: 50 }, { text: '{"sub": "1234567890", "name": "John Doe", "admin": true}', label: "JWT Payload" });
  const secret = makeNode("input", { x: 50, y: 250 }, { text: "super-secret-key-that-is-at-least-32-bytes-long", label: "Secret Key" });

  const jwtSign = makeNode("jwt_sign", { x: 450, y: 50 }, { algorithm: "HS256", label: "JWT Sign" });
  const jwtVerify = makeNode("jwt_verify", { x: 850, y: 50 }, { algorithm: "HS256", label: "JWT Verify" });
  const out = makeNode("output", { x: 1250, y: 50 }, { label: "Verified Claims" });

  return {
    name: "JWT (Sign & Verify)",
    nodes: [payload, secret, jwtSign, jwtVerify, out],
    edges: [
      { id: "j1", source: payload.id, target: jwtSign.id, targetHandle: "payload", animated: true },
      { id: "j2", source: secret.id, target: jwtSign.id, targetHandle: "key", animated: true },
      { id: "j3", source: jwtSign.id, target: jwtVerify.id, targetHandle: "token", animated: true },
      { id: "j4", source: secret.id, target: jwtVerify.id, targetHandle: "key", animated: true },
      { id: "j5", source: jwtVerify.id, target: out.id, animated: true },
    ],
  };
}

export function getOTPSeed(): WorkflowSeed {
  const secret = makeNode("input", { x: 50, y: 150 }, { text: "NBSWY3DPFQQFO33SNRSCC===", label: "Base32 Secret" });
  const b32Decode = makeNode("base32", { x: 350, y: 150 }, { mode: "decode", label: "Decode Secret", outputFormat: "utf8" });
  const totp = makeNode("totp", { x: 650, y: 150 }, { label: "Generate TOTP" });
  const out = makeNode("output", { x: 950, y: 150 }, { label: "6-Digit Code" });

  return {
    name: "TOTP (Authenticator)",
    nodes: [secret, b32Decode, totp, out],
    edges: [
      { id: "o1", source: secret.id, target: b32Decode.id, targetHandle: "data", animated: true },
      { id: "o2", source: b32Decode.id, target: totp.id, targetHandle: "secret", animated: true },
      { id: "o3", source: totp.id, target: out.id, animated: true },
    ],
  };
}

export function getArgon2Seed(): WorkflowSeed {
    const password = makeNode("input", { x: 50, y: 50 }, { text: "correct horse battery staple", label: "Password" });
    const salt = makeNode("input", { x: 50, y: 200 }, { text: "salt-is-not-secret", label: "Salt" });
    const argon2 = makeNode("argon2", { x: 400, y: 100 }, { t: 3, m: 65536, p: 1, label: "Argon2id" });
    const out = makeNode("output", { x: 750, y: 100 }, { label: "Strong Key", outputFormat: "hex" });

    return {
        name: "Argon2 (Password Hash)",
        nodes: [password, salt, argon2, out],
        edges: [
            { id: "a1", source: password.id, target: argon2.id, targetHandle: "password", animated: true },
            { id: "a2", source: salt.id, target: argon2.id, targetHandle: "salt", animated: true },
            { id: "a3", source: argon2.id, target: out.id, animated: true },
        ]
    };
}
