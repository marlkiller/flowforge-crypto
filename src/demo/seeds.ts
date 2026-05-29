import { makeNode } from "@/lib/crypto/factory";
import type { GraphNode, GraphEdge } from "@/lib/crypto/types";

export interface WorkflowSeed {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getAESStandardSeed(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Message" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    { text: "12345678901234567890123456789012", inputFormat: "hex", outputFormat: "hex", label: "Shared Key (Hex)" },
  );
  const srcIv = makeNode(
    "input",
    { x: 50, y: 350 },
    { text: "12345678901234567890123456789012", inputFormat: "hex", outputFormat: "hex", label: "Shared IV (Hex)" },
  );

  const aesEnc = makeNode(
    "aes",
    { x: 400, y: 50 },
    { action: "encrypt", cipherMode: "CBC", label: "AES Encrypt" },
  );
  const aesDec = makeNode(
    "aes",
    { x: 750, y: 50 },
    { action: "decrypt", cipherMode: "CBC", label: "AES Decrypt" },
  );
  const outNode = makeNode("output", { x: 1100, y: 150 }, { label: "Result" });

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
      {
        id: "f2",
        source: keyGen.id,
        target: rsaEnc.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "f3", source: rsaEnc.id, target: rsaDec.id, targetHandle: "data", animated: true },
      {
        id: "f4",
        source: keyGen.id,
        target: rsaDec.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "f5", source: rsaDec.id, target: outEnc.id, animated: true },

      // Signature logic
      { id: "f6", source: input.id, target: rsaSign.id, targetHandle: "data", animated: true },
      {
        id: "f7",
        source: keyGen.id,
        target: rsaSign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "f8", source: input.id, target: rsaVerify.id, targetHandle: "data", animated: true },
      {
        id: "f9",
        source: rsaSign.id,
        target: rsaVerify.id,
        targetHandle: "signature",
        animated: true,
      },
      {
        id: "f10",
        source: keyGen.id,
        target: rsaVerify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "f11", source: rsaVerify.id, target: outSign.id, animated: true },
    ],
  };
}

export function getHMACSeed(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Message" });
  const key = makeNode("input", { x: 50, y: 200 }, { text: "secret-key", label: "Secret Key" });

  const hmacSign = makeNode(
    "hmac",
    { x: 400, y: 50 },
    { action: "sign", hash: "SHA-256", label: "HMAC Sign" },
  );
  const hmacVerify = makeNode(
    "hmac",
    { x: 750, y: 50 },
    { action: "verify", hash: "SHA-256", label: "HMAC Verify" },
  );
  const out = makeNode("output", { x: 1100, y: 50 }, { label: "Verify Result" });

  return {
    name: "HMAC (SHA-256)",
    nodes: [input, key, hmacSign, hmacVerify, out],
    edges: [
      { id: "h1", source: input.id, target: hmacSign.id, targetHandle: "data", animated: true },
      { id: "h2", source: key.id, target: hmacSign.id, targetHandle: "key", animated: true },
      { id: "h3", source: input.id, target: hmacVerify.id, targetHandle: "data", animated: true },
      { id: "h4", source: key.id, target: hmacVerify.id, targetHandle: "key", animated: true },
      {
        id: "h5",
        source: hmacSign.id,
        target: hmacVerify.id,
        targetHandle: "signature",
        animated: true,
      },
      { id: "h6", source: hmacVerify.id, target: out.id, animated: true },
    ],
  };
}

export function getKDFSeed(): WorkflowSeed {
  const password = makeNode("input", { x: 50, y: 50 }, { text: "my-password", label: "Password" });
  const salt = makeNode("input", { x: 50, y: 200 }, { text: "random-salt", label: "Salt" });

  const pbkdf2 = makeNode("pbkdf2", { x: 400, y: 50 }, { iterations: 100000, label: "PBKDF2" });
  const data = makeNode(
    "input",
    { x: 400, y: 250 },
    { text: "secret data", label: "Data to Encrypt" },
  );

  const aesEnc = makeNode("aes", { x: 750, y: 50 }, { action: "encrypt", label: "AES Encrypt" });
  const aesDec = makeNode("aes", { x: 1050, y: 50 }, { action: "decrypt", label: "AES Decrypt" });

  const out = makeNode("output", { x: 1350, y: 50 }, { label: "Decrypted result" });

  return {
    name: "KDF (PBKDF2 + AES)",
    nodes: [password, salt, pbkdf2, data, aesEnc, aesDec, out],
    edges: [
      {
        id: "k1",
        source: password.id,
        target: pbkdf2.id,
        targetHandle: "password",
        animated: true,
      },
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
  const keyGen = makeNode(
    "ec_keygen",
    { x: 50, y: 150 },
    { algorithm: "ECDSA", label: "EC Key Pair" },
  );
  const input = makeNode(
    "input",
    { x: 50, y: 450 },
    { text: "ecc signature test", label: "Message" },
  );

  const eccSign = makeNode("ecdsa_sign", { x: 450, y: 150 }, { label: "ECDSA Sign" });
  const eccVerify = makeNode("ecdsa_verify", { x: 850, y: 150 }, { label: "ECDSA Verify" });
  const out = makeNode("output", { x: 1250, y: 150 }, { label: "Status" });

  return {
    name: "ECC (ECDSA Suite)",
    nodes: [keyGen, input, eccSign, eccVerify, out],
    edges: [
      { id: "e1", source: input.id, target: eccSign.id, targetHandle: "data", animated: true },
      {
        id: "e2",
        source: keyGen.id,
        target: eccSign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "e3", source: input.id, target: eccVerify.id, targetHandle: "data", animated: true },
      {
        id: "e4",
        source: eccSign.id,
        target: eccVerify.id,
        targetHandle: "signature",
        animated: true,
      },
      {
        id: "e5",
        source: keyGen.id,
        target: eccVerify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "e6", source: eccVerify.id, target: out.id, animated: true },
    ],
  };
}

export function getJWTSeed(): WorkflowSeed {
  const payload = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: '{"sub": "1234567890", "name": "John Doe", "admin": true}', label: "JWT Payload" },
  );
  const secret = makeNode(
    "input",
    { x: 50, y: 250 },
    { text: "super-secret-key-that-is-at-least-32-bytes-long", label: "Secret Key" },
  );

  const jwtSign = makeNode(
    "jwt_sign",
    { x: 450, y: 50 },
    { algorithm: "HS256", label: "JWT Sign" },
  );
  const jwtVerify = makeNode(
    "jwt_verify",
    { x: 850, y: 50 },
    { algorithm: "HS256", label: "JWT Verify" },
  );
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
  const secret = makeNode(
    "input",
    { x: 50, y: 150 },
    { text: "NBSWY3DPFQQFO33SNRSCC===", label: "Base32 Secret" },
  );
  const b32Decode = makeNode(
    "base32",
    { x: 350, y: 150 },
    { mode: "decode", label: "Decode Secret", outputFormat: "utf8" },
  );
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
  const password = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: "correct horse battery staple", label: "Password" },
  );
  const salt = makeNode("input", { x: 50, y: 200 }, { text: "salt-is-not-secret", label: "Salt" });
  const argon2 = makeNode(
    "argon2",
    { x: 400, y: 100 },
    { t: 3, m: 65536, p: 1, label: "Argon2id" },
  );
  const out = makeNode("output", { x: 750, y: 100 }, { label: "Strong Key", outputFormat: "hex" });

  return {
    name: "Argon2 (Password Hash)",
    nodes: [password, salt, argon2, out],
    edges: [
      {
        id: "a1",
        source: password.id,
        target: argon2.id,
        targetHandle: "password",
        animated: true,
      },
      { id: "a2", source: salt.id, target: argon2.id, targetHandle: "salt", animated: true },
      { id: "a3", source: argon2.id, target: out.id, animated: true },
    ],
  };
}

export function getEd25519X25519SuiteSeed(): WorkflowSeed {
  const keyGen = makeNode("ed_keygen", { x: 50, y: 50 }, { label: "Ed25519 Key Pair" });
  const msg = makeNode(
    "input",
    { x: 50, y: 250 },
    { text: "ed25519 demo message", label: "Message" },
  );

  const edSign = makeNode("ed_sign", { x: 450, y: 0 }, { label: "Ed25519 Sign" });
  const edVerify = makeNode("ed_verify", { x: 450, y: 250 }, { label: "Ed25519 Verify" });
  const outSign = makeNode(
    "output",
    { x: 850, y: 0 },
    { label: "Signature", outputFormat: "base64" },
  );
  const outStatus = makeNode(
    "output",
    { x: 850, y: 150 },
    { label: "Verify Status", outputFormat: "utf8" },
  );
  const outMsg = makeNode(
    "output",
    { x: 850, y: 300 },
    { label: "Recovered Message", outputFormat: "utf8" },
  );

  const aliceKey = makeNode("ed_keygen", { x: 50, y: 550 }, { label: "Alice Key Pair" });
  const bobKey = makeNode("ed_keygen", { x: 50, y: 750 }, { label: "Bob Key Pair" });

  const aliceDerive = makeNode("x25519_derive", { x: 500, y: 550 }, { label: "X25519 (Alice)" });
  const bobDerive = makeNode("x25519_derive", { x: 500, y: 750 }, { label: "X25519 (Bob)" });

  const outAlice = makeNode(
    "output",
    { x: 900, y: 550 },
    { label: "Shared Secret (Alice)", outputFormat: "hex" },
  );
  const outBob = makeNode(
    "output",
    { x: 900, y: 750 },
    { label: "Shared Secret (Bob)", outputFormat: "hex" },
  );

  return {
    name: "Ed25519/X25519 Suite",
    nodes: [
      keyGen,
      msg,
      edSign,
      edVerify,
      outSign,
      outStatus,
      outMsg,
      aliceKey,
      bobKey,
      aliceDerive,
      bobDerive,
      outAlice,
      outBob,
    ],
    edges: [
      { id: "s1", source: msg.id, target: edSign.id, targetHandle: "data", animated: true },
      {
        id: "s2",
        source: keyGen.id,
        target: edSign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "s3", source: msg.id, target: edVerify.id, targetHandle: "data", animated: true },
      {
        id: "s4",
        source: edSign.id,
        target: edVerify.id,
        targetHandle: "signature",
        animated: true,
      },
      {
        id: "s5",
        source: keyGen.id,
        target: edVerify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "s6", source: edSign.id, target: outSign.id, animated: true },
      { id: "s7", source: edVerify.id, target: outStatus.id, animated: true },
      { id: "s8", source: msg.id, target: outMsg.id, animated: true },
      {
        id: "k1",
        source: aliceKey.id,
        target: aliceDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "k2",
        source: bobKey.id,
        target: aliceDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "k3",
        source: bobKey.id,
        target: bobDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "k4",
        source: aliceKey.id,
        target: bobDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "k5", source: aliceDerive.id, target: outAlice.id, animated: true },
      { id: "k6", source: bobDerive.id, target: outBob.id, animated: true },
    ],
  };
}

export function getX25519Seed(): WorkflowSeed {
  const aliceKey = makeNode(
    "input",
    { x: 50, y: 50 },
    {
      text: "alice-secret-private-key-32-bytes-long!",
      label: "Alice's Secret",
    },
  );
  const bobKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "bob-private-key-32-bytes-long!!!!!!",
      label: "Bob's Secret",
    },
  );

  const alicePub = makeNode(
    "input",
    { x: 350, y: 50 },
    {
      text: "bob-public-key-not-needed-in-visual",
      label: "Alice Public Key",
    },
  );
  const bobPub = makeNode(
    "input",
    { x: 350, y: 200 },
    {
      text: "alice-public-key-wired-to-bob",
      label: "Bob Public Key",
    },
  );

  const deriveAlice = makeNode(
    "x25519_derive",
    { x: 700, y: 50 },
    { label: "X25519 Derive (Alice)" },
  );
  const deriveBob = makeNode("x25519_derive", { x: 700, y: 200 }, { label: "X25519 Derive (Bob)" });

  const outAlice = makeNode(
    "output",
    { x: 1050, y: 50 },
    { label: "Shared (Alice)", outputFormat: "hex" },
  );
  const outBob = makeNode(
    "output",
    { x: 1050, y: 200 },
    { label: "Shared (Bob)", outputFormat: "hex" },
  );

  return {
    name: "X25519 (Key Agreement)",
    nodes: [aliceKey, bobKey, alicePub, bobPub, deriveAlice, deriveBob, outAlice, outBob],
    edges: [
      {
        id: "x1",
        source: aliceKey.id,
        target: deriveAlice.id,
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "x2",
        source: bobKey.id,
        target: deriveAlice.id,
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "x3",
        source: bobKey.id,
        target: deriveBob.id,
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "x4",
        source: aliceKey.id,
        target: deriveBob.id,
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "x5", source: deriveAlice.id, target: outAlice.id, animated: true },
      { id: "x6", source: deriveBob.id, target: outBob.id, animated: true },
    ],
  };
}

export function getXChaCha20Seed(): WorkflowSeed {
  const srcData = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: "xchacha20 demo with 192-bit nonce", label: "Message" },
  );
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (256-bit)",
    },
  );

  const enc = makeNode(
    "xchacha20poly1305",
    { x: 400, y: 50 },
    { action: "encrypt", label: "XChaCha20 Encrypt" },
  );
  const dec = makeNode(
    "xchacha20poly1305",
    { x: 750, y: 50 },
    { action: "decrypt", label: "XChaCha20 Decrypt" },
  );
  const out = makeNode(
    "output",
    { x: 1100, y: 50 },
    { label: "Decrypted Text", outputFormat: "utf8" },
  );

  return {
    name: "XChaCha20-Poly1305",
    nodes: [srcData, srcKey, enc, dec, out],
    edges: [
      { id: "xc1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "xc2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "xc3", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "xc4", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "xc5", source: dec.id, target: out.id, animated: true },
    ],
  };
}

export function getAesGcmSivSeed(): WorkflowSeed {
  const srcData = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: "aes-gcm-siv misuse-resistant demo", label: "Message" },
  );
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (128-bit)",
    },
  );

  const enc = makeNode(
    "aesGcmSiv",
    { x: 400, y: 50 },
    { action: "encrypt", label: "GCM-SIV Encrypt" },
  );
  const dec = makeNode(
    "aesGcmSiv",
    { x: 750, y: 50 },
    { action: "decrypt", label: "GCM-SIV Decrypt" },
  );
  const out = makeNode(
    "output",
    { x: 1100, y: 50 },
    { label: "Decrypted Text", outputFormat: "utf8" },
  );

  return {
    name: "AES-GCM-SIV",
    nodes: [srcData, srcKey, enc, dec, out],
    edges: [
      { id: "gs1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "gs2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "gs3", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "gs4", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "gs5", source: dec.id, target: out.id, animated: true },
    ],
  };
}

export function getBcryptSeed(): WorkflowSeed {
  const password = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: "my-secure-password", label: "Password" },
  );
  const salt = makeNode("input", { x: 50, y: 200 }, { text: "saltsalt-saltsalt", label: "Salt" });
  const bcryptHash = makeNode(
    "bcrypt",
    { x: 400, y: 50 },
    { action: "hash", rounds: 10, label: "bcrypt Hash" },
  );
  const outHash = makeNode(
    "output",
    { x: 750, y: 50 },
    { label: "Hash Output", outputFormat: "utf8" },
  );

  const verifyPassword = makeNode(
    "input",
    { x: 50, y: 350 },
    { text: "my-secure-password", label: "Verify Password" },
  );
  const bcryptVerify = makeNode(
    "bcrypt",
    { x: 400, y: 350 },
    { action: "verify", label: "bcrypt Verify" },
  );
  const outVerify = makeNode(
    "output",
    { x: 750, y: 350 },
    { label: "Verify Result", outputFormat: "utf8" },
  );

  return {
    name: "bcrypt (Hash & Verify)",
    nodes: [password, salt, bcryptHash, outHash, verifyPassword, bcryptVerify, outVerify],
    edges: [
      {
        id: "b1",
        source: password.id,
        target: bcryptHash.id,
        targetHandle: "password",
        animated: true,
      },
      { id: "b2", source: salt.id, target: bcryptHash.id, targetHandle: "salt", animated: true },
      { id: "b3", source: bcryptHash.id, target: outHash.id, animated: true },
      {
        id: "b4",
        source: verifyPassword.id,
        target: bcryptVerify.id,
        targetHandle: "password",
        animated: true,
      },
      {
        id: "b5",
        source: bcryptHash.id,
        target: bcryptVerify.id,
        targetHandle: "hash",
        animated: true,
      },
      { id: "b6", source: bcryptVerify.id, target: outVerify.id, animated: true },
    ],
  };
}

export function getModernHashSeed(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 200 },
    { text: "modern hashing demo", label: "Input" },
  );

  const blake2b = makeNode("blake2b", { x: 350, y: 0 }, { label: "BLAKE2b" });
  const blake2s = makeNode("blake2s", { x: 350, y: 150 }, { label: "BLAKE2s" });
  const blake3 = makeNode("blake3", { x: 350, y: 300 }, { label: "BLAKE3" });
  const ripemd = makeNode("ripemd160", { x: 350, y: 450 }, { label: "RIPEMD-160" });
  const shake = makeNode("shake256", { x: 350, y: 600 }, { label: "SHAKE256" });

  const out1 = makeNode("output", { x: 650, y: 0 }, { label: "BLAKE2b", outputFormat: "hex" });
  const out2 = makeNode("output", { x: 650, y: 150 }, { label: "BLAKE2s", outputFormat: "hex" });
  const out3 = makeNode("output", { x: 650, y: 300 }, { label: "BLAKE3", outputFormat: "hex" });
  const out4 = makeNode("output", { x: 650, y: 450 }, { label: "RIPEMD-160", outputFormat: "hex" });
  const out5 = makeNode("output", { x: 650, y: 600 }, { label: "SHAKE256", outputFormat: "hex" });

  return {
    name: "Modern Hash Suite",
    nodes: [input, blake2b, blake2s, blake3, ripemd, shake, out1, out2, out3, out4, out5],
    edges: [
      { id: "h1", source: input.id, target: blake2b.id, targetHandle: "data", animated: true },
      { id: "h2", source: input.id, target: blake2s.id, targetHandle: "data", animated: true },
      { id: "h3", source: input.id, target: blake3.id, targetHandle: "data", animated: true },
      { id: "h4", source: input.id, target: ripemd.id, targetHandle: "data", animated: true },
      { id: "h5", source: input.id, target: shake.id, targetHandle: "data", animated: true },
      { id: "h6", source: blake2b.id, target: out1.id, animated: true },
      { id: "h7", source: blake2s.id, target: out2.id, animated: true },
      { id: "h8", source: blake3.id, target: out3.id, animated: true },
      { id: "h9", source: ripemd.id, target: out4.id, animated: true },
      { id: "h10", source: shake.id, target: out5.id, animated: true },
    ],
  };
}

export function getModernMacSeed(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 50 }, { text: "modern mac demo", label: "Message" });
  const keyPoly = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      label: "Poly1305 Key (32B)",
      outputFormat: "hex",
    },
  );
  const keyCmac = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "CMAC Key (16B)",
    },
  );

  const polySign = makeNode("poly1305", { x: 400, y: 100 }, { action: "sign", label: "Poly1305" });
  const polyVerify = makeNode(
    "poly1305",
    { x: 750, y: 100 },
    { action: "verify", label: "Poly1305 Verify" },
  );
  const cmacSign = makeNode("cmac", { x: 400, y: 300 }, { action: "sign", label: "CMAC" });
  const cmacVerify = makeNode(
    "cmac",
    { x: 750, y: 300 },
    { action: "verify", label: "CMAC Verify" },
  );

  const outPoly = makeNode(
    "output",
    { x: 1100, y: 100 },
    { label: "Poly1305 Status", outputFormat: "utf8" },
  );
  const outCmac = makeNode(
    "output",
    { x: 1100, y: 300 },
    { label: "CMAC Status", outputFormat: "utf8" },
  );

  return {
    name: "Modern MAC (Poly1305 + CMAC)",
    nodes: [input, keyPoly, keyCmac, polySign, polyVerify, cmacSign, cmacVerify, outPoly, outCmac],
    edges: [
      { id: "m1", source: input.id, target: polySign.id, targetHandle: "data", animated: true },
      { id: "m2", source: keyPoly.id, target: polySign.id, targetHandle: "key", animated: true },
      { id: "m3", source: input.id, target: polyVerify.id, targetHandle: "data", animated: true },
      { id: "m4", source: keyPoly.id, target: polyVerify.id, targetHandle: "key", animated: true },
      {
        id: "m5",
        source: polySign.id,
        target: polyVerify.id,
        targetHandle: "signature",
        animated: true,
      },
      { id: "m6", source: polyVerify.id, target: outPoly.id, animated: true },
      { id: "m7", source: input.id, target: cmacSign.id, targetHandle: "data", animated: true },
      { id: "m8", source: keyCmac.id, target: cmacSign.id, targetHandle: "key", animated: true },
      { id: "m9", source: input.id, target: cmacVerify.id, targetHandle: "data", animated: true },
      { id: "m10", source: keyCmac.id, target: cmacVerify.id, targetHandle: "key", animated: true },
      {
        id: "m11",
        source: cmacSign.id,
        target: cmacVerify.id,
        targetHandle: "signature",
        animated: true,
      },
      { id: "m12", source: cmacVerify.id, target: outCmac.id, animated: true },
    ],
  };
}

export function getSM3Seed(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 100 },
    { text: "SM3 national hash standard demo", label: "Message" },
  );
  const sm3Node = makeNode("sm3", { x: 400, y: 100 }, { label: "SM3 Hash" });
  const out = makeNode("output", { x: 750, y: 100 }, { label: "SM3 Digest", outputFormat: "hex" });

  return {
    name: "SM3 (Hash)",
    nodes: [input, sm3Node, out],
    edges: [
      { id: "s1", source: input.id, target: sm3Node.id, targetHandle: "data", animated: true },
      { id: "s2", source: sm3Node.id, target: out.id, animated: true },
    ],
  };
}

export function getSM4Seed(): WorkflowSeed {
  const srcData = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: "SM4 block cipher demo", label: "Message" },
  );
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "0123456789abcdeffedcba9876543210",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (128-bit hex)",
    },
  );

  const enc = makeNode(
    "sm4",
    { x: 400, y: 50 },
    { action: "encrypt", cipherMode: "ECB", label: "SM4 Encrypt" },
  );
  const dec = makeNode(
    "sm4",
    { x: 750, y: 50 },
    { action: "decrypt", cipherMode: "ECB", label: "SM4 Decrypt" },
  );
  const out = makeNode(
    "output",
    { x: 1100, y: 50 },
    { label: "Decrypted", outputFormat: "utf8" },
  );

  return {
    name: "SM4 (ECB)",
    nodes: [srcData, srcKey, enc, dec, out],
    edges: [
      { id: "e1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "e2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "e3", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "e4", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "e5", source: dec.id, target: out.id, animated: true },
    ],
  };
}

export function getSM2SuiteSeed(): WorkflowSeed {
  // Key Generation
  const keyGen = makeNode("sm2_keygen", { x: 50, y: 150 }, { label: "SM2 Key Pair" });

  // Data
  const msg = makeNode(
    "input",
    { x: 50, y: 400 },
    { text: "SM2 crypto suite demo", label: "Message" },
  );

  // Sign/Verify Path
  const sign = makeNode("sm2_sign", { x: 450, y: 0 }, { label: "SM2 Sign" });
  const verify = makeNode("sm2_verify", { x: 850, y: 0 }, { label: "SM2 Verify" });
  const outStatus = makeNode(
    "output",
    { x: 1250, y: 0 },
    { label: "Sig Status", outputFormat: "utf8" },
  );

  // Encrypt/Decrypt Path
  const enc = makeNode("sm2_encrypt", { x: 450, y: 250 }, { label: "SM2 Encrypt" });
  const dec = makeNode("sm2_decrypt", { x: 850, y: 250 }, { label: "SM2 Decrypt" });
  const outMsg = makeNode(
    "output",
    { x: 1250, y: 250 },
    { label: "Decrypted", outputFormat: "utf8" },
  );

  return {
    name: "SM2 (Full Suite)",
    nodes: [keyGen, msg, sign, verify, outStatus, enc, dec, outMsg],
    edges: [
      // Sign
      { id: "s1", source: msg.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "s2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "s3", source: msg.id, target: verify.id, targetHandle: "data", animated: true },
      {
        id: "s4",
        source: sign.id,
        target: verify.id,
        targetHandle: "signature",
        animated: true,
      },
      {
        id: "s5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "s6", source: verify.id, target: outStatus.id, animated: true },
      // Encrypt
      { id: "e1", source: msg.id, target: enc.id, targetHandle: "data", animated: true },
      {
        id: "e2",
        source: keyGen.id,
        target: enc.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "e3", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      {
        id: "e4",
        source: keyGen.id,
        target: dec.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "e5", source: dec.id, target: outMsg.id, animated: true },
    ],
  };
}

export function getRNCryptorV3Seed(): WorkflowSeed {
  // Spec: version(1) || options(1) || encryption_salt(8) || hmac_salt(8) || iv(16) || ciphertext(...) || hmac(32)
  const input = makeNode(
    "input",
    { x: 0, y: -250 },
    {
      label: "Plaintext",
      text: "RNCryptor v3 spec implementation in FlowForge Crypto",
    },
  );
  const password = makeNode(
    "input",
    { x: 0, y: 0 },
    {
      label: "Password",
      text: "rncryptor-password",
    },
  );

  // 1. Setup Randoms
  const encSalt = makeNode(
    "random",
    { x: 300, y: -150 },
    { label: "Enc Salt (8B)", length: 8, outputFormat: "hex" },
  );
  const hmacSalt = makeNode(
    "random",
    { x: 300, y: -50 },
    { label: "HMAC Salt (8B)", length: 8, outputFormat: "hex" },
  );
  const iv = makeNode(
    "random",
    { x: 300, y: 50 },
    { label: "IV (16B)", length: 16, outputFormat: "hex" },
  );

  // 2. KDFs (PBKDF2-SHA1, 10000 iterations per spec)
  const kdfEnc = makeNode(
    "pbkdf2",
    { x: 600, y: -150 },
    { label: "Encryption Key KDF", hash: "SHA-1", iterations: 10000, outputFormat: "hex" },
  );
  const kdfHmac = makeNode(
    "pbkdf2",
    { x: 600, y: -50 },
    { label: "HMAC Key KDF", hash: "SHA-1", iterations: 10000, outputFormat: "hex" },
  );

  // 3. Encrypt
  const aesEnc = makeNode(
    "aes",
    { x: 950, y: -250 },
    { action: "encrypt", label: "AES-256-CBC", outputFormat: "hex" },
  );

  // 4. Header
  const version = makeNode(
    "input",
    { x: 650, y: 150 },
    { label: "Version (0x03)", text: "03", inputFormat: "hex", outputFormat: "hex" },
  );
  const options = makeNode(
    "input",
    { x: 650, y: 250 },
    { label: "Options (0x01)", text: "01", inputFormat: "hex", outputFormat: "hex" },
  );
  const joinHeader = makeNode(
    "join",
    { x: 950, y: 100 },
    { label: "Header", count: 5, separator: "none", outputFormat: "hex" },
  );

  // 5. Signature and Final Assembly
  const joinHmacMsg = makeNode(
    "join",
    { x: 1250, y: -100 },
    { label: "HMAC Message", count: 2, separator: "none", outputFormat: "hex" },
  );
  const hmacSign = makeNode(
    "hmac",
    { x: 1250, y: 100 },
    { action: "sign", hash: "SHA-256", label: "HMAC Sign", outputFormat: "hex" },
  );

  const joinFinal = makeNode(
    "join",
    { x: 1550, y: 0 },
    { label: "Final Package", count: 2, separator: "none", outputFormat: "hex" },
  );
  const output = makeNode(
    "output",
    { x: 1850, y: 0 },
    { label: "RNCryptor v3 Result", outputFormat: "hex" },
  );

  // 6. Validation Path (Disassemble & Decrypt)
  const sliceHeader = makeNode(
    "slice",
    { x: 1850, y: 250 },
    { label: "Header (34B)", start: 0, end: 34, outputFormat: "hex" },
  );
  const sliceCt = makeNode(
    "slice",
    { x: 1850, y: 350 },
    { label: "Ciphertext", start: 34, end: -32, outputFormat: "hex" },
  );
  const sliceHmac = makeNode(
    "slice",
    { x: 1850, y: 450 },
    { label: "HMAC (32B)", start: -32, outputFormat: "hex" },
  );

  const valEncSalt = makeNode(
    "slice",
    { x: 2150, y: 150 },
    { label: "Extracted Enc Salt", start: 2, end: 10, outputFormat: "hex" },
  );
  const valIv = makeNode(
    "slice",
    { x: 2150, y: 250 },
    { label: "Extracted IV", start: 18, end: 34, outputFormat: "hex" },
  );

  const kdfEncVal = makeNode(
    "pbkdf2",
    { x: 2450, y: 150 },
    { label: "Re-derive Enc Key", hash: "SHA-1", iterations: 10000, outputFormat: "hex" },
  );
  const aesDec = makeNode(
    "aes",
    { x: 2750, y: 200 },
    { action: "decrypt", label: "AES Decrypt (Verify)", outputFormat: "utf8" },
  );
  const outFinal = makeNode("output", { x: 3050, y: 200 }, { label: "Recovered Plaintext" });

  return {
    name: "RNCryptor v3 (Standard)",
    nodes: [
      input,
      password,
      encSalt,
      hmacSalt,
      iv,
      kdfEnc,
      kdfHmac,
      aesEnc,
      version,
      options,
      joinHeader,
      joinHmacMsg,
      hmacSign,
      joinFinal,
      output,
      sliceHeader,
      sliceCt,
      sliceHmac,
      valEncSalt,
      valIv,
      kdfEncVal,
      aesDec,
      outFinal,
    ],
    edges: [
      // Encryption Path
      { id: "r1", source: input.id, target: aesEnc.id, targetHandle: "data", animated: true },
      {
        id: "r2",
        source: password.id,
        target: kdfEnc.id,
        targetHandle: "password",
        animated: true,
      },
      { id: "r3", source: encSalt.id, target: kdfEnc.id, targetHandle: "salt", animated: true },
      { id: "r4", source: kdfEnc.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "r5", source: iv.id, target: aesEnc.id, targetHandle: "iv", animated: true },

      // HMAC Path
      {
        id: "r6",
        source: password.id,
        target: kdfHmac.id,
        targetHandle: "password",
        animated: true,
      },
      { id: "r7", source: hmacSalt.id, target: kdfHmac.id, targetHandle: "salt", animated: true },

      // Header Assembly
      { id: "r8", source: version.id, target: joinHeader.id, targetHandle: "in_1", animated: true },
      { id: "r9", source: options.id, target: joinHeader.id, targetHandle: "in_2", animated: true },
      {
        id: "r10",
        source: encSalt.id,
        target: joinHeader.id,
        targetHandle: "in_3",
        animated: true,
      },
      {
        id: "r11",
        source: hmacSalt.id,
        target: joinHeader.id,
        targetHandle: "in_4",
        animated: true,
      },
      { id: "r12", source: iv.id, target: joinHeader.id, targetHandle: "in_5", animated: true },

      // Signing
      {
        id: "r13",
        source: joinHeader.id,
        target: joinHmacMsg.id,
        targetHandle: "in_1",
        animated: true,
      },
      {
        id: "r14",
        source: aesEnc.id,
        target: joinHmacMsg.id,
        targetHandle: "in_2",
        animated: true,
      },
      { id: "r15", source: kdfHmac.id, target: hmacSign.id, targetHandle: "key", animated: true },
      {
        id: "r16",
        source: joinHmacMsg.id,
        target: hmacSign.id,
        targetHandle: "data",
        animated: true,
      },

      // Final Assembly
      {
        id: "r17",
        source: joinHmacMsg.id,
        target: joinFinal.id,
        targetHandle: "in_1",
        animated: true,
      },
      {
        id: "r18",
        source: hmacSign.id,
        target: joinFinal.id,
        targetHandle: "in_2",
        animated: true,
      },
      { id: "r19", source: joinFinal.id, target: output.id, animated: true },

      // Validation Path
      {
        id: "v1",
        source: joinFinal.id,
        target: sliceHeader.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "v2", source: joinFinal.id, target: sliceCt.id, targetHandle: "data", animated: true },
      {
        id: "v3",
        source: joinFinal.id,
        target: sliceHmac.id,
        targetHandle: "data",
        animated: true,
      },

      {
        id: "v4",
        source: sliceHeader.id,
        target: valEncSalt.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "v5", source: sliceHeader.id, target: valIv.id, targetHandle: "data", animated: true },

      {
        id: "v6",
        source: password.id,
        target: kdfEncVal.id,
        targetHandle: "password",
        animated: true,
      },
      {
        id: "v7",
        source: valEncSalt.id,
        target: kdfEncVal.id,
        targetHandle: "salt",
        animated: true,
      },

      { id: "v8", source: sliceCt.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "v9", source: kdfEncVal.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "v10", source: valIv.id, target: aesDec.id, targetHandle: "iv", animated: true },
      { id: "v11", source: aesDec.id, target: outFinal.id, animated: true },
    ],
  };
}
