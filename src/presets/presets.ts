import { makeNode } from "@/lib/crypto/factory";
import type { GraphNode, GraphEdge } from "@/lib/crypto/types";

export interface WorkflowSeed {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getAesGcmPreset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "12345678901234567890123456789012",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Shared Key (Hex)",
    },
  );
  const srcIv = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "12345678901234567890123456789012",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Initial IV (Hex)",
    },
  );

  const aesEnc = makeNode(
    "aes",
    { x: 400, y: 50 },
    { action: "encrypt", cipherMode: "GCM", label: "AES-GCM Encrypt" },
  );
  const aesDec = makeNode(
    "aes",
    { x: 750, y: 50 },
    { action: "decrypt", cipherMode: "GCM", label: "AES-GCM Decrypt" },
  );
  const out = makeNode("output", { x: 1100, y: 150 }, { label: "Decrypted" });

  return {
    name: "AES-GCM Encrypt/Decrypt",
    nodes: [srcData, srcKey, srcIv, aesEnc, aesDec, out],
    edges: [
      { id: "p1", source: srcData.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "p2", source: srcKey.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "p3", source: srcIv.id, target: aesEnc.id, targetHandle: "iv", animated: true },
      { id: "p4", source: aesEnc.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "p5", source: srcKey.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "p6", source: srcIv.id, target: aesDec.id, targetHandle: "iv", animated: true },
      { id: "p7", source: aesDec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getJwtPreset(): WorkflowSeed {
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
    name: "JWT Sign & Verify",
    nodes: [payload, secret, jwtSign, jwtVerify, out],
    edges: [
      { id: "p1", source: payload.id, target: jwtSign.id, targetHandle: "payload", animated: true },
      { id: "p2", source: secret.id, target: jwtSign.id, targetHandle: "key", animated: true },
      { id: "p3", source: jwtSign.id, target: jwtVerify.id, targetHandle: "token", animated: true },
      { id: "p4", source: secret.id, target: jwtVerify.id, targetHandle: "key", animated: true },
      { id: "p5", source: jwtVerify.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getHashSuitePreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Input Data" });
  const sha224 = makeNode("sha224", { x: 350, y: 30 }, { label: "SHA-224" });
  const sha256 = makeNode("sha256", { x: 350, y: 100 }, { label: "SHA-256" });
  const sha3224 = makeNode("sha3224", { x: 350, y: 170 }, { label: "SHA3-224" });
  const sha3256 = makeNode("sha3256", { x: 350, y: 240 }, { label: "SHA3-256" });
  const blake3 = makeNode("blake3", { x: 350, y: 310 }, { label: "BLAKE3" });
  const sm3 = makeNode("sm3", { x: 350, y: 380 }, { label: "SM3" });
  const out1 = makeNode("output", { x: 650, y: 30 }, { label: "SHA-224", outputFormat: "hex" });
  const out2 = makeNode("output", { x: 650, y: 100 }, { label: "SHA-256", outputFormat: "hex" });
  const out3 = makeNode("output", { x: 650, y: 170 }, { label: "SHA3-224", outputFormat: "hex" });
  const out4 = makeNode("output", { x: 650, y: 240 }, { label: "SHA3-256", outputFormat: "hex" });
  const out5 = makeNode("output", { x: 650, y: 310 }, { label: "BLAKE3", outputFormat: "hex" });
  const out6 = makeNode("output", { x: 650, y: 380 }, { label: "SM3", outputFormat: "hex" });

  return {
    name: "Hash Suite (SHA-224 / SHA-256 / SHA3-224 / SHA3-256 / BLAKE3 / SM3)",
    nodes: [
      input,
      sha224,
      sha256,
      sha3224,
      sha3256,
      blake3,
      sm3,
      out1,
      out2,
      out3,
      out4,
      out5,
      out6,
    ],
    edges: [
      { id: "h1", source: input.id, target: sha256.id, targetHandle: "data", animated: true },
      { id: "h2", source: input.id, target: sha3256.id, targetHandle: "data", animated: true },
      { id: "h3", source: input.id, target: blake3.id, targetHandle: "data", animated: true },
      { id: "h4", source: input.id, target: sm3.id, targetHandle: "data", animated: true },
      { id: "h5", source: input.id, target: sha224.id, targetHandle: "data", animated: true },
      { id: "h6", source: input.id, target: sha3224.id, targetHandle: "data", animated: true },
      { id: "h7", source: sha224.id, target: out1.id, targetHandle: "data", animated: true },
      { id: "h8", source: sha256.id, target: out2.id, targetHandle: "data", animated: true },
      { id: "h9", source: sha3224.id, target: out3.id, targetHandle: "data", animated: true },
      { id: "h10", source: sha3256.id, target: out4.id, targetHandle: "data", animated: true },
      { id: "h11", source: blake3.id, target: out5.id, targetHandle: "data", animated: true },
      { id: "h12", source: sm3.id, target: out6.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getEcdsaPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Message" });
  const keyGen = makeNode(
    "ec_keygen",
    { x: 50, y: 50 },
    { algorithm: "ECDSA", namedCurve: "P-256", label: "EC Key Pair" },
  );
  const sign = makeNode(
    "ecdsa_sign",
    { x: 450, y: 50 },
    { namedCurve: "P-256", hash: "SHA-256", label: "ECDSA Sign" },
  );
  const verify = makeNode(
    "ecdsa_verify",
    { x: 850, y: 50 },
    { namedCurve: "P-256", hash: "SHA-256", label: "ECDSA Verify" },
  );
  const out = makeNode("output", { x: 1250, y: 150 }, { label: "Result" });

  return {
    name: "ECDSA Sign & Verify",
    nodes: [input, keyGen, sign, verify, out],
    edges: [
      { id: "e1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "e2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "e3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "e4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      {
        id: "e5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "e6", source: verify.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getHmacPreset(): WorkflowSeed {
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
  const out = makeNode("output", { x: 1100, y: 50 }, { label: "Result" });

  return {
    name: "HMAC Sign & Verify",
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
      { id: "h6", source: hmacVerify.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getKdfAesPreset(): WorkflowSeed {
  const password = makeNode("input", { x: 50, y: 50 }, { text: "my-password", label: "Password" });
  const salt = makeNode("input", { x: 50, y: 200 }, { text: "random-salt", label: "Salt" });
  const data = makeNode(
    "input",
    { x: 350, y: 350 },
    { text: "secret data", label: "Data to Encrypt" },
  );
  const pbkdf2 = makeNode("pbkdf2", { x: 350, y: 50 }, { iterations: 100000, label: "PBKDF2" });
  const aesEnc = makeNode(
    "aes",
    { x: 700, y: 50 },
    { action: "encrypt", cipherMode: "CBC", label: "AES Encrypt" },
  );
  const aesDec = makeNode(
    "aes",
    { x: 1000, y: 50 },
    { action: "decrypt", cipherMode: "CBC", label: "AES Decrypt" },
  );
  const out = makeNode("output", { x: 1300, y: 150 }, { label: "Decrypted" });

  return {
    name: "KDF (PBKDF2) + AES Encrypt/Decrypt",
    nodes: [password, salt, data, pbkdf2, aesEnc, aesDec, out],
    edges: [
      {
        id: "k1",
        source: password.id,
        target: pbkdf2.id,
        targetHandle: "password",
        animated: true,
      },
      { id: "k2", source: salt.id, target: pbkdf2.id, targetHandle: "salt", animated: true },
      { id: "k3", source: pbkdf2.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "k4", source: pbkdf2.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "k5", source: data.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "k6", source: aesEnc.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "k7", source: aesDec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getAesCbcPreset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "12345678901234567890123456789012",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Shared Key (Hex)",
    },
  );
  const srcIv = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "12345678901234567890123456789012",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Initial IV (Hex)",
    },
  );
  const aesEnc = makeNode(
    "aes",
    { x: 400, y: 50 },
    { action: "encrypt", cipherMode: "CBC", padding: "PKCS7", label: "AES-CBC Encrypt" },
  );
  const aesDec = makeNode(
    "aes",
    { x: 750, y: 50 },
    { action: "decrypt", cipherMode: "CBC", padding: "PKCS7", label: "AES-CBC Decrypt" },
  );
  const out = makeNode("output", { x: 1100, y: 150 }, { label: "Decrypted" });

  return {
    name: "AES-CBC Encrypt/Decrypt",
    nodes: [srcData, srcKey, srcIv, aesEnc, aesDec, out],
    edges: [
      { id: "p1", source: srcData.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "p2", source: srcKey.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "p3", source: srcIv.id, target: aesEnc.id, targetHandle: "iv", animated: true },
      { id: "p4", source: aesEnc.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "p5", source: srcKey.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "p6", source: srcIv.id, target: aesDec.id, targetHandle: "iv", animated: true },
      { id: "p7", source: aesDec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getEd25519Preset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Message" });
  const keyGen = makeNode("ed_keygen", { x: 50, y: 50 }, { label: "Ed25519 Key Pair" });
  const sign = makeNode("ed_sign", { x: 450, y: 50 }, { label: "Ed25519 Sign" });
  const verify = makeNode("ed_verify", { x: 850, y: 50 }, { label: "Ed25519 Verify" });
  const out = makeNode("output", { x: 1250, y: 150 }, { label: "Result" });

  return {
    name: "Ed25519 Sign & Verify",
    nodes: [input, keyGen, sign, verify, out],
    edges: [
      { id: "e1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "e2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "e3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "e4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      {
        id: "e5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "e6", source: verify.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getChaCha20Preset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (Hex)",
    },
  );
  const srcNonce = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "0123456789abcdef01234567",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Nonce (Hex)",
    },
  );
  const enc = makeNode(
    "chacha20poly1305",
    { x: 400, y: 50 },
    { action: "encrypt", label: "ChaCha20 Encrypt" },
  );
  const dec = makeNode(
    "chacha20poly1305",
    { x: 750, y: 50 },
    { action: "decrypt", label: "ChaCha20 Decrypt" },
  );
  const out = makeNode("output", { x: 1100, y: 150 }, { label: "Decrypted" });

  return {
    name: "ChaCha20-Poly1305 Encrypt/Decrypt",
    nodes: [srcData, srcKey, srcNonce, enc, dec, out],
    edges: [
      { id: "c1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "c2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "c3", source: srcNonce.id, target: enc.id, targetHandle: "iv", animated: true },
      { id: "c4", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "c5", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "c6", source: srcNonce.id, target: dec.id, targetHandle: "iv", animated: true },
      { id: "c7", source: dec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getArgon2Preset(): WorkflowSeed {
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
  const out = makeNode("output", { x: 750, y: 100 }, { label: "Derived Key", outputFormat: "hex" });

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
      { id: "a3", source: argon2.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getTOTPPreset(): WorkflowSeed {
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
    name: "TOTP Authenticator",
    nodes: [secret, b32Decode, totp, out],
    edges: [
      { id: "t1", source: secret.id, target: b32Decode.id, targetHandle: "data", animated: true },
      { id: "t2", source: b32Decode.id, target: totp.id, targetHandle: "secret", animated: true },
      { id: "t3", source: totp.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getMlKemPreset(): WorkflowSeed {
  const aliceKeyGen = makeNode(
    "ml_kem_keygen",
    { x: 50, y: 50 },
    { parameterSet: "ML-KEM-768", label: "Alice Key Gen" },
  );
  const bobEncaps = makeNode(
    "ml_kem_encaps",
    { x: 400, y: 50 },
    { parameterSet: "ML-KEM-768", label: "Bob Encaps" },
  );
  const aliceDecaps = makeNode(
    "ml_kem_decaps",
    { x: 750, y: 50 },
    { parameterSet: "ML-KEM-768", label: "Alice Decaps" },
  );
  const sigOut = makeNode(
    "output",
    { x: 1100, y: 10 },
    { label: "Ciphertext", outputFormat: "hex" },
  );
  const ssA = makeNode(
    "output",
    { x: 1100, y: 150 },
    { label: "Alice Shared Secret", outputFormat: "hex" },
  );
  const ssB = makeNode(
    "output",
    { x: 1100, y: 290 },
    { label: "Bob Shared Secret", outputFormat: "hex" },
  );
  const hexPub = makeNode(
    "hex",
    { x: 170, y: 180 },
    { mode: "encode", label: "Pub Key (hex)", outputFormat: "utf8" },
  );
  const pubOut = makeNode(
    "output",
    { x: 170, y: 280 },
    { label: "Public Key", outputFormat: "hex" },
  );

  return {
    name: "ML-KEM Encapsulation",
    nodes: [aliceKeyGen, bobEncaps, aliceDecaps, sigOut, ssA, ssB, hexPub, pubOut],
    edges: [
      {
        id: "k1",
        source: aliceKeyGen.id,
        target: bobEncaps.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "k2",
        source: aliceKeyGen.id,
        target: aliceDecaps.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "k3",
        source: bobEncaps.id,
        target: aliceDecaps.id,
        sourceHandle: "ciphertext",
        targetHandle: "ciphertext",
        animated: true,
      },
      {
        id: "k4",
        source: bobEncaps.id,
        target: sigOut.id,
        sourceHandle: "ciphertext",
        targetHandle: "data",
        animated: true,
      },
      { id: "k5", source: aliceDecaps.id, target: ssA.id, targetHandle: "data", animated: true },
      {
        id: "k6",
        source: bobEncaps.id,
        target: ssB.id,
        sourceHandle: "sharedSecret",
        targetHandle: "data",
        animated: true,
      },
      {
        id: "k7",
        source: aliceKeyGen.id,
        target: hexPub.id,
        sourceHandle: "publicKey",
        animated: true,
      },
      { id: "k8", source: hexPub.id, target: pubOut.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getMlDsaPreset(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 200 },
    { text: "hello world - post-quantum signing", label: "Message" },
  );
  const keyGen = makeNode(
    "ml_dsa_keygen",
    { x: 50, y: 50 },
    { parameterSet: "ML-DSA-65", label: "ML-DSA Key Gen" },
  );
  const sign = makeNode(
    "ml_dsa_sign",
    { x: 450, y: 50 },
    { parameterSet: "ML-DSA-65", label: "ML-DSA Sign" },
  );
  const verify = makeNode(
    "ml_dsa_verify",
    { x: 850, y: 50 },
    { parameterSet: "ML-DSA-65", label: "ML-DSA Verify" },
  );
  const sigOut = makeNode(
    "output",
    { x: 1200, y: 10 },
    { label: "Signature", outputFormat: "base64" },
  );
  const result = makeNode("output", { x: 1200, y: 150 }, { label: "Verify Result" });

  return {
    name: "ML-DSA Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "d1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "d2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "d3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "d4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      {
        id: "d5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "d6", source: sign.id, target: sigOut.id, targetHandle: "data", animated: true },
      { id: "d7", source: verify.id, target: result.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getSlhDsaPreset(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 200 },
    { text: "hello world - hash-based signing", label: "Message" },
  );
  const keyGen = makeNode(
    "slh_dsa_keygen",
    { x: 50, y: 50 },
    { parameterSet: "SLH-DSA-SHAKE-128f", label: "SLH-DSA Key Gen" },
  );
  const sign = makeNode(
    "slh_dsa_sign",
    { x: 450, y: 50 },
    { parameterSet: "SLH-DSA-SHAKE-128f", label: "SLH-DSA Sign" },
  );
  const verify = makeNode(
    "slh_dsa_verify",
    { x: 850, y: 50 },
    { parameterSet: "SLH-DSA-SHAKE-128f", label: "SLH-DSA Verify" },
  );
  const sigOut = makeNode(
    "output",
    { x: 1200, y: 10 },
    { label: "Signature", outputFormat: "base64" },
  );
  const result = makeNode("output", { x: 1200, y: 150 }, { label: "Verify Result" });

  return {
    name: "SLH-DSA Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "h1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "h2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "h3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "h4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      {
        id: "h5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "h6", source: sign.id, target: sigOut.id, targetHandle: "data", animated: true },
      { id: "h7", source: verify.id, target: result.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getSecp256k1Preset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Message" });
  const keyGen = makeNode("secp256k1_keygen", { x: 50, y: 50 }, { label: "Key Gen" });
  const sign = makeNode(
    "secp256k1_sign",
    { x: 400, y: 50 },
    { hashFirst: "true", label: "Sign (ECDSA)" },
  );
  const verify = makeNode(
    "secp256k1_verify",
    { x: 750, y: 50 },
    { hashFirst: "true", label: "Verify" },
  );
  const sigOut = makeNode(
    "output",
    { x: 1100, y: 10 },
    { label: "Signature", outputFormat: "base64" },
  );
  const result = makeNode("output", { x: 1100, y: 150 }, { label: "Verify Result" });

  return {
    name: "secp256k1 Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "s1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "s2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "s3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "s4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      {
        id: "s5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "s6", source: sign.id, target: sigOut.id, targetHandle: "data", animated: true },
      { id: "s7", source: verify.id, target: result.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getSecp256k1EcdhPreset(): WorkflowSeed {
  const aliceKey = makeNode("secp256k1_keygen", { x: 50, y: 50 }, { label: "Alice Key Gen" });
  const bobKey = makeNode("secp256k1_keygen", { x: 50, y: 250 }, { label: "Bob Key Gen" });
  const aliceDerive = makeNode("ecdh_secp256k1", { x: 400, y: 50 }, { label: "Alice ECDH" });
  const bobDerive = makeNode("ecdh_secp256k1", { x: 400, y: 250 }, { label: "Bob ECDH" });
  const sharedA = makeNode(
    "output",
    { x: 750, y: 50 },
    { label: "Alice Shared", outputFormat: "hex" },
  );
  const sharedB = makeNode(
    "output",
    { x: 750, y: 250 },
    { label: "Bob Shared", outputFormat: "hex" },
  );

  return {
    name: "secp256k1 ECDH Key Exchange",
    nodes: [aliceKey, bobKey, aliceDerive, bobDerive, sharedA, sharedB],
    edges: [
      {
        id: "e1",
        source: aliceKey.id,
        target: aliceDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "e2",
        source: bobKey.id,
        target: bobDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "e3",
        source: aliceKey.id,
        target: bobDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "e4",
        source: bobKey.id,
        target: aliceDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "e5",
        source: aliceDerive.id,
        target: sharedA.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "e6", source: bobDerive.id, target: sharedB.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getEd448Preset(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 200 },
    { text: "hello world - Ed448 signing", label: "Message" },
  );
  const keyGen = makeNode("ed448_keygen", { x: 50, y: 50 }, { label: "Key Gen" });
  const sign = makeNode("ed448_sign", { x: 400, y: 50 }, { label: "Sign" });
  const verify = makeNode("ed448_verify", { x: 750, y: 50 }, { label: "Verify" });
  const sigOut = makeNode(
    "output",
    { x: 1100, y: 10 },
    { label: "Signature", outputFormat: "base64" },
  );
  const result = makeNode("output", { x: 1100, y: 150 }, { label: "Verify Result" });

  return {
    name: "Ed448 Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "e1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "e2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "e3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "e4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      {
        id: "e5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "e6", source: sign.id, target: sigOut.id, targetHandle: "data", animated: true },
      { id: "e7", source: verify.id, target: result.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getX448Preset(): WorkflowSeed {
  const aliceKey = makeNode(
    "x448_keygen",
    { x: 50, y: 50 },
    { label: "Alice X448 Key Gen", outputFormat: "hex" },
  );
  const bobKey = makeNode(
    "x448_keygen",
    { x: 50, y: 250 },
    { label: "Bob X448 Key Gen", outputFormat: "hex" },
  );
  const aliceX = makeNode("x448_derive", { x: 400, y: 50 }, { label: "Alice X448" });
  const bobX = makeNode("x448_derive", { x: 400, y: 250 }, { label: "Bob X448" });
  const sharedA = makeNode(
    "output",
    { x: 750, y: 50 },
    { label: "Alice Shared", outputFormat: "hex" },
  );
  const sharedB = makeNode(
    "output",
    { x: 750, y: 250 },
    { label: "Bob Shared", outputFormat: "hex" },
  );

  return {
    name: "X448 Key Exchange",
    nodes: [aliceKey, bobKey, aliceX, bobX, sharedA, sharedB],
    edges: [
      {
        id: "x1",
        source: aliceKey.id,
        target: aliceX.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "x2",
        source: bobKey.id,
        target: bobX.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "x3",
        source: aliceKey.id,
        target: bobX.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "x4",
        source: bobKey.id,
        target: aliceX.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "x5", source: aliceX.id, target: sharedA.id, targetHandle: "data", animated: true },
      { id: "x6", source: bobX.id, target: sharedB.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getBlsPreset(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 200 },
    { text: "hello world - BLS aggregate signing", label: "Message" },
  );
  const keyGen = makeNode("bls_keygen", { x: 50, y: 50 }, { label: "Key Gen" });
  const sign = makeNode("bls_sign", { x: 400, y: 50 }, { label: "Sign" });
  const verify = makeNode("bls_verify", { x: 750, y: 50 }, { label: "Verify" });
  const sigOut = makeNode(
    "output",
    { x: 1100, y: 10 },
    { label: "Signature", outputFormat: "base64" },
  );
  const result = makeNode("output", { x: 1100, y: 150 }, { label: "Verify Result" });

  return {
    name: "BLS12-381 Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "b1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      {
        id: "b2",
        source: keyGen.id,
        target: sign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "b3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "b4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      {
        id: "b5",
        source: keyGen.id,
        target: verify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "b6", source: sign.id, target: sigOut.id, targetHandle: "data", animated: true },
      { id: "b7", source: verify.id, target: result.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getDhPreset(): WorkflowSeed {
  const aliceKey = makeNode(
    "dh_keygen",
    { x: 50, y: 50 },
    { group: "MODP-2048", label: "Alice DH Key" },
  );
  const bobKey = makeNode(
    "dh_keygen",
    { x: 50, y: 250 },
    { group: "MODP-2048", label: "Bob DH Key" },
  );
  const aliceDerive = makeNode(
    "dh_derive",
    { x: 400, y: 50 },
    { group: "MODP-2048", label: "Alice Derive" },
  );
  const bobDerive = makeNode(
    "dh_derive",
    { x: 400, y: 250 },
    { group: "MODP-2048", label: "Bob Derive" },
  );
  const sharedA = makeNode(
    "output",
    { x: 750, y: 50 },
    { label: "Alice Shared", outputFormat: "hex" },
  );
  const sharedB = makeNode(
    "output",
    { x: 750, y: 250 },
    { label: "Bob Shared", outputFormat: "hex" },
  );

  return {
    name: "Diffie-Hellman Key Exchange",
    nodes: [aliceKey, bobKey, aliceDerive, bobDerive, sharedA, sharedB],
    edges: [
      {
        id: "d1",
        source: aliceKey.id,
        target: aliceDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "d2",
        source: bobKey.id,
        target: bobDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "d3",
        source: aliceKey.id,
        target: bobDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "d4",
        source: bobKey.id,
        target: aliceDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      {
        id: "d5",
        source: aliceDerive.id,
        target: sharedA.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "d6", source: bobDerive.id, target: sharedB.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getFreqAnalysisPreset(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 100 },
    {
      text: "The quick brown fox jumps over the lazy dog. The quick brown fox jumps. The quick fox. Fox fox fox.",
      label: "Sample Text",
    },
  );
  const freq = makeNode(
    "frequencyAnalysis",
    { x: 400, y: 100 },
    { topN: 10, label: "Frequency Analysis" },
  );
  const entropy = makeNode("entropyCalc", { x: 400, y: 300 }, { label: "Entropy" });
  const out1 = makeNode("output", { x: 750, y: 100 }, { label: "Frequencies" });
  const out2 = makeNode("output", { x: 750, y: 300 }, { label: "Entropy" });

  return {
    name: "Frequency Analysis",
    nodes: [input, freq, entropy, out1, out2],
    edges: [
      { id: "f1", source: input.id, target: freq.id, targetHandle: "data", animated: true },
      { id: "f2", source: input.id, target: entropy.id, targetHandle: "data", animated: true },
      { id: "f3", source: freq.id, target: out1.id, targetHandle: "data", animated: true },
      { id: "f4", source: entropy.id, target: out2.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getEcbDetectPreset(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 60 },
    {
      text: "Top Secret Data!Top Secret Data!Top Secret Data!Padding for last block.",
      label: 'Plaintext (3× repeating "Top Secret Data!")',
    },
  );
  const key = makeNode(
    "input",
    { x: 50, y: 260 },
    {
      text: "00112233445566778899aabbccddeeff",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "AES-128 Key",
    },
  );
  const ecbEnc = makeNode(
    "aes",
    { x: 350, y: 60 },
    { action: "encrypt", cipherMode: "ECB", label: "AES-ECB Encrypt" },
  );
  const ecbDetect = makeNode(
    "ecbDetect",
    { x: 700, y: 60 },
    { blockSize: 16, label: "ECB Detect" },
  );
  const ecbResult = makeNode("output", { x: 1000, y: 60 }, { label: "Detection Result" });
  const ecbCipherOut = makeNode(
    "output",
    { x: 1000, y: 260 },
    { label: "Ciphertext (hex)", outputFormat: "hex" },
  );
  const ecbDec = makeNode(
    "aes",
    { x: 700, y: 460 },
    { action: "decrypt", cipherMode: "ECB", label: "AES-ECB Decrypt" },
  );
  const decOut = makeNode(
    "output",
    { x: 1000, y: 460 },
    { label: "Decrypted (verify)", outputFormat: "utf8" },
  );

  return {
    name: "ECB Block Detection",
    nodes: [input, key, ecbEnc, ecbDetect, ecbResult, ecbCipherOut, ecbDec, decOut],
    edges: [
      { id: "e1", source: input.id, target: ecbEnc.id, targetHandle: "data", animated: true },
      { id: "e2", source: key.id, target: ecbEnc.id, targetHandle: "key", animated: true },
      { id: "e3", source: ecbEnc.id, target: ecbDetect.id, targetHandle: "data", animated: true },
      {
        id: "e4",
        source: ecbDetect.id,
        target: ecbResult.id,
        targetHandle: "data",
        animated: true,
      },
      {
        id: "e5",
        source: ecbEnc.id,
        target: ecbCipherOut.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "e6", source: key.id, target: ecbDec.id, targetHandle: "key", animated: true },
      { id: "e7", source: ecbEnc.id, target: ecbDec.id, targetHandle: "data", animated: true },
      { id: "e8", source: ecbDec.id, target: decOut.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getShamirPreset(): WorkflowSeed {
  const secret = makeNode(
    "input",
    { x: 50, y: 100 },
    { text: "my-super-secret-password-123", label: "Original Secret" },
  );
  const split = makeNode(
    "shamirSplit",
    { x: 400, y: 100 },
    { totalShares: 5, threshold: 3, label: "Shamir Split (3/5)" },
  );
  const join = makeNode(
    "shamirJoin",
    { x: 750, y: 100 },
    { threshold: 3, label: "Shamir Join (3 shares)" },
  );
  const out = makeNode("output", { x: 1050, y: 100 }, { label: "Recovered Secret" });
  const sharesOut = makeNode("output", { x: 1050, y: 300 }, { label: "Shares (JSON)" });

  return {
    name: "Shamir Split & Join",
    nodes: [secret, split, join, out, sharesOut],
    edges: [
      { id: "sh1", source: secret.id, target: split.id, targetHandle: "secret", animated: true },
      {
        id: "sh2",
        source: split.id,
        target: join.id,
        sourceHandle: "shares",
        targetHandle: "shares",
        animated: true,
      },
      { id: "sh3", source: join.id, target: out.id, targetHandle: "data", animated: true },
      {
        id: "sh4",
        source: split.id,
        target: sharesOut.id,
        sourceHandle: "shares",
        targetHandle: "data",
        animated: true,
      },
    ],
  };
}

export function getX509Preset(): WorkflowSeed {
  const pemInput = makeNode(
    "input",
    { x: 50, y: 100 },
    {
      text: `-----BEGIN CERTIFICATE-----
MIIBrDCCARWgAwIBAgIBATANBgkqhkiG9w0BAQUFADAcMRowGAYDVQQDExFGbG93
Rm9yZ2UgRGVtbyBDQTAeFw0yNjA1MzAxMTQ5MjBaFw0zNjA1MzAxMTQ5MjBaMBwx
GjAYBgNVBAMTEUZsb3dGb3JnZSBEZW1vIENBMIGfMA0GCSqGSIb3DQEBAQUAA4GN
ADCBiQKBgQCyzxukxI5PMI65k84XfkPnt/rk8uNX9I9sBcG8tY3c9aWQ2hNI94Op
sffW2dFPbSjfPnC7XJ6VTSezbXp5UwZaB3RbBemu5XohqKFuGWbVWE5cIwi6llHl
0v56rCYYz6NzdxSRxWO037KGFR3Nv38QEtIg5mWoQQQO/4SraCK5nwIDAQABMA0G
CSqGSIb3DQEBBQUAA4GBAD6FXK/K6Hr6jXaEdBb2Fu8YkiwS5KjVVTTisA7fPnbq
9KJylmwROCc3aCoO4fP/Tvs1/dFdhKdSb/wyYUK+TYeowzEhh6oV1X84VC85l+Ll
H2izKz/oiSZcnJIFWwx0lNSNbN8WunR/L+AjUIEmzoGLn3RDXzT6OxbnKgZvJ9wW
-----END CERTIFICATE-----`,
      label: "PEM Certificate",
    },
  );
  const parse = makeNode("x509Parse", { x: 400, y: 100 }, { label: "Parse X.509" });
  const out = makeNode("output", { x: 750, y: 100 }, { label: "Certificate Details" });

  return {
    name: "X.509 Certificate Parse",
    nodes: [pemInput, parse, out],
    edges: [
      { id: "x1", source: pemInput.id, target: parse.id, targetHandle: "pem", animated: true },
      { id: "x2", source: parse.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getJwkPreset(): WorkflowSeed {
  const pemInput = makeNode(
    "input",
    { x: 50, y: 100 },
    {
      text: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8ONDmjN9tHDI919mwWkA
XCj9Sxrbiq3xJSimx+NXsziuk52T2ClBDimf+/xNYhzqZDWUjX9ix3Aw0ILjPgfm
PimWON1qbDCxa7pjIpmNDDgGF0Ol9lFKA7gUgaGosMLpSQL3ZnZPsmS9hgaXaY3V
7Y+LCIvpCvEFnHMEY3K5qVkr1LhrnYFp5Me4XkSX+aNp4f/2mnplG91iTnH2N7vH
NVuU/HPhfylcawBHSkj4+As81uN0uaiBi9/VDStuPQFLC7uQuLOMuJpxYC0TFLmY
T3N5zevrDMMSW8LOnuM/HrQT9zC5luoi6IoDOLLKLEQTHFXQ1RMTHacbMjOsLM6p
twIDAQAB
-----END PUBLIC KEY-----`,
      label: "RSA Public Key (PEM)",
    },
  );
  const convert = makeNode(
    "jwkConvert",
    { x: 400, y: 100 },
    { direction: "pemToJwk", label: "PEM → JWK" },
  );
  const out = makeNode("output", { x: 750, y: 100 }, { label: "JWK Output" });

  return {
    name: "PEM to JWK Conversion",
    nodes: [pemInput, convert, out],
    edges: [
      {
        id: "j1",
        source: pemInput.id,
        target: convert.id,
        targetHandle: "keyData",
        animated: true,
      },
      { id: "j2", source: convert.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getTwofishPreset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "00112233445566778899aabbccddeeff",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (Hex)",
    },
  );
  const srcIv = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "1234567890abcdef1234567890abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "IV (Hex)",
    },
  );
  const enc = makeNode(
    "twofish",
    { x: 400, y: 50 },
    { action: "encrypt", cipherMode: "CBC", label: "Twofish Encrypt" },
  );
  const dec = makeNode(
    "twofish",
    { x: 750, y: 50 },
    { action: "decrypt", cipherMode: "CBC", label: "Twofish Decrypt" },
  );
  const out = makeNode("output", { x: 1100, y: 150 }, { label: "Decrypted" });

  return {
    name: "Twofish-CBC Encrypt/Decrypt",
    nodes: [srcData, srcKey, srcIv, enc, dec, out],
    edges: [
      { id: "t1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "t2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "t3", source: srcIv.id, target: enc.id, targetHandle: "iv", animated: true },
      { id: "t4", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "t5", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "t6", source: srcIv.id, target: dec.id, targetHandle: "iv", animated: true },
      { id: "t7", source: dec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getBlowfishPreset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "00112233445566778899aabbccddeeff",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (Hex)",
    },
  );
  const srcIv = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "1234567890abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "IV (Hex)",
    },
  );
  const enc = makeNode(
    "blowfish",
    { x: 400, y: 50 },
    { action: "encrypt", mode: "CBC", label: "Blowfish Encrypt" },
  );
  const dec = makeNode(
    "blowfish",
    { x: 750, y: 50 },
    { action: "decrypt", mode: "CBC", label: "Blowfish Decrypt" },
  );
  const out = makeNode("output", { x: 1100, y: 150 }, { label: "Decrypted" });

  return {
    name: "Blowfish-CBC Encrypt/Decrypt",
    nodes: [srcData, srcKey, srcIv, enc, dec, out],
    edges: [
      { id: "b1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "b2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "b3", source: srcIv.id, target: enc.id, targetHandle: "iv", animated: true },
      { id: "b4", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "b5", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "b6", source: srcIv.id, target: dec.id, targetHandle: "iv", animated: true },
      { id: "b7", source: dec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getRc4Preset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "00112233445566778899aabbccddeeff",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (Hex)",
    },
  );
  const enc = makeNode("rc4", { x: 400, y: 50 }, { action: "encrypt", label: "RC4 Encrypt" });
  const dec = makeNode("rc4", { x: 700, y: 50 }, { action: "decrypt", label: "RC4 Decrypt" });
  const out = makeNode("output", { x: 1000, y: 150 }, { label: "Decrypted" });

  return {
    name: "RC4 Stream Cipher",
    nodes: [srcData, srcKey, enc, dec, out],
    edges: [
      { id: "r1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "r2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "r3", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "r4", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "r5", source: dec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getRabbitPreset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "00112233445566778899aabbccddeeff",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (Hex)",
    },
  );
  const srcIv = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "1234567890abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "IV (Hex)",
    },
  );
  const enc = makeNode("rabbit", { x: 400, y: 50 }, { action: "encrypt", label: "Rabbit Encrypt" });
  const dec = makeNode("rabbit", { x: 750, y: 50 }, { action: "decrypt", label: "Rabbit Decrypt" });
  const out = makeNode("output", { x: 1100, y: 150 }, { label: "Decrypted" });

  return {
    name: "Rabbit Stream Cipher",
    nodes: [srcData, srcKey, srcIv, enc, dec, out],
    edges: [
      { id: "r1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "r2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "r3", source: srcIv.id, target: enc.id, targetHandle: "iv", animated: true },
      { id: "r4", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "r5", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "r6", source: srcIv.id, target: dec.id, targetHandle: "iv", animated: true },
      { id: "r7", source: dec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getXSalsa20Preset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (Hex)",
    },
  );
  const srcNonce = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "0123456789abcdef0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Nonce (Hex)",
    },
  );
  const enc = makeNode(
    "xsalsa20poly1305",
    { x: 400, y: 50 },
    { action: "encrypt", label: "XSalsa20 Encrypt" },
  );
  const dec = makeNode(
    "xsalsa20poly1305",
    { x: 750, y: 50 },
    { action: "decrypt", label: "XSalsa20 Decrypt" },
  );
  const out = makeNode("output", { x: 1100, y: 150 }, { label: "Decrypted" });

  return {
    name: "XSalsa20-Poly1305 Encrypt/Decrypt",
    nodes: [srcData, srcKey, srcNonce, enc, dec, out],
    edges: [
      { id: "x1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "x2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "x3", source: srcNonce.id, target: enc.id, targetHandle: "iv", animated: true },
      { id: "x4", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "x5", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "x6", source: srcNonce.id, target: dec.id, targetHandle: "iv", animated: true },
      { id: "x7", source: dec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getSalsa20Preset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode(
    "input",
    { x: 50, y: 200 },
    {
      text: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Key (Hex)",
    },
  );
  const srcNonce = makeNode(
    "input",
    { x: 50, y: 350 },
    {
      text: "0123456789abcdef",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Nonce (Hex)",
    },
  );
  const enc = makeNode("salsa20", { x: 400, y: 50 }, { label: "Salsa20 Encrypt" });
  const dec = makeNode("salsa20", { x: 750, y: 50 }, { label: "Salsa20 Decrypt" });
  const out = makeNode(
    "output",
    { x: 1100, y: 150 },
    { label: "Decrypted Output", outputFormat: "utf8" },
  );

  return {
    name: "Salsa20 Stream Cipher",
    nodes: [srcData, srcKey, srcNonce, enc, dec, out],
    edges: [
      { id: "s1", source: srcData.id, target: enc.id, targetHandle: "data", animated: true },
      { id: "s2", source: srcKey.id, target: enc.id, targetHandle: "key", animated: true },
      { id: "s3", source: srcNonce.id, target: enc.id, targetHandle: "iv", animated: true },
      { id: "s4", source: enc.id, target: dec.id, targetHandle: "data", animated: true },
      { id: "s5", source: srcKey.id, target: dec.id, targetHandle: "key", animated: true },
      { id: "s6", source: srcNonce.id, target: dec.id, targetHandle: "iv", animated: true },
      { id: "s7", source: dec.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getMerklePreset(): WorkflowSeed {
  const input = makeNode(
    "input",
    { x: 50, y: 100 },
    {
      text: "leaf1\nleaf2\nleaf3\nleaf4",
      label: "Leaves (one per line)",
    },
  );
  const tree = makeNode(
    "merkleTree",
    { x: 400, y: 100 },
    { hash: "SHA-256", label: "Merkle Tree" },
  );
  const rootOut = makeNode(
    "output",
    { x: 750, y: 50 },
    { label: "Root Hash", outputFormat: "hex" },
  );
  const treeOut = makeNode("output", { x: 750, y: 200 }, { label: "Full Tree" });

  return {
    name: "Merkle Tree",
    nodes: [input, tree, rootOut, treeOut],
    edges: [
      { id: "m1", source: input.id, target: tree.id, targetHandle: "data", animated: true },
      {
        id: "m2",
        source: tree.id,
        target: rootOut.id,
        sourceHandle: "root",
        targetHandle: "data",
        animated: true,
      },
      {
        id: "m3",
        source: tree.id,
        target: treeOut.id,
        sourceHandle: "tree",
        targetHandle: "data",
        animated: true,
      },
    ],
  };
}

export function getSshKeyPreset(): WorkflowSeed {
  const sshInput = makeNode(
    "input",
    { x: 50, y: 100 },
    {
      text: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGUAlR+H9yFoXODkzO4ClBjRnCwRBOAcL/uxOavdABq8 user@example.com",
      label: "SSH Public Key",
    },
  );
  const parse = makeNode("sshKeyParse", { x: 400, y: 100 }, { label: "Parse SSH Key" });
  const out = makeNode("output", { x: 750, y: 100 }, { label: "Key Details" });

  return {
    name: "SSH Key Parse",
    nodes: [sshInput, parse, out],
    edges: [
      { id: "p1", source: sshInput.id, target: parse.id, targetHandle: "keyData", animated: true },
      { id: "p2", source: parse.id, target: out.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getHybridEncryptionPreset(): WorkflowSeed {
  const inputData = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: "Highly sensitive corporate data.", label: "Plaintext Data" },
  );
  const aesKeyGen = makeNode(
    "random",
    { x: 50, y: 200 },
    { length: 32, label: "Generate AES Key (256-bit)" },
  );
  const aesIvGen = makeNode(
    "random",
    { x: 50, y: 350 },
    { length: 16, label: "Generate AES IV (128-bit)" },
  );

  const aesEnc = makeNode(
    "aes",
    { x: 400, y: 50 },
    { action: "encrypt", cipherMode: "CBC", label: "AES Encrypt Data" },
  );

  const bobRsaKey = makeNode(
    "rsa_keygen",
    { x: 50, y: 550 },
    { algorithm: "RSA-OAEP", label: "Bob's RSA Keys" },
  );
  const rsaEncKey = makeNode(
    "rsa",
    { x: 400, y: 200 },
    { action: "encrypt", label: "RSA Encrypt AES Key" },
  );

  const rsaDecKey = makeNode(
    "rsa",
    { x: 750, y: 200 },
    { action: "decrypt", label: "RSA Decrypt AES Key" },
  );
  const aesDec = makeNode(
    "aes",
    { x: 1100, y: 50 },
    { action: "decrypt", cipherMode: "CBC", label: "AES Decrypt Data" },
  );

  const outData = makeNode("output", { x: 1450, y: 50 }, { label: "Recovered Data" });
  const outEncKey = makeNode(
    "output",
    { x: 750, y: 350 },
    { label: "Encrypted AES Key", outputFormat: "base64" },
  );

  return {
    name: "Hybrid Encryption (Digital Envelope)",
    nodes: [
      inputData,
      aesKeyGen,
      aesIvGen,
      aesEnc,
      bobRsaKey,
      rsaEncKey,
      rsaDecKey,
      aesDec,
      outData,
      outEncKey,
    ],
    edges: [
      { id: "h1", source: inputData.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "h2", source: aesKeyGen.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "h3", source: aesIvGen.id, target: aesEnc.id, targetHandle: "iv", animated: true },

      {
        id: "h4",
        source: aesKeyGen.id,
        target: rsaEncKey.id,
        targetHandle: "data",
        animated: true,
      },
      {
        id: "h5",
        source: bobRsaKey.id,
        target: rsaEncKey.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },

      {
        id: "h6",
        source: rsaEncKey.id,
        target: outEncKey.id,
        targetHandle: "data",
        animated: true,
      },

      {
        id: "h7",
        source: rsaEncKey.id,
        target: rsaDecKey.id,
        targetHandle: "data",
        animated: true,
      },
      {
        id: "h8",
        source: bobRsaKey.id,
        target: rsaDecKey.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },

      { id: "h9", source: aesEnc.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "h10", source: rsaDecKey.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "h11", source: aesIvGen.id, target: aesDec.id, targetHandle: "iv", animated: true },

      { id: "h12", source: aesDec.id, target: outData.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getHttpsHandshakePreset(): WorkflowSeed {
  const clientKey = makeNode(
    "ec_keygen",
    { x: 50, y: 50 },
    { algorithm: "ECDH", namedCurve: "P-256", label: "Client ECDH Key" },
  );
  const serverKey = makeNode(
    "ec_keygen",
    { x: 50, y: 250 },
    { algorithm: "ECDH", namedCurve: "P-256", label: "Server ECDH Key" },
  );

  const clientDerive = makeNode("ecdh", { x: 400, y: 50 }, { label: "Client Derive" });
  const serverDerive = makeNode("ecdh", { x: 400, y: 250 }, { label: "Server Derive" });

  const hkdf = makeNode(
    "hkdf",
    { x: 750, y: 50 },
    { hash: "SHA-256", length: 256, label: "Client HKDF (Session Key)" },
  );
  const serverHkdf = makeNode(
    "hkdf",
    { x: 750, y: 250 },
    { hash: "SHA-256", length: 256, label: "Server HKDF (Session Key)" },
  );

  const salt = makeNode(
    "input",
    { x: 400, y: 400 },
    { text: "handshake-salt", label: "Handshake Salt" },
  );
  const info = makeNode(
    "input",
    { x: 400, y: 500 },
    { text: "tls13 client in", label: "HKDF Info" },
  );

  const requestData = makeNode(
    "input",
    { x: 750, y: 400 },
    { text: "GET / HTTP/1.1\nHost: flowforge.crypto", label: "HTTP Request" },
  );
  const iv = makeNode("random", { x: 750, y: 500 }, { length: 12, label: "IV (12 bytes for GCM)" });

  const aesEnc = makeNode(
    "aes",
    { x: 1100, y: 50 },
    { action: "encrypt", cipherMode: "GCM", label: "AES-GCM (Client Send)" },
  );
  const outCipher = makeNode(
    "output",
    { x: 1450, y: 50 },
    { label: "Encrypted HTTP Request", outputFormat: "hex" },
  );

  const aesDec = makeNode(
    "aes",
    { x: 1100, y: 250 },
    { action: "decrypt", cipherMode: "GCM", label: "AES-GCM (Server Receive)" },
  );
  const outData = makeNode("output", { x: 1450, y: 250 }, { label: "Decrypted Data (Server)" });

  return {
    name: "HTTPS Handshake Simulation",
    nodes: [
      clientKey,
      serverKey,
      clientDerive,
      serverDerive,
      hkdf,
      serverHkdf,
      salt,
      info,
      requestData,
      iv,
      aesEnc,
      outCipher,
      aesDec,
      outData,
    ],
    edges: [
      {
        id: "t1",
        source: clientKey.id,
        target: clientDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "t2",
        source: serverKey.id,
        target: clientDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },

      {
        id: "t3",
        source: serverKey.id,
        target: serverDerive.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      {
        id: "t4",
        source: clientKey.id,
        target: serverDerive.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },

      { id: "t5", source: clientDerive.id, target: hkdf.id, targetHandle: "ikm", animated: true },
      { id: "t6", source: salt.id, target: hkdf.id, targetHandle: "salt", animated: true },
      { id: "t7", source: info.id, target: hkdf.id, targetHandle: "info", animated: true },

      {
        id: "t5s",
        source: serverDerive.id,
        target: serverHkdf.id,
        targetHandle: "ikm",
        animated: true,
      },
      { id: "t6s", source: salt.id, target: serverHkdf.id, targetHandle: "salt", animated: true },
      { id: "t7s", source: info.id, target: serverHkdf.id, targetHandle: "info", animated: true },

      { id: "t8", source: hkdf.id, target: aesEnc.id, targetHandle: "key", animated: true },
      { id: "t9", source: requestData.id, target: aesEnc.id, targetHandle: "data", animated: true },
      { id: "t10", source: iv.id, target: aesEnc.id, targetHandle: "iv", animated: true },

      { id: "t11", source: aesEnc.id, target: outCipher.id, targetHandle: "data", animated: true },

      { id: "t12", source: serverHkdf.id, target: aesDec.id, targetHandle: "key", animated: true },
      { id: "t13", source: aesEnc.id, target: aesDec.id, targetHandle: "data", animated: true },
      { id: "t14", source: iv.id, target: aesDec.id, targetHandle: "iv", animated: true },

      { id: "t15", source: aesDec.id, target: outData.id, targetHandle: "data", animated: true },
    ],
  };
}

export function getRsaFullSuitePreset(): WorkflowSeed {
  const keyGen = makeNode(
    "rsa_keygen",
    { x: 50, y: 150 },
    { algorithm: "RSA-OAEP", label: "RSA Master Keys" },
  );
  const input = makeNode(
    "input",
    { x: 50, y: 350 },
    { text: "hello world - full rsa suite", label: "Message" },
  );

  // Encryption Path (Top)
  const rsaEnc = makeNode(
    "rsa",
    { x: 450, y: 50 },
    { action: "encrypt", scheme: "RSA-OAEP", label: "RSA Encrypt" },
  );
  const rsaDec = makeNode(
    "rsa",
    { x: 850, y: 50 },
    { action: "decrypt", scheme: "RSA-OAEP", label: "RSA Decrypt" },
  );
  const outEnc = makeNode(
    "output",
    { x: 1250, y: 50 },
    { label: "Decrypted Msg", outputFormat: "utf8" },
  );

  // Signature Path (Bottom)
  const rsaSign = makeNode(
    "rsa_sign",
    { x: 450, y: 250 },
    { algorithm: "RSASSA-PKCS1-v1_5", hash: "SHA-256", label: "RSA Sign" },
  );
  const rsaVerify = makeNode(
    "rsa_verify",
    { x: 850, y: 250 },
    { algorithm: "RSASSA-PKCS1-v1_5", hash: "SHA-256", label: "RSA Verify" },
  );
  const outSign = makeNode("output", { x: 1250, y: 250 }, { label: "Verify Result" });

  return {
    name: "RSA Full Suite (Encrypt & Sign)",
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
      { id: "f5", source: rsaDec.id, target: outEnc.id, targetHandle: "data", animated: true },

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
      { id: "f11", source: rsaVerify.id, target: outSign.id, targetHandle: "data", animated: true },
    ],
  };
}
export function getRncryptorDeepDivePreset(): WorkflowSeed {
  // --- HIGH-LEVEL PATH ---
  const hiMsg = makeNode(
    "input",
    { x: 50, y: 50 },
    { text: "Hi-level RNCryptor", label: "Message (Hi-Level)" },
  );
  const hiPwd = makeNode(
    "input",
    { x: 50, y: 200 },
    { text: "hi-password", label: "Password (Hi-Level)" },
  );
  const hiEnc = makeNode("rncryptor_encrypt", { x: 400, y: 100 }, { label: "Standard Encrypt" });
  const hiDec = makeNode("rncryptor_decrypt", { x: 750, y: 100 }, { label: "Standard Decrypt" });
  const hiOut = makeNode(
    "output",
    { x: 1100, y: 100 },
    { label: "Decrypted (Hi)", outputFormat: "utf8" },
  );

  // --- LOW-LEVEL PATH (Manual Composition) ---
  const loMsg = makeNode(
    "input",
    { x: 50, y: 400 },
    { text: "Manual logic RNCryptor", label: "Message (Low-Level)" },
  );
  const loPwd = makeNode(
    "input",
    { x: 50, y: 550 },
    { text: "logic-password", label: "Password (Low-Level)" },
  );

  // Random Components (Sender)
  const encSaltS = makeNode(
    "random",
    { x: 50, y: 700 },
    { length: 8, label: "Sender: Gen Enc Salt" },
  );
  const hmacSaltS = makeNode(
    "random",
    { x: 50, y: 800 },
    { length: 8, label: "Sender: Gen HMAC Salt" },
  );
  const ivS = makeNode("random", { x: 50, y: 900 }, { length: 16, label: "Sender: Gen IV" });

  // KDF (Sender)
  const kdfEncS = makeNode(
    "pbkdf2",
    { x: 400, y: 550 },
    { iterations: 10000, length: 256, label: "Sender: Derive Enc Key" },
  );
  const kdfHmacS = makeNode(
    "pbkdf2",
    { x: 400, y: 750 },
    { iterations: 10000, length: 256, label: "Sender: Derive HMAC Key" },
  );

  // Encrypt
  const aesE = makeNode(
    "aes",
    { x: 750, y: 400 },
    { action: "encrypt", cipherMode: "CBC", label: "AES-256-CBC Encrypt" },
  );

  // Packet assembly
  const ver = makeNode(
    "input",
    { x: 750, y: 600 },
    { text: "0301", inputFormat: "hex", label: "Ver/Opt (0301)" },
  );
  const joinBody = makeNode(
    "join",
    { x: 1100, y: 600 },
    { count: 5, separator: "none", label: "Assemble Body (Hdr+CT)" },
  );
  const hmacS = makeNode(
    "hmac",
    { x: 1450, y: 600 },
    { hash: "SHA-256", label: "HMAC-SHA256 Sign" },
  );
  const joinFinal = makeNode(
    "join",
    { x: 1800, y: 600 },
    { count: 2, separator: "none", label: "Final RNCryptor Blob" },
  );
  const blobOut = makeNode(
    "output",
    { x: 2150, y: 600 },
    { label: "Encrypted Blob", outputFormat: "base64" },
  );

  // --- RECEIVER SIDE (LOW-LEVEL) ---

  // Slicing
  const sliceEncSalt = makeNode(
    "slice",
    { x: 2150, y: 850 },
    { start: 2, end: 10, label: "Receiver: Extract Enc Salt" },
  );
  const sliceHmacSalt = makeNode(
    "slice",
    { x: 2150, y: 1000 },
    { start: 10, end: 18, label: "Receiver: Extract HMAC Salt" },
  );
  const sliceIV = makeNode(
    "slice",
    { x: 1800, y: 850 },
    { start: 18, end: 34, label: "Receiver: Extract IV" },
  );
  const sliceCT = makeNode(
    "slice",
    { x: 1800, y: 1000 },
    { start: 34, end: -32, label: "Receiver: Extract Ciphertext" },
  );
  const sliceHMAC = makeNode(
    "slice",
    { x: 1800, y: 1150 },
    { start: -32, label: "Receiver: Extract HMAC Sig" },
  );
  const sliceToVerify = makeNode(
    "slice",
    { x: 1800, y: 1300 },
    { start: 0, end: -32, label: "Receiver: Extract Body for Verify" },
  );

  // KDF (Receiver)
  const kdfEncR = makeNode(
    "pbkdf2",
    { x: 1450, y: 850 },
    { iterations: 10000, length: 256, label: "Receiver: Derive Enc Key" },
  );
  const kdfHmacR = makeNode(
    "pbkdf2",
    { x: 1450, y: 1050 },
    { iterations: 10000, length: 256, label: "Receiver: Derive HMAC Key" },
  );

  // Verify & Decrypt
  const hmacV = makeNode(
    "hmac",
    { x: 1100, y: 1050 },
    { action: "verify", hash: "SHA-256", label: "HMAC Verify" },
  );
  const validOut = makeNode(
    "output",
    { x: 800, y: 1150 },
    { label: "Integrity Valid?", outputFormat: "bool" },
  );
  const aesD = makeNode(
    "aes",
    { x: 1100, y: 850 },
    { action: "decrypt", cipherMode: "CBC", label: "AES-256-CBC Decrypt" },
  );
  const loOut = makeNode(
    "output",
    { x: 800, y: 850 },
    { label: "Decrypted (Low)", outputFormat: "utf8" },
  );

  return {
    name: "RNCryptor v3 Deep Dive (Hi + Lo)",
    nodes: [
      hiMsg,
      hiPwd,
      hiEnc,
      hiDec,
      hiOut,
      loMsg,
      loPwd,
      encSaltS,
      hmacSaltS,
      ivS,
      kdfEncS,
      kdfHmacS,
      aesE,
      ver,
      joinBody,
      hmacS,
      joinFinal,
      blobOut,
      sliceEncSalt,
      sliceHmacSalt,
      sliceIV,
      sliceCT,
      sliceHMAC,
      sliceToVerify,
      kdfEncR,
      kdfHmacR,
      hmacV,
      validOut,
      aesD,
      loOut,
    ],
    edges: [
      // Hi-Level
      { id: "h1", source: hiMsg.id, target: hiEnc.id, targetHandle: "data", animated: true },
      { id: "h2", source: hiPwd.id, target: hiEnc.id, targetHandle: "password", animated: true },
      { id: "h3", source: hiEnc.id, target: hiDec.id, targetHandle: "data", animated: true },
      { id: "h4", source: hiPwd.id, target: hiDec.id, targetHandle: "password", animated: true },
      { id: "h5", source: hiDec.id, target: hiOut.id, targetHandle: "data", animated: true },
      // Lo-Level Sender
      { id: "ls1", source: loPwd.id, target: kdfEncS.id, targetHandle: "password", animated: true },
      { id: "ls2", source: encSaltS.id, target: kdfEncS.id, targetHandle: "salt", animated: true },
      {
        id: "ls3",
        source: loPwd.id,
        target: kdfHmacS.id,
        targetHandle: "password",
        animated: true,
      },
      {
        id: "ls4",
        source: hmacSaltS.id,
        target: kdfHmacS.id,
        targetHandle: "salt",
        animated: true,
      },
      { id: "ls5", source: loMsg.id, target: aesE.id, targetHandle: "data", animated: true },
      { id: "ls6", source: kdfEncS.id, target: aesE.id, targetHandle: "key", animated: true },
      { id: "ls7", source: ivS.id, target: aesE.id, targetHandle: "iv", animated: true },
      { id: "ls8", source: ver.id, target: joinBody.id, targetHandle: "in_1", animated: true },
      { id: "ls9", source: encSaltS.id, target: joinBody.id, targetHandle: "in_2", animated: true },
      {
        id: "ls10",
        source: hmacSaltS.id,
        target: joinBody.id,
        targetHandle: "in_3",
        animated: true,
      },
      { id: "ls11", source: ivS.id, target: joinBody.id, targetHandle: "in_4", animated: true },
      { id: "ls12", source: aesE.id, target: joinBody.id, targetHandle: "in_5", animated: true },
      { id: "ls13", source: joinBody.id, target: hmacS.id, targetHandle: "data", animated: true },
      { id: "ls14", source: kdfHmacS.id, target: hmacS.id, targetHandle: "key", animated: true },
      {
        id: "ls15",
        source: joinBody.id,
        target: joinFinal.id,
        targetHandle: "in_1",
        animated: true,
      },
      { id: "ls16", source: hmacS.id, target: joinFinal.id, targetHandle: "in_2", animated: true },
      {
        id: "ls17",
        source: joinFinal.id,
        target: blobOut.id,
        targetHandle: "data",
        animated: true,
      },
      // Lo-Level Receiver
      {
        id: "lr1",
        source: joinFinal.id,
        target: sliceEncSalt.id,
        targetHandle: "data",
        animated: true,
      },
      {
        id: "lr2",
        source: joinFinal.id,
        target: sliceHmacSalt.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "lr3", source: joinFinal.id, target: sliceIV.id, targetHandle: "data", animated: true },
      { id: "lr4", source: joinFinal.id, target: sliceCT.id, targetHandle: "data", animated: true },
      {
        id: "lr5",
        source: joinFinal.id,
        target: sliceHMAC.id,
        targetHandle: "data",
        animated: true,
      },
      {
        id: "lr6",
        source: joinFinal.id,
        target: sliceToVerify.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "lr7", source: loPwd.id, target: kdfEncR.id, targetHandle: "password", animated: true },
      {
        id: "lr8",
        source: sliceEncSalt.id,
        target: kdfEncR.id,
        targetHandle: "salt",
        animated: true,
      },
      {
        id: "lr9",
        source: loPwd.id,
        target: kdfHmacR.id,
        targetHandle: "password",
        animated: true,
      },
      {
        id: "lr10",
        source: sliceHmacSalt.id,
        target: kdfHmacR.id,
        targetHandle: "salt",
        animated: true,
      },
      {
        id: "lr11",
        source: sliceToVerify.id,
        target: hmacV.id,
        targetHandle: "data",
        animated: true,
      },
      {
        id: "lr12",
        source: sliceHMAC.id,
        target: hmacV.id,
        targetHandle: "signature",
        animated: true,
      },
      { id: "lr13", source: kdfHmacR.id, target: hmacV.id, targetHandle: "key", animated: true },
      { id: "lr14", source: hmacV.id, target: validOut.id, targetHandle: "data", animated: true },
      { id: "lr15", source: sliceCT.id, target: aesD.id, targetHandle: "data", animated: true },
      { id: "lr16", source: kdfEncR.id, target: aesD.id, targetHandle: "key", animated: true },
      { id: "lr17", source: sliceIV.id, target: aesD.id, targetHandle: "iv", animated: true },
      { id: "lr18", source: aesD.id, target: loOut.id, animated: true },
    ],
  };
}

function groupNode(label: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  return makeNode("group", { x, y }, { label, ...extra });
}

function getGroupDemoPreset(): WorkflowSeed {
  // ═══════════════════════════════════════════════════════════════
  // Group 1: 全关  in=no  out=no
  // 组内自闭环路，无法与外部通信。试图连接外部会变红。
  // ═══════════════════════════════════════════════════════════════
  const g1 = groupNode("Fully Closed (in=no, out=no)", 20, 20, {
    allowInbound: "no",
    allowOutbound: "no",
  });
  const g1_in = makeNode("input", { x: 40, y: 80 }, { text: "hello from group", label: "Src" });
  const g1_hash = makeNode("sha256", { x: 220, y: 80 }, { label: "SHA-256" });
  const g1_hex = makeNode("hex", { x: 420, y: 80 }, { action: "encode", label: "To Hex" });
  const g1_out = makeNode("output", { x: 600, y: 80 }, { label: "Result" });
  [g1_in, g1_hash, g1_hex, g1_out].forEach((n) => {
    n.parentId = g1.id;
    n.extent = "parent" as const;
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 2: 只进不出  in=yes  out=no
  // 外部 Input 可以进组，但组内 Output 连出时会报错（红色）
  // ═══════════════════════════════════════════════════════════════
  const g2 = groupNode("Inbound Only (in=yes, out=no)", 20, 360, {
    allowInbound: "yes",
    allowOutbound: "no",
  });
  const g2_dec = makeNode(
    "aes",
    { x: 40, y: 420 },
    { action: "decrypt", cipherMode: "GCM", label: "AES Decrypt" },
  );
  const g2_decOut = makeNode("output", { x: 240, y: 420 }, { label: "Decrypted" });
  [g2_dec, g2_decOut].forEach((n) => {
    n.parentId = g2.id;
    n.extent = "parent" as const;
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 3: 只出不进  in=no  out=yes
  // 组内节点可以连出，但外部节点连入时会报错（红色）
  // ═══════════════════════════════════════════════════════════════
  const g3 = groupNode("Outbound Only (in=no, out=yes)", 20, 700, {
    allowInbound: "no",
    allowOutbound: "yes",
  });
  const g3_enc = makeNode(
    "aes",
    { x: 40, y: 760 },
    { action: "encrypt", cipherMode: "GCM", label: "AES Encrypt" },
  );
  const g3_hash = makeNode("sha256", { x: 240, y: 760 }, { label: "Hash" });
  [g3_enc, g3_hash].forEach((n) => {
    n.parentId = g3.id;
    n.extent = "parent" as const;
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 4: 全开  in=yes  out=yes
  // 外部节点可自由进出，无限制
  // ═══════════════════════════════════════════════════════════════
  const g4 = groupNode("Fully Open (in=yes, out=yes)", 20, 1040, {
    allowInbound: "yes",
    allowOutbound: "yes",
  });
  const g4_transform = makeNode("uppercase", { x: 40, y: 1100 }, { label: "To Upper" });
  const g4_out = makeNode("output", { x: 240, y: 1100 }, { label: "Internal Out" });
  [g4_transform, g4_out].forEach((n) => {
    n.parentId = g4.id;
    n.extent = "parent" as const;
  });

  // ═══════════════════════════════════════════════════════════════
  // External nodes — 放在各组右方，方便测试连线是否报错
  // ═══════════════════════════════════════════════════════════════
  const extCiphertext = makeNode(
    "input",
    { x: 750, y: 180 },
    { text: "ciphertext_hex", label: "Ext Ciphertext" },
  );
  const extKey = makeNode(
    "input",
    { x: 750, y: 300 },
    {
      text: "12345678901234567890123456789012",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Ext Key",
    },
  );
  const extIv = makeNode(
    "input",
    { x: 750, y: 420 },
    {
      text: "12345678901234567890123456789012",
      inputFormat: "hex",
      outputFormat: "hex",
      label: "Ext IV",
    },
  );
  const extResult = makeNode("output", { x: 750, y: 640 }, { label: "External Out" });
  const extPlaintext = makeNode(
    "input",
    { x: 750, y: 940 },
    { text: "hello world", outputFormat: "utf8", label: "Ext Plaintext" },
  );
  const extUpperResult = makeNode("output", { x: 750, y: 1060 }, { label: "Upper Result" });

  return {
    name: "Group Demo (Isolated + Connected)",
    nodes: [
      g1,
      g1_in,
      g1_hash,
      g1_hex,
      g1_out,
      g2,
      g2_dec,
      g2_decOut,
      g3,
      g3_enc,
      g3_hash,
      g4,
      g4_transform,
      g4_out,
      extCiphertext,
      extKey,
      extIv,
      extResult,
      extPlaintext,
      extUpperResult,
    ],
    edges: [
      // ── Group 1 internal (no external edges) ──
      { id: "g1e1", source: g1_in.id, target: g1_hash.id, targetHandle: "data", animated: true },
      { id: "g1e2", source: g1_hash.id, target: g1_hex.id, targetHandle: "data", animated: true },
      { id: "g1e3", source: g1_hex.id, target: g1_out.id, targetHandle: "data", animated: true },

      // ── Group 2 internal + inbound only ──
      { id: "g2e1", source: g2_dec.id, target: g2_decOut.id, targetHandle: "data", animated: true },
      // ✅ 外部 → 组内（allowInbound=yes → 成功）
      {
        id: "ex2a",
        source: extCiphertext.id,
        target: g2_dec.id,
        targetHandle: "data",
        animated: true,
      },
      { id: "ex2b", source: extKey.id, target: g2_dec.id, targetHandle: "key", animated: true },
      { id: "ex2c", source: extIv.id, target: g2_dec.id, targetHandle: "iv", animated: true },
      // ❌ 组内 → 外部 被禁止（试图拖动会变红）

      // ── Group 3 internal + outbound only ──
      { id: "g3e1", source: g3_enc.id, target: g3_hash.id, targetHandle: "data", animated: true },
      // ✅ 组内 → 外部（allowOutbound=yes → 成功）
      {
        id: "ex3a",
        source: g3_hash.id,
        target: extResult.id,
        targetHandle: "data",
        animated: true,
      },
      // ❌ 外部 → 组内 被禁止（试图拖动会变红）

      // ── Group 4 internal + full bidirectional ──
      {
        id: "g4e1",
        source: g4_transform.id,
        target: g4_out.id,
        targetHandle: "data",
        animated: true,
      },
      // ✅ 外部 → 组内（allowInbound=yes）
      {
        id: "ex4a",
        source: extPlaintext.id,
        target: g4_transform.id,
        targetHandle: "data",
        animated: true,
      },
      // ✅ 组内 → 外部（allowOutbound=yes）
      {
        id: "ex4b",
        source: g4_transform.id,
        target: extUpperResult.id,
        targetHandle: "data",
        animated: true,
      },
    ],
  };
}

export function getCustomBasePreset(): WorkflowSeed {
  const srcInput = makeNode(
    "input",
    { x: 50, y: 240 },
    { text: "Hello +World /test?=", label: "Source Text" },
  );

  // Path 1 — Standard alphabet (alphabetPreset="" uses default)
  const b64Std = makeNode("base64", { x: 400, y: 50 }, { mode: "encode", label: "B64 Standard" });
  const outStd = makeNode(
    "output",
    { x: 750, y: 50 },
    { label: "Standard B64", outputFormat: "utf8" },
  );

  // Path 2 — Preset non-standard alphabet (URL-safe) + decode round-trip
  const b64Url = makeNode(
    "base64",
    { x: 400, y: 200 },
    { mode: "encode", alphabetPreset: "url_safe", label: "B64 URL-safe Preset" },
  );
  const b64Dec = makeNode(
    "base64",
    { x: 750, y: 350 },
    { mode: "decode", alphabetPreset: "url_safe", label: "B64 URL-safe Decode" },
  );
  const outUrl = makeNode(
    "output",
    { x: 750, y: 180 },
    { label: "URL-safe B64", outputFormat: "utf8" },
  );
  const outDec = makeNode("output", { x: 1100, y: 350 }, { label: "Decoded (round-trip match?)" });

  // Path 3 — DIY custom alphabet
  const b64Diy = makeNode(
    "base64",
    { x: 400, y: 480 },
    {
      mode: "encode",
      alphabetPreset: "__custom__",
      alphabetCustom: "ZYXWVUTSRQPONMLKJIHGFEDCBAabcdefghijklmnopqrstuvwxyz0123456789+/",
      label: "B64 DIY Reversed Alpha",
    },
  );
  const outDiy = makeNode(
    "output",
    { x: 750, y: 480 },
    { label: "DIY Encoded", outputFormat: "utf8" },
  );

  return {
    name: "Custom Base64 (Standard / Preset / DIY)",
    nodes: [srcInput, b64Std, outStd, b64Url, b64Dec, outUrl, outDec, b64Diy, outDiy],
    edges: [
      { id: "p1", source: srcInput.id, target: b64Std.id, targetHandle: "data", animated: true },
      { id: "p2", source: b64Std.id, target: outStd.id, targetHandle: "data", animated: true },
      { id: "p3", source: srcInput.id, target: b64Url.id, targetHandle: "data", animated: true },
      { id: "p4", source: b64Url.id, target: outUrl.id, targetHandle: "data", animated: true },
      { id: "p5", source: b64Url.id, target: b64Dec.id, targetHandle: "data", animated: true },
      { id: "p6", source: b64Dec.id, target: outDec.id, targetHandle: "data", animated: true },
      { id: "p7", source: srcInput.id, target: b64Diy.id, targetHandle: "data", animated: true },
      { id: "p8", source: b64Diy.id, target: outDiy.id, targetHandle: "data", animated: true },
    ],
  };
}

export const ALL_PRESETS: { label: string; seed: WorkflowSeed; keywords: string }[] = [
  {
    label: "RNCryptor v3 Deep Dive (Hi + Lo)",
    seed: getRncryptorDeepDivePreset(),
    keywords: "rncryptor protocol composition pbkdf2 aes hmac educational deep-dive",
  },
  {
    label: "RSA Full Suite (Encrypt & Sign)",
    seed: getRsaFullSuitePreset(),
    keywords: "rsa encrypt decrypt sign verify asymmetric",
  },

  {
    label: "AES-GCM Encrypt/Decrypt",
    seed: getAesGcmPreset(),
    keywords: "aes gcm encrypt decrypt aead",
  },
  {
    label: "AES-CBC Encrypt/Decrypt",
    seed: getAesCbcPreset(),
    keywords: "aes cbc encrypt decrypt",
  },
  {
    label: "ChaCha20-Poly1305 Encrypt/Decrypt",
    seed: getChaCha20Preset(),
    keywords: "chacha20 poly1305 encrypt decrypt aead",
  },
  { label: "ECDSA Sign & Verify", seed: getEcdsaPreset(), keywords: "ecdsa ecc sign verify" },
  {
    label: "Ed25519 Sign & Verify",
    seed: getEd25519Preset(),
    keywords: "ed25519 eddsa sign verify",
  },
  { label: "JWT Sign & Verify", seed: getJwtPreset(), keywords: "jwt token sign verify" },
  { label: "HMAC Sign & Verify", seed: getHmacPreset(), keywords: "hmac mac sign verify" },
  {
    label: "Hash Suite (6 algorithms)",
    seed: getHashSuitePreset(),
    keywords: "hash sha256 sha3 blake3 sm3",
  },
  {
    label: "KDF (PBKDF2) + AES",
    seed: getKdfAesPreset(),
    keywords: "kdf pbkdf2 key derivation aes",
  },
  {
    label: "Argon2 (Password Hash)",
    seed: getArgon2Preset(),
    keywords: "argon2 password hash kdf memory hard",
  },
  { label: "TOTP Authenticator", seed: getTOTPPreset(), keywords: "totp otp authenticator 2fa" },
  {
    label: "ML-KEM Encapsulation",
    seed: getMlKemPreset(),
    keywords: "pqc ml-kem kyber kem encapsulate decapsulate post-quantum",
  },
  {
    label: "ML-DSA Sign & Verify",
    seed: getMlDsaPreset(),
    keywords: "pqc ml-dsa dilithium sign verify post-quantum",
  },
  {
    label: "SLH-DSA Sign & Verify",
    seed: getSlhDsaPreset(),
    keywords: "pqc slh-dsa sphincs sign verify hash-based",
  },
  {
    label: "secp256k1 Sign & Verify",
    seed: getSecp256k1Preset(),
    keywords: "secp256k1 bitcoin ethereum ecdsa sign verify",
  },
  {
    label: "secp256k1 ECDH Key Exchange",
    seed: getSecp256k1EcdhPreset(),
    keywords: "secp256k1 ecdh key exchange shared secret",
  },
  { label: "Ed448 Sign & Verify", seed: getEd448Preset(), keywords: "ed448 eddsa sign verify" },
  {
    label: "X448 Key Exchange",
    seed: getX448Preset(),
    keywords: "x448 diffie-hellman key exchange shared secret",
  },
  {
    label: "BLS12-381 Sign & Verify",
    seed: getBlsPreset(),
    keywords: "bls12-381 bls sign verify aggregate",
  },
  {
    label: "Diffie-Hellman Key Exchange",
    seed: getDhPreset(),
    keywords: "diffie hellman modp key exchange shared secret",
  },
  {
    label: "Frequency Analysis",
    seed: getFreqAnalysisPreset(),
    keywords: "frequency analysis entropy byte distribution",
  },
  {
    label: "ECB Block Detection",
    seed: getEcbDetectPreset(),
    keywords: "ecb block detection aes encryption analysis",
  },
  {
    label: "Shamir Split & Join",
    seed: getShamirPreset(),
    keywords: "shamir secret sharing split join threshold",
  },
  {
    label: "X.509 Certificate Parse",
    seed: getX509Preset(),
    keywords: "x509 certificate parse pem",
  },
  { label: "PEM to JWK Conversion", seed: getJwkPreset(), keywords: "jwk pem convert key format" },
  {
    label: "Twofish-CBC Encrypt/Decrypt",
    seed: getTwofishPreset(),
    keywords: "twofish encrypt decrypt cipher aes finalist",
  },
  {
    label: "XSalsa20-Poly1305 Encrypt/Decrypt",
    seed: getXSalsa20Preset(),
    keywords: "xsalsa20 poly1305 secretbox encrypt decrypt aead libsodium",
  },
  {
    label: "Blowfish-CBC Encrypt/Decrypt",
    seed: getBlowfishPreset(),
    keywords: "blowfish encrypt decrypt cipher legacy",
  },
  {
    label: "Salsa20 Stream Cipher",
    seed: getSalsa20Preset(),
    keywords: "salsa20 stream cipher encrypt decrypt estream",
  },
  {
    label: "Merkle Tree",
    seed: getMerklePreset(),
    keywords: "merkle tree root hash blockchain proof",
  },
  {
    label: "RC4 Stream Cipher",
    seed: getRc4Preset(),
    keywords: "rc4 stream cipher encrypt decrypt legacy",
  },
  {
    label: "Rabbit Stream Cipher",
    seed: getRabbitPreset(),
    keywords: "rabbit stream cipher encrypt decrypt",
  },
  {
    label: "SSH Key Parse",
    seed: getSshKeyPreset(),
    keywords: "ssh public key parse authorized_keys",
  },
  {
    label: "Hybrid Encryption (Digital Envelope)",
    seed: getHybridEncryptionPreset(),
    keywords: "hybrid encryption digital envelope rsa aes",
  },
  {
    label: "HTTPS Handshake Simulation",
    seed: getHttpsHandshakePreset(),
    keywords: "https handshake tls ecdh hkdf aes gcm",
  },
  {
    label: "Custom Base64 (Standard / Preset / DIY)",
    seed: getCustomBasePreset(),
    keywords: "base64 custom alphabet url-safe diy standard encoding decoding round-trip",
  },
  {
    label: "Group Demo (Isolated + Connected)",
    seed: getGroupDemoPreset(),
    keywords: "group isolation inbound outbound pipeline organization",
  },
];
