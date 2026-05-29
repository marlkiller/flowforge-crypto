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

export function getRNCryptorV3Seed(): WorkflowSeed {
  // Spec: version(1) || options(1) || encryption_salt(8) || hmac_salt(8) || iv(16) || ciphertext(...) || hmac(32)
  const input = makeNode("input", { x: 0, y: -250 }, { 
    label: "Plaintext", 
    text: "RNCryptor v3 spec implementation in FlowForge Crypto",
  });
  const password = makeNode("input", { x: 0, y: 0 }, { 
    label: "Password", 
    text: "rncryptor-password" 
  });
  
  // 1. Setup Randoms
  const encSalt = makeNode("random", { x: 300, y: -150 }, { label: "Enc Salt (8B)", length: 8, outputFormat: "hex" });
  const hmacSalt = makeNode("random", { x: 300, y: -50 }, { label: "HMAC Salt (8B)", length: 8, outputFormat: "hex" });
  const iv = makeNode("random", { x: 300, y: 50 }, { label: "IV (16B)", length: 16, outputFormat: "hex" });

  // 2. KDFs (PBKDF2-SHA1, 10000 iterations per spec)
  const kdfEnc = makeNode("pbkdf2", { x: 600, y: -150 }, { label: "Encryption Key KDF", hash: "SHA-1", iterations: 10000, outputFormat: "hex" });
  const kdfHmac = makeNode("pbkdf2", { x: 600, y: -50 }, { label: "HMAC Key KDF", hash: "SHA-1", iterations: 10000, outputFormat: "hex" });

  // 3. Encrypt
  const aesEnc = makeNode("aes", { x: 950, y: -250 }, { action: "encrypt", label: "AES-256-CBC", outputFormat: "hex" });
  
  // 4. Header
  const version = makeNode("input", { x: 650, y: 150 }, { label: "Version (0x03)", text: "03", inputFormat: "hex", outputFormat: "hex" });
  const options = makeNode("input", { x: 650, y: 250 }, { label: "Options (0x01)", text: "01", inputFormat: "hex", outputFormat: "hex" });
  const joinHeader = makeNode("join", { x: 950, y: 100 }, { label: "Header", count: 5, separator: "none", outputFormat: "hex" });

  // 5. Signature and Final Assembly
  const joinHmacMsg = makeNode("join", { x: 1250, y: -100 }, { label: "HMAC Message", count: 2, separator: "none", outputFormat: "hex" });
  const hmacSign = makeNode("hmacsha256", { x: 1250, y: 100 }, { action: "sign", label: "HMAC Sign", outputFormat: "hex" });
  
  const joinFinal = makeNode("join", { x: 1550, y: 0 }, { label: "Final Package", count: 2, separator: "none", outputFormat: "hex" });
  const output = makeNode("output", { x: 1850, y: 0 }, { label: "RNCryptor v3 Result", outputFormat: "hex" });

  // 6. Validation Path (Disassemble & Decrypt)
  const sliceHeader = makeNode("slice", { x: 1850, y: 250 }, { label: "Header (34B)", start: 0, end: 34, outputFormat: "hex" });
  const sliceCt = makeNode("slice", { x: 1850, y: 350 }, { label: "Ciphertext", start: 34, end: -32, outputFormat: "hex" });
  const sliceHmac = makeNode("slice", { x: 1850, y: 450 }, { label: "HMAC (32B)", start: -32, outputFormat: "hex" });

  const valEncSalt = makeNode("slice", { x: 2150, y: 150 }, { label: "Extracted Enc Salt", start: 2, end: 10, outputFormat: "hex" });
  const valIv = makeNode("slice", { x: 2150, y: 250 }, { label: "Extracted IV", start: 18, end: 34, outputFormat: "hex" });

  const kdfEncVal = makeNode("pbkdf2", { x: 2450, y: 150 }, { label: "Re-derive Enc Key", hash: "SHA-1", iterations: 10000, outputFormat: "hex" });
  const aesDec = makeNode("aes", { x: 2750, y: 200 }, { action: "decrypt", label: "AES Decrypt (Verify)", outputFormat: "utf8" });
  const outFinal = makeNode("output", { x: 3050, y: 200 }, { label: "Recovered Plaintext" });

  return {
    name: "RNCryptor v3 (Standard)",
    nodes: [
      input, password, encSalt, hmacSalt, iv, kdfEnc, kdfHmac, aesEnc,
      version, options, joinHeader, joinHmacMsg, hmacSign, joinFinal, output,
      sliceHeader, sliceCt, sliceHmac, valEncSalt, valIv, kdfEncVal, aesDec, outFinal
    ],
    edges: [
      // Encryption Path
      { id: "r1", source: input.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "r2", source: password.id, target: kdfEnc.id, targetHandle: "password", animated: true },
      { id: "r3", source: encSalt.id, target: kdfEnc.id, targetHandle: "salt", animated: true },
      { id: "r4", source: kdfEnc.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "r5", source: iv.id, target: aesEnc.id, targetHandle: "iv", animated: true },
      
      // HMAC Path
      { id: "r6", source: password.id, target: kdfHmac.id, targetHandle: "password", animated: true },
      { id: "r7", source: hmacSalt.id, target: kdfHmac.id, targetHandle: "salt", animated: true },
      
      // Header Assembly
      { id: "r8", source: version.id, target: joinHeader.id, targetHandle: "in_1", animated: true },
      { id: "r9", source: options.id, target: joinHeader.id, targetHandle: "in_2", animated: true },
      { id: "r10", source: encSalt.id, target: joinHeader.id, targetHandle: "in_3", animated: true },
      { id: "r11", source: hmacSalt.id, target: joinHeader.id, targetHandle: "in_4", animated: true },
      { id: "r12", source: iv.id, target: joinHeader.id, targetHandle: "in_5", animated: true },
      
      // Signing
      { id: "r13", source: joinHeader.id, target: joinHmacMsg.id, targetHandle: "in_1", animated: true },
      { id: "r14", source: aesEnc.id, target: joinHmacMsg.id, targetHandle: "in_2", animated: true },
      { id: "r15", source: kdfHmac.id, target: hmacSign.id, targetHandle: "key", animated: true },
      { id: "r16", source: joinHmacMsg.id, target: hmacSign.id, targetHandle: "data", animated: true },
      
      // Final Assembly
      { id: "r17", source: joinHmacMsg.id, target: joinFinal.id, targetHandle: "in_1", animated: true },
      { id: "r18", source: hmacSign.id, target: joinFinal.id, targetHandle: "in_2", animated: true },
      { id: "r19", source: joinFinal.id, target: output.id, animated: true },

      // Validation Path
      { id: "v1", source: joinFinal.id, target: sliceHeader.id, targetHandle: "data", animated: true },
      { id: "v2", source: joinFinal.id, target: sliceCt.id, targetHandle: "data", animated: true },
      { id: "v3", source: joinFinal.id, target: sliceHmac.id, targetHandle: "data", animated: true },
      
      { id: "v4", source: sliceHeader.id, target: valEncSalt.id, targetHandle: "data", animated: true },
      { id: "v5", source: sliceHeader.id, target: valIv.id, targetHandle: "data", animated: true },
      
      { id: "v6", source: password.id, target: kdfEncVal.id, targetHandle: "password", animated: true },
      { id: "v7", source: valEncSalt.id, target: kdfEncVal.id, targetHandle: "salt", animated: true },
      
      { id: "v8", source: sliceCt.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "v9", source: kdfEncVal.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "v10", source: valIv.id, target: aesDec.id, targetHandle: "iv", animated: true },
      { id: "v11", source: aesDec.id, target: outFinal.id, animated: true },
    ],
  };
}
