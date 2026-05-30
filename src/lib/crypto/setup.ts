// Triggers all node self-registrations via module evaluation.
// Must be imported early in the app, before any code that reads NODE_REGISTRY.

import "./providers";

// ─── Immediate Loading Nodes (Lightweight) ───────────────────────
import "./nodes/io";
import "./nodes/string";
import "./nodes/encoding";
import "./nodes/cipher";
import "./nodes/mac";
import "./nodes/eddsa";
import "./nodes/otp";
import "./nodes/jwt";
import "./nodes/entropy";
import "./nodes/legacy";
import "./nodes/bitwise";

// ─── Lazy Loading Nodes (Heavyweight or Bundled) ─────────────────
import { registerLazyNode } from "./registry";
import {
  RSA_KEYGEN_META,
  RSA_META,
  RSA_SIGN_META,
  RSA_VERIFY_META,
  SM2_KEYGEN_META,
  SM2_SIGN_META,
  SM2_VERIFY_META,
  SM2_ENCRYPT_META,
  SM2_DECRYPT_META,
  PBKDF2_META,
  HKDF_META,
  ARGON2_META,
  SCRYPT_META,
  BCRYPT_META,
  SHA1_META,
  SHA256_META,
  SHA384_META,
  SHA512_META,
  MD5_META,
  SHA3256_META,
  SHA3384_META,
  SHA3512_META,
  KECCAK256_META,
  BLAKE2B_META,
  BLAKE2S_META,
  BLAKE3_META,
  RIPEMD160_META,
  SHAKE128_META,
  SHAKE256_META,
  SM3_META,
  WHIRLPOOL_META,
  SHA0_META,
  EC_KEYGEN_META,
  ECDSA_SIGN_META,
  ECDSA_VERIFY_META,
  ECDH_META,
} from "./nodes/meta";

// RSA
registerLazyNode("rsa_keygen", RSA_KEYGEN_META, () => import("./nodes/rsa"));
registerLazyNode("rsa", RSA_META, () => import("./nodes/rsa"));
registerLazyNode("rsa_sign", RSA_SIGN_META, () => import("./nodes/rsa"));
registerLazyNode("rsa_verify", RSA_VERIFY_META, () => import("./nodes/rsa"));

// SM2
registerLazyNode("sm2_keygen", SM2_KEYGEN_META, () => import("./nodes/sm"));
registerLazyNode("sm2_sign", SM2_SIGN_META, () => import("./nodes/sm"));
registerLazyNode("sm2_verify", SM2_VERIFY_META, () => import("./nodes/sm"));
registerLazyNode("sm2_encrypt", SM2_ENCRYPT_META, () => import("./nodes/sm"));
registerLazyNode("sm2_decrypt", SM2_DECRYPT_META, () => import("./nodes/sm"));

// KDF
registerLazyNode("pbkdf2", PBKDF2_META, () => import("./nodes/kdf"));
registerLazyNode("hkdf", HKDF_META, () => import("./nodes/kdf"));
registerLazyNode("argon2", ARGON2_META, () => import("./nodes/kdf"));
registerLazyNode("scrypt", SCRYPT_META, () => import("./nodes/kdf"));
registerLazyNode("bcrypt", BCRYPT_META, () => import("./nodes/kdf"));

// ECC
registerLazyNode("ec_keygen", EC_KEYGEN_META, () => import("./nodes/ecc"));
registerLazyNode("ecdsa_sign", ECDSA_SIGN_META, () => import("./nodes/ecc"));
registerLazyNode("ecdsa_verify", ECDSA_VERIFY_META, () => import("./nodes/ecc"));
registerLazyNode("ecdh", ECDH_META, () => import("./nodes/ecc"));

// Hashes
const hashMetas = [
  SHA1_META,
  SHA256_META,
  SHA384_META,
  SHA512_META,
  MD5_META,
  SHA3256_META,
  SHA3384_META,
  SHA3512_META,
  KECCAK256_META,
  BLAKE2B_META,
  BLAKE2S_META,
  BLAKE3_META,
  RIPEMD160_META,
  SHAKE128_META,
  SHAKE256_META,
  SM3_META,
  WHIRLPOOL_META,
  SHA0_META,
];

hashMetas.forEach((meta) => {
  registerLazyNode(meta.kind, meta, () => import("./nodes/hash"));
});
