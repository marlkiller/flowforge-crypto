import { makeNode } from "@/lib/crypto/factory";
import type { WorkflowSeed } from "./seeds";

export function getRsaSignPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Message" });
  const keyGen = makeNode(
    "rsa_keygen",
    { x: 50, y: 50 },
    { algorithm: "RSASSA-PKCS1-v1_5", label: "RSA Key Pair" },
  );
  const rsaSign = makeNode(
    "rsa_sign",
    { x: 450, y: 50 },
    { algorithm: "RSASSA-PKCS1-v1_5", hash: "SHA-256", label: "RSA Sign" },
  );
  const rsaVerify = makeNode(
    "rsa_verify",
    { x: 850, y: 50 },
    { algorithm: "RSASSA-PKCS1-v1_5", hash: "SHA-256", label: "RSA Verify" },
  );
  const out = makeNode("output", { x: 1250, y: 150 }, { label: "Result" });

  return {
    name: "RSA Signing Flow",
    nodes: [input, keyGen, rsaSign, rsaVerify, out],
    edges: [
      { id: "p1", source: input.id, target: rsaSign.id, targetHandle: "data", animated: true },
      {
        id: "p2",
        source: keyGen.id,
        target: rsaSign.id,
        sourceHandle: "privateKey",
        targetHandle: "privateKey",
        animated: true,
      },
      { id: "p3", source: input.id, target: rsaVerify.id, targetHandle: "data", animated: true },
      {
        id: "p4",
        source: rsaSign.id,
        target: rsaVerify.id,
        targetHandle: "signature",
        animated: true,
      },
      {
        id: "p5",
        source: keyGen.id,
        target: rsaVerify.id,
        sourceHandle: "publicKey",
        targetHandle: "publicKey",
        animated: true,
      },
      { id: "p6", source: rsaVerify.id, target: out.id, animated: true },
    ],
  };
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
      { id: "p7", source: aesDec.id, target: out.id, animated: true },
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
      { id: "p5", source: jwtVerify.id, target: out.id, animated: true },
    ],
  };
}

export function getHashSuitePreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Input Data" });
  const sha256 = makeNode("sha256", { x: 350, y: 50 }, { label: "SHA-256" });
  const sha3256 = makeNode("sha3256", { x: 350, y: 140 }, { label: "SHA3-256" });
  const blake3 = makeNode("blake3", { x: 350, y: 230 }, { label: "BLAKE3" });
  const sm3 = makeNode("sm3", { x: 350, y: 320 }, { label: "SM3" });
  const out1 = makeNode("output", { x: 650, y: 50 }, { label: "SHA-256", outputFormat: "hex" });
  const out2 = makeNode("output", { x: 650, y: 140 }, { label: "SHA3-256", outputFormat: "hex" });
  const out3 = makeNode("output", { x: 650, y: 230 }, { label: "BLAKE3", outputFormat: "hex" });
  const out4 = makeNode("output", { x: 650, y: 320 }, { label: "SM3", outputFormat: "hex" });

  return {
    name: "Hash Suite (SHA-256 / SHA3-256 / BLAKE3 / SM3)",
    nodes: [input, sha256, sha3256, blake3, sm3, out1, out2, out3, out4],
    edges: [
      { id: "h1", source: input.id, target: sha256.id, targetHandle: "data", animated: true },
      { id: "h2", source: input.id, target: sha3256.id, targetHandle: "data", animated: true },
      { id: "h3", source: input.id, target: blake3.id, targetHandle: "data", animated: true },
      { id: "h4", source: input.id, target: sm3.id, targetHandle: "data", animated: true },
      { id: "h5", source: sha256.id, target: out1.id, animated: true },
      { id: "h6", source: sha3256.id, target: out2.id, animated: true },
      { id: "h7", source: blake3.id, target: out3.id, animated: true },
      { id: "h8", source: sm3.id, target: out4.id, animated: true },
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
      { id: "e6", source: verify.id, target: out.id, animated: true },
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
      { id: "h6", source: hmacVerify.id, target: out.id, animated: true },
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
      { id: "k7", source: aesDec.id, target: out.id, animated: true },
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
      { id: "p7", source: aesDec.id, target: out.id, animated: true },
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
      { id: "e6", source: verify.id, target: out.id, animated: true },
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
      { id: "c7", source: dec.id, target: out.id, animated: true },
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
      { id: "a3", source: argon2.id, target: out.id, animated: true },
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
      { id: "t3", source: totp.id, target: out.id, animated: true },
    ],
  };
}

export function getMlKemPreset(): WorkflowSeed {
  const aliceKeyGen = makeNode("ml_kem_keygen", { x: 50, y: 50 }, { parameterSet: "ML-KEM-768", label: "Alice Key Gen" });
  const bobEncaps = makeNode("ml_kem_encaps", { x: 400, y: 50 }, { parameterSet: "ML-KEM-768", label: "Bob Encaps" });
  const aliceDecaps = makeNode("ml_kem_decaps", { x: 750, y: 50 }, { parameterSet: "ML-KEM-768", label: "Alice Decaps" });
  const sigOut = makeNode("output", { x: 1100, y: 10 }, { label: "Ciphertext", outputFormat: "hex" });
  const ssA = makeNode("output", { x: 1100, y: 150 }, { label: "Alice Shared Secret", outputFormat: "hex" });
  const ssB = makeNode("output", { x: 1100, y: 290 }, { label: "Bob Shared Secret", outputFormat: "hex" });
  const hexPub = makeNode("hex", { x: 170, y: 180 }, { mode: "encode", label: "Pub Key (hex)", outputFormat: "utf8" });
  const pubOut = makeNode("output", { x: 170, y: 280 }, { label: "Public Key", outputFormat: "hex" });

  return {
    name: "ML-KEM Encapsulation",
    nodes: [aliceKeyGen, bobEncaps, aliceDecaps, sigOut, ssA, ssB, hexPub, pubOut],
    edges: [
      { id: "k1", source: aliceKeyGen.id, target: bobEncaps.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "k2", source: aliceKeyGen.id, target: aliceDecaps.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "k3", source: bobEncaps.id, target: aliceDecaps.id, sourceHandle: "ciphertext", targetHandle: "ciphertext", animated: true },
      { id: "k4", source: bobEncaps.id, target: sigOut.id, sourceHandle: "ciphertext", animated: true },
      { id: "k5", source: aliceDecaps.id, target: ssA.id, animated: true },
      { id: "k6", source: bobEncaps.id, target: ssB.id, sourceHandle: "sharedSecret", animated: true },
      { id: "k7", source: aliceKeyGen.id, target: hexPub.id, sourceHandle: "publicKey", animated: true },
      { id: "k8", source: hexPub.id, target: pubOut.id, animated: true },
    ],
  };
}

export function getMlDsaPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world - post-quantum signing", label: "Message" });
  const keyGen = makeNode("ml_dsa_keygen", { x: 50, y: 50 }, { parameterSet: "ML-DSA-65", label: "ML-DSA Key Gen" });
  const sign = makeNode("ml_dsa_sign", { x: 450, y: 50 }, { parameterSet: "ML-DSA-65", label: "ML-DSA Sign" });
  const verify = makeNode("ml_dsa_verify", { x: 850, y: 50 }, { parameterSet: "ML-DSA-65", label: "ML-DSA Verify" });
  const sigOut = makeNode("output", { x: 1200, y: 10 }, { label: "Signature", outputFormat: "base64" });
  const result = makeNode("output", { x: 1200, y: 150 }, { label: "Verify Result" });

  return {
    name: "ML-DSA Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "d1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      { id: "d2", source: keyGen.id, target: sign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "d3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "d4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      { id: "d5", source: keyGen.id, target: verify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "d6", source: sign.id, target: sigOut.id, animated: true },
      { id: "d7", source: verify.id, target: result.id, animated: true },
    ],
  };
}

export function getSlhDsaPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world - hash-based signing", label: "Message" });
  const keyGen = makeNode("slh_dsa_keygen", { x: 50, y: 50 }, { parameterSet: "SLH-DSA-SHAKE-128s", label: "SLH-DSA Key Gen" });
  const sign = makeNode("slh_dsa_sign", { x: 450, y: 50 }, { parameterSet: "SLH-DSA-SHAKE-128s", label: "SLH-DSA Sign" });
  const verify = makeNode("slh_dsa_verify", { x: 850, y: 50 }, { parameterSet: "SLH-DSA-SHAKE-128s", label: "SLH-DSA Verify" });
  const sigOut = makeNode("output", { x: 1200, y: 10 }, { label: "Signature", outputFormat: "base64" });
  const result = makeNode("output", { x: 1200, y: 150 }, { label: "Verify Result" });

  return {
    name: "SLH-DSA Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "h1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      { id: "h2", source: keyGen.id, target: sign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "h3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "h4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      { id: "h5", source: keyGen.id, target: verify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "h6", source: sign.id, target: sigOut.id, animated: true },
      { id: "h7", source: verify.id, target: result.id, animated: true },
    ],
  };
}

export function getSecp256k1Preset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Message" });
  const keyGen = makeNode("secp256k1_keygen", { x: 50, y: 50 }, { label: "Key Gen" });
  const sign = makeNode("secp256k1_sign", { x: 400, y: 50 }, { hashFirst: "true", label: "Sign (ECDSA)" });
  const verify = makeNode("secp256k1_verify", { x: 750, y: 50 }, { hashFirst: "true", label: "Verify" });
  const sigOut = makeNode("output", { x: 1100, y: 10 }, { label: "Signature", outputFormat: "base64" });
  const result = makeNode("output", { x: 1100, y: 150 }, { label: "Verify Result" });

  return {
    name: "secp256k1 Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "s1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      { id: "s2", source: keyGen.id, target: sign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "s3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "s4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      { id: "s5", source: keyGen.id, target: verify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "s6", source: sign.id, target: sigOut.id, animated: true },
      { id: "s7", source: verify.id, target: result.id, animated: true },
    ],
  };
}

export function getSecp256k1EcdhPreset(): WorkflowSeed {
  const aliceKey = makeNode("secp256k1_keygen", { x: 50, y: 50 }, { label: "Alice Key Gen" });
  const bobKey = makeNode("secp256k1_keygen", { x: 50, y: 250 }, { label: "Bob Key Gen" });
  const aliceDerive = makeNode("ecdh_secp256k1", { x: 400, y: 50 }, { label: "Alice ECDH" });
  const bobDerive = makeNode("ecdh_secp256k1", { x: 400, y: 250 }, { label: "Bob ECDH" });
  const sharedA = makeNode("output", { x: 750, y: 50 }, { label: "Alice Shared", outputFormat: "hex" });
  const sharedB = makeNode("output", { x: 750, y: 250 }, { label: "Bob Shared", outputFormat: "hex" });

  return {
    name: "secp256k1 ECDH Key Exchange",
    nodes: [aliceKey, bobKey, aliceDerive, bobDerive, sharedA, sharedB],
    edges: [
      { id: "e1", source: aliceKey.id, target: aliceDerive.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "e2", source: bobKey.id, target: bobDerive.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "e3", source: aliceKey.id, target: bobDerive.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "e4", source: bobKey.id, target: aliceDerive.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "e5", source: aliceDerive.id, target: sharedA.id, animated: true },
      { id: "e6", source: bobDerive.id, target: sharedB.id, animated: true },
    ],
  };
}

export function getEd448Preset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world - Ed448 signing", label: "Message" });
  const keyGen = makeNode("ed448_keygen", { x: 50, y: 50 }, { label: "Key Gen" });
  const sign = makeNode("ed448_sign", { x: 400, y: 50 }, { label: "Sign" });
  const verify = makeNode("ed448_verify", { x: 750, y: 50 }, { label: "Verify" });
  const sigOut = makeNode("output", { x: 1100, y: 10 }, { label: "Signature", outputFormat: "base64" });
  const result = makeNode("output", { x: 1100, y: 150 }, { label: "Verify Result" });

  return {
    name: "Ed448 Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "e1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      { id: "e2", source: keyGen.id, target: sign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "e3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "e4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      { id: "e5", source: keyGen.id, target: verify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "e6", source: sign.id, target: sigOut.id, animated: true },
      { id: "e7", source: verify.id, target: result.id, animated: true },
    ],
  };
}

export function getX448Preset(): WorkflowSeed {
  const aliceKey = makeNode("ed448_keygen", { x: 50, y: 50 }, { label: "Alice Ed448 Key Gen" });
  const bobKey = makeNode("ed448_keygen", { x: 50, y: 250 }, { label: "Bob Ed448 Key Gen" });
  const aliceX = makeNode("x448_derive", { x: 400, y: 50 }, { label: "Alice X448" });
  const bobX = makeNode("x448_derive", { x: 400, y: 250 }, { label: "Bob X448" });
  const sharedA = makeNode("output", { x: 750, y: 50 }, { label: "Alice Shared", outputFormat: "hex" });
  const sharedB = makeNode("output", { x: 750, y: 250 }, { label: "Bob Shared", outputFormat: "hex" });

  return {
    name: "X448 Key Exchange",
    nodes: [aliceKey, bobKey, aliceX, bobX, sharedA, sharedB],
    edges: [
      { id: "x1", source: aliceKey.id, target: aliceX.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "x2", source: bobKey.id, target: bobX.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "x3", source: aliceKey.id, target: bobX.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "x4", source: bobKey.id, target: aliceX.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "x5", source: aliceX.id, target: sharedA.id, animated: true },
      { id: "x6", source: bobX.id, target: sharedB.id, animated: true },
    ],
  };
}

export function getBlsPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world - BLS aggregate signing", label: "Message" });
  const keyGen = makeNode("bls_keygen", { x: 50, y: 50 }, { label: "Key Gen" });
  const sign = makeNode("bls_sign", { x: 400, y: 50 }, { label: "Sign" });
  const verify = makeNode("bls_verify", { x: 750, y: 50 }, { label: "Verify" });
  const sigOut = makeNode("output", { x: 1100, y: 10 }, { label: "Signature", outputFormat: "base64" });
  const result = makeNode("output", { x: 1100, y: 150 }, { label: "Verify Result" });

  return {
    name: "BLS12-381 Sign & Verify",
    nodes: [input, keyGen, sign, verify, sigOut, result],
    edges: [
      { id: "b1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      { id: "b2", source: keyGen.id, target: sign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "b3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "b4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      { id: "b5", source: keyGen.id, target: verify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "b6", source: sign.id, target: sigOut.id, animated: true },
      { id: "b7", source: verify.id, target: result.id, animated: true },
    ],
  };
}

export function getDhPreset(): WorkflowSeed {
  const aliceKey = makeNode("dh_keygen", { x: 50, y: 50 }, { group: "MODP-2048", label: "Alice DH Key" });
  const bobKey = makeNode("dh_keygen", { x: 50, y: 250 }, { group: "MODP-2048", label: "Bob DH Key" });
  const aliceDerive = makeNode("dh_derive", { x: 400, y: 50 }, { group: "MODP-2048", label: "Alice Derive" });
  const bobDerive = makeNode("dh_derive", { x: 400, y: 250 }, { group: "MODP-2048", label: "Bob Derive" });
  const sharedA = makeNode("output", { x: 750, y: 50 }, { label: "Alice Shared", outputFormat: "hex" });
  const sharedB = makeNode("output", { x: 750, y: 250 }, { label: "Bob Shared", outputFormat: "hex" });

  return {
    name: "Diffie-Hellman Key Exchange",
    nodes: [aliceKey, bobKey, aliceDerive, bobDerive, sharedA, sharedB],
    edges: [
      { id: "d1", source: aliceKey.id, target: aliceDerive.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "d2", source: bobKey.id, target: bobDerive.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "d3", source: aliceKey.id, target: bobDerive.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "d4", source: bobKey.id, target: aliceDerive.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "d5", source: aliceDerive.id, target: sharedA.id, animated: true },
      { id: "d6", source: bobDerive.id, target: sharedB.id, animated: true },
    ],
  };
}

export function getFreqAnalysisPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 100 }, { text: "The quick brown fox jumps over the lazy dog. The quick brown fox jumps. The quick fox. Fox fox fox.", label: "Sample Text" });
  const freq = makeNode("frequencyAnalysis", { x: 400, y: 100 }, { topN: 10, label: "Frequency Analysis" });
  const entropy = makeNode("entropyCalc", { x: 400, y: 300 }, { label: "Entropy" });
  const out1 = makeNode("output", { x: 750, y: 100 }, { label: "Frequencies" });
  const out2 = makeNode("output", { x: 750, y: 300 }, { label: "Entropy" });

  return {
    name: "Frequency Analysis",
    nodes: [input, freq, entropy, out1, out2],
    edges: [
      { id: "f1", source: input.id, target: freq.id, targetHandle: "data", animated: true },
      { id: "f2", source: input.id, target: entropy.id, targetHandle: "data", animated: true },
      { id: "f3", source: freq.id, target: out1.id, animated: true },
      { id: "f4", source: entropy.id, target: out2.id, animated: true },
    ],
  };
}

export function getEcbDetectPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 60 }, {
    text: "Top Secret Data!Top Secret Data!Top Secret Data!Padding for last block.",
    label: "Plaintext (3× repeating \"Top Secret Data!\")",
  });
  const key = makeNode("input", { x: 50, y: 260 }, {
    text: "00112233445566778899aabbccddeeff",
    inputFormat: "hex",
    outputFormat: "hex",
    label: "AES-128 Key",
  });
  const ecbEnc = makeNode("aes", { x: 350, y: 60 }, { action: "encrypt", cipherMode: "ECB", label: "AES-ECB Encrypt" });
  const ecbDetect = makeNode("ecbDetect", { x: 700, y: 60 }, { blockSize: 16, label: "ECB Detect" });
  const ecbResult = makeNode("output", { x: 1000, y: 60 }, { label: "Detection Result" });
  const ecbCipherOut = makeNode("output", { x: 1000, y: 260 }, { label: "Ciphertext (hex)", outputFormat: "hex" });
  const ecbDec = makeNode("aes", { x: 700, y: 460 }, { action: "decrypt", cipherMode: "ECB", label: "AES-ECB Decrypt" });
  const decOut = makeNode("output", { x: 1000, y: 460 }, { label: "Decrypted (verify)", outputFormat: "utf8" });

  return {
    name: "ECB Block Detection",
    nodes: [input, key, ecbEnc, ecbDetect, ecbResult, ecbCipherOut, ecbDec, decOut],
    edges: [
      { id: "e1", source: input.id, target: ecbEnc.id, targetHandle: "data", animated: true },
      { id: "e2", source: key.id, target: ecbEnc.id, targetHandle: "key", animated: true },
      { id: "e3", source: ecbEnc.id, target: ecbDetect.id, targetHandle: "data", animated: true },
      { id: "e4", source: ecbDetect.id, target: ecbResult.id, animated: true },
      { id: "e5", source: ecbEnc.id, target: ecbCipherOut.id, animated: true },
      { id: "e6", source: key.id, target: ecbDec.id, targetHandle: "key", animated: true },
      { id: "e7", source: ecbEnc.id, target: ecbDec.id, targetHandle: "data", animated: true },
      { id: "e8", source: ecbDec.id, target: decOut.id, animated: true },
    ],
  };
}

export function getShamirPreset(): WorkflowSeed {
  const secret = makeNode("input", { x: 50, y: 100 }, { text: "my-super-secret-password-123", label: "Original Secret" });
  const split = makeNode("shamirSplit", { x: 400, y: 100 }, { totalShares: 5, threshold: 3, label: "Shamir Split (3/5)" });
  const join = makeNode("shamirJoin", { x: 750, y: 100 }, { threshold: 3, label: "Shamir Join (3 shares)" });
  const out = makeNode("output", { x: 1050, y: 100 }, { label: "Recovered Secret" });
  const sharesOut = makeNode("output", { x: 1050, y: 300 }, { label: "Shares (JSON)" });

  return {
    name: "Shamir Split & Join",
    nodes: [secret, split, join, out, sharesOut],
    edges: [
      { id: "sh1", source: secret.id, target: split.id, targetHandle: "secret", animated: true },
      { id: "sh2", source: split.id, target: join.id, sourceHandle: "shares", targetHandle: "shares", animated: true },
      { id: "sh3", source: join.id, target: out.id, animated: true },
      { id: "sh4", source: split.id, target: sharesOut.id, sourceHandle: "shares", animated: true },
    ],
  };
}

export function getX509Preset(): WorkflowSeed {
  const pemInput = makeNode("input", { x: 50, y: 100 }, {
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
  });
  const parse = makeNode("x509Parse", { x: 400, y: 100 }, { label: "Parse X.509" });
  const out = makeNode("output", { x: 750, y: 100 }, { label: "Certificate Details" });

  return {
    name: "X.509 Certificate Parse",
    nodes: [pemInput, parse, out],
    edges: [
      { id: "x1", source: pemInput.id, target: parse.id, targetHandle: "pem", animated: true },
      { id: "x2", source: parse.id, target: out.id, animated: true },
    ],
  };
}

export function getJwkPreset(): WorkflowSeed {
  const pemInput = makeNode("input", { x: 50, y: 100 }, {
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
  });
  const convert = makeNode("jwkConvert", { x: 400, y: 100 }, { direction: "pemToJwk", label: "PEM → JWK" });
  const out = makeNode("output", { x: 750, y: 100 }, { label: "JWK Output" });

  return {
    name: "PEM to JWK Conversion",
    nodes: [pemInput, convert, out],
    edges: [
      { id: "j1", source: pemInput.id, target: convert.id, targetHandle: "keyData", animated: true },
      { id: "j2", source: convert.id, target: out.id, animated: true },
    ],
  };
}

export function getSshKeyPreset(): WorkflowSeed {
  const sshInput = makeNode("input", { x: 50, y: 100 }, {
    text: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGUAlR+H9yFoXODkzO4ClBjRnCwRBOAcL/uxOavdABq8 user@example.com",
    label: "SSH Public Key",
  });
  const parse = makeNode("sshKeyParse", { x: 400, y: 100 }, { label: "Parse SSH Key" });
  const out = makeNode("output", { x: 750, y: 100 }, { label: "Key Details" });

  return {
    name: "SSH Key Parse",
    nodes: [sshInput, parse, out],
    edges: [
      { id: "p1", source: sshInput.id, target: parse.id, targetHandle: "keyData", animated: true },
      { id: "p2", source: parse.id, target: out.id, animated: true },
    ],
  };
}

export const ALL_PRESETS: { label: string; seed: WorkflowSeed; keywords: string }[] = [
  { label: "RSA Signing Flow", seed: getRsaSignPreset(), keywords: "rsa sign verify signature" },
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
    label: "Hash Suite (4 algorithms)",
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
  { label: "ML-KEM Encapsulation", seed: getMlKemPreset(), keywords: "pqc ml-kem kyber kem encapsulate decapsulate post-quantum" },
  { label: "ML-DSA Sign & Verify", seed: getMlDsaPreset(), keywords: "pqc ml-dsa dilithium sign verify post-quantum" },
  { label: "SLH-DSA Sign & Verify", seed: getSlhDsaPreset(), keywords: "pqc slh-dsa sphincs sign verify hash-based" },
  { label: "secp256k1 Sign & Verify", seed: getSecp256k1Preset(), keywords: "secp256k1 bitcoin ethereum ecdsa sign verify" },
  { label: "secp256k1 ECDH Key Exchange", seed: getSecp256k1EcdhPreset(), keywords: "secp256k1 ecdh key exchange shared secret" },
  { label: "Ed448 Sign & Verify", seed: getEd448Preset(), keywords: "ed448 eddsa sign verify" },
  { label: "X448 Key Exchange", seed: getX448Preset(), keywords: "x448 diffie-hellman key exchange shared secret" },
  { label: "BLS12-381 Sign & Verify", seed: getBlsPreset(), keywords: "bls12-381 bls sign verify aggregate" },
  { label: "Diffie-Hellman Key Exchange", seed: getDhPreset(), keywords: "diffie hellman modp key exchange shared secret" },
  { label: "Frequency Analysis", seed: getFreqAnalysisPreset(), keywords: "frequency analysis entropy byte distribution" },
  { label: "ECB Block Detection", seed: getEcbDetectPreset(), keywords: "ecb block detection aes encryption analysis" },
  { label: "Shamir Split & Join", seed: getShamirPreset(), keywords: "shamir secret sharing split join threshold" },
  { label: "X.509 Certificate Parse", seed: getX509Preset(), keywords: "x509 certificate parse pem" },
  { label: "PEM to JWK Conversion", seed: getJwkPreset(), keywords: "jwk pem convert key format" },
  { label: "SSH Key Parse", seed: getSshKeyPreset(), keywords: "ssh public key parse authorized_keys" },
];
