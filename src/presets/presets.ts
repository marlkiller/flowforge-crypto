import { makeNode } from "@/lib/crypto/factory";
import type { WorkflowSeed } from "./seeds";

export function getRsaSignPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 200 }, { text: "hello world", label: "Message" });
  const keyGen = makeNode("rsa_keygen", { x: 50, y: 50 }, { algorithm: "RSASSA-PKCS1-v1_5", label: "RSA Key Pair" });
  const rsaSign = makeNode("rsa_sign", { x: 450, y: 50 }, { algorithm: "RSASSA-PKCS1-v1_5", hash: "SHA-256", label: "RSA Sign" });
  const rsaVerify = makeNode("rsa_verify", { x: 850, y: 50 }, { algorithm: "RSASSA-PKCS1-v1_5", hash: "SHA-256", label: "RSA Verify" });
  const out = makeNode("output", { x: 1250, y: 150 }, { label: "Result" });

  return {
    name: "RSA Signing Flow",
    nodes: [input, keyGen, rsaSign, rsaVerify, out],
    edges: [
      { id: "p1", source: input.id, target: rsaSign.id, targetHandle: "data", animated: true },
      { id: "p2", source: keyGen.id, target: rsaSign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "p3", source: input.id, target: rsaVerify.id, targetHandle: "data", animated: true },
      { id: "p4", source: rsaSign.id, target: rsaVerify.id, targetHandle: "signature", animated: true },
      { id: "p5", source: keyGen.id, target: rsaVerify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "p6", source: rsaVerify.id, target: out.id, animated: true },
    ],
  };
}

export function getAesGcmPreset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode("input", { x: 50, y: 200 }, { text: "12345678901234567890123456789012", inputFormat: "hex", outputFormat: "hex", label: "Shared Key (Hex)" });
  const srcIv = makeNode("input", { x: 50, y: 350 }, { text: "12345678901234567890123456789012", inputFormat: "hex", outputFormat: "hex", label: "Initial IV (Hex)" });

  const aesEnc = makeNode("aes", { x: 400, y: 50 }, { action: "encrypt", cipherMode: "GCM", label: "AES-GCM Encrypt" });
  const aesDec = makeNode("aes", { x: 750, y: 50 }, { action: "decrypt", cipherMode: "GCM", label: "AES-GCM Decrypt" });
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
  const payload = makeNode("input", { x: 50, y: 50 }, { text: '{"sub": "1234567890", "name": "John Doe", "admin": true}', label: "JWT Payload" });
  const secret = makeNode("input", { x: 50, y: 250 }, { text: "super-secret-key-that-is-at-least-32-bytes-long", label: "Secret Key" });

  const jwtSign = makeNode("jwt_sign", { x: 450, y: 50 }, { algorithm: "HS256", label: "JWT Sign" });
  const jwtVerify = makeNode("jwt_verify", { x: 850, y: 50 }, { algorithm: "HS256", label: "JWT Verify" });
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
  const keyGen = makeNode("ec_keygen", { x: 50, y: 50 }, { algorithm: "ECDSA", namedCurve: "P-256", label: "EC Key Pair" });
  const sign = makeNode("ecdsa_sign", { x: 450, y: 50 }, { namedCurve: "P-256", hash: "SHA-256", label: "ECDSA Sign" });
  const verify = makeNode("ecdsa_verify", { x: 850, y: 50 }, { namedCurve: "P-256", hash: "SHA-256", label: "ECDSA Verify" });
  const out = makeNode("output", { x: 1250, y: 150 }, { label: "Result" });

  return {
    name: "ECDSA Sign & Verify",
    nodes: [input, keyGen, sign, verify, out],
    edges: [
      { id: "e1", source: input.id, target: sign.id, targetHandle: "data", animated: true },
      { id: "e2", source: keyGen.id, target: sign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "e3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "e4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      { id: "e5", source: keyGen.id, target: verify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "e6", source: verify.id, target: out.id, animated: true },
    ],
  };
}

export function getHmacPreset(): WorkflowSeed {
  const input = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Message" });
  const key = makeNode("input", { x: 50, y: 200 }, { text: "secret-key", label: "Secret Key" });
  const hmacSign = makeNode("hmac", { x: 400, y: 50 }, { action: "sign", hash: "SHA-256", label: "HMAC Sign" });
  const hmacVerify = makeNode("hmac", { x: 750, y: 50 }, { action: "verify", hash: "SHA-256", label: "HMAC Verify" });
  const out = makeNode("output", { x: 1100, y: 50 }, { label: "Result" });

  return {
    name: "HMAC Sign & Verify",
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

export function getKdfAesPreset(): WorkflowSeed {
  const password = makeNode("input", { x: 50, y: 50 }, { text: "my-password", label: "Password" });
  const salt = makeNode("input", { x: 50, y: 200 }, { text: "random-salt", label: "Salt" });
  const data = makeNode("input", { x: 350, y: 350 }, { text: "secret data", label: "Data to Encrypt" });
  const pbkdf2 = makeNode("pbkdf2", { x: 350, y: 50 }, { iterations: 100000, label: "PBKDF2" });
  const aesEnc = makeNode("aes", { x: 700, y: 50 }, { action: "encrypt", cipherMode: "CBC", label: "AES Encrypt" });
  const aesDec = makeNode("aes", { x: 1000, y: 50 }, { action: "decrypt", cipherMode: "CBC", label: "AES Decrypt" });
  const out = makeNode("output", { x: 1300, y: 150 }, { label: "Decrypted" });

  return {
    name: "KDF (PBKDF2) + AES Encrypt/Decrypt",
    nodes: [password, salt, data, pbkdf2, aesEnc, aesDec, out],
    edges: [
      { id: "k1", source: password.id, target: pbkdf2.id, targetHandle: "password", animated: true },
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
  const srcKey = makeNode("input", { x: 50, y: 200 }, { text: "12345678901234567890123456789012", inputFormat: "hex", outputFormat: "hex", label: "Shared Key (Hex)" });
  const srcIv = makeNode("input", { x: 50, y: 350 }, { text: "12345678901234567890123456789012", inputFormat: "hex", outputFormat: "hex", label: "Initial IV (Hex)" });
  const aesEnc = makeNode("aes", { x: 400, y: 50 }, { action: "encrypt", cipherMode: "CBC", padding: "PKCS7", label: "AES-CBC Encrypt" });
  const aesDec = makeNode("aes", { x: 750, y: 50 }, { action: "decrypt", cipherMode: "CBC", padding: "PKCS7", label: "AES-CBC Decrypt" });
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
      { id: "e2", source: keyGen.id, target: sign.id, sourceHandle: "privateKey", targetHandle: "privateKey", animated: true },
      { id: "e3", source: input.id, target: verify.id, targetHandle: "data", animated: true },
      { id: "e4", source: sign.id, target: verify.id, targetHandle: "signature", animated: true },
      { id: "e5", source: keyGen.id, target: verify.id, sourceHandle: "publicKey", targetHandle: "publicKey", animated: true },
      { id: "e6", source: verify.id, target: out.id, animated: true },
    ],
  };
}

export function getChaCha20Preset(): WorkflowSeed {
  const srcData = makeNode("input", { x: 50, y: 50 }, { text: "hello world", label: "Plaintext" });
  const srcKey = makeNode("input", { x: 50, y: 200 }, { text: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", inputFormat: "hex", outputFormat: "hex", label: "Key (Hex)" });
  const srcNonce = makeNode("input", { x: 50, y: 350 }, { text: "0123456789abcdef01234567", inputFormat: "hex", outputFormat: "hex", label: "Nonce (Hex)" });
  const enc = makeNode("chacha20poly1305", { x: 400, y: 50 }, { action: "encrypt", label: "ChaCha20 Encrypt" });
  const dec = makeNode("chacha20poly1305", { x: 750, y: 50 }, { action: "decrypt", label: "ChaCha20 Decrypt" });
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
  const password = makeNode("input", { x: 50, y: 50 }, { text: "correct horse battery staple", label: "Password" });
  const salt = makeNode("input", { x: 50, y: 200 }, { text: "salt-is-not-secret", label: "Salt" });
  const argon2 = makeNode("argon2", { x: 400, y: 100 }, { t: 3, m: 65536, p: 1, label: "Argon2id" });
  const out = makeNode("output", { x: 750, y: 100 }, { label: "Derived Key", outputFormat: "hex" });

  return {
    name: "Argon2 (Password Hash)",
    nodes: [password, salt, argon2, out],
    edges: [
      { id: "a1", source: password.id, target: argon2.id, targetHandle: "password", animated: true },
      { id: "a2", source: salt.id, target: argon2.id, targetHandle: "salt", animated: true },
      { id: "a3", source: argon2.id, target: out.id, animated: true },
    ],
  };
}

export function getTOTPPreset(): WorkflowSeed {
  const secret = makeNode("input", { x: 50, y: 150 }, { text: "NBSWY3DPFQQFO33SNRSCC===", label: "Base32 Secret" });
  const b32Decode = makeNode("base32", { x: 350, y: 150 }, { mode: "decode", label: "Decode Secret", outputFormat: "utf8" });
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

export const ALL_PRESETS: { label: string; seed: WorkflowSeed; keywords: string }[] = [
  { label: "RSA Signing Flow", seed: getRsaSignPreset(), keywords: "rsa sign verify signature" },
  { label: "AES-GCM Encrypt/Decrypt", seed: getAesGcmPreset(), keywords: "aes gcm encrypt decrypt aead" },
  { label: "AES-CBC Encrypt/Decrypt", seed: getAesCbcPreset(), keywords: "aes cbc encrypt decrypt" },
  { label: "ChaCha20-Poly1305 Encrypt/Decrypt", seed: getChaCha20Preset(), keywords: "chacha20 poly1305 encrypt decrypt aead" },
  { label: "ECDSA Sign & Verify", seed: getEcdsaPreset(), keywords: "ecdsa ecc sign verify" },
  { label: "Ed25519 Sign & Verify", seed: getEd25519Preset(), keywords: "ed25519 eddsa sign verify" },
  { label: "JWT Sign & Verify", seed: getJwtPreset(), keywords: "jwt token sign verify" },
  { label: "HMAC Sign & Verify", seed: getHmacPreset(), keywords: "hmac mac sign verify" },
  { label: "Hash Suite (4 algorithms)", seed: getHashSuitePreset(), keywords: "hash sha256 sha3 blake3 sm3" },
  { label: "KDF (PBKDF2) + AES", seed: getKdfAesPreset(), keywords: "kdf pbkdf2 key derivation aes" },
  { label: "Argon2 (Password Hash)", seed: getArgon2Preset(), keywords: "argon2 password hash kdf memory hard" },
  { label: "TOTP Authenticator", seed: getTOTPPreset(), keywords: "totp otp authenticator 2fa" },
];
