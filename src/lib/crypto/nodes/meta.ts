import type { NodeKindMeta } from "../types";
import type { DataFormat } from "../service";

export const RSA_KEYGEN_META: NodeKindMeta = {
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
  inputs: [
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
      connectable: false,
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
      connectable: false,
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
      connectable: false,
    },
  ],
};

export const RSA_META: NodeKindMeta = {
  kind: "rsa",
  label: "RSA",
  category: "asymmetric",
  description: "RSA encrypt/decrypt. Supports RSA-OAEP, RSAES-PKCS1-V1_5, RAW.",
  defaultOutput: "base64",
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "publicKey",
      label: "Public Key",
      connectable: true,
      acceptTypes: ["pem", "base64"],
      visible: (d) => d["action"] !== "decrypt",
      type: "textarea",
      placeholder: "Paste SPKI public key...",
    },
    {
      id: "privateKey",
      label: "Private Key",
      connectable: true,
      acceptTypes: ["pem", "base64"],
      visible: (d) => d["action"] === "decrypt",
      type: "password",
      placeholder: "Paste PKCS8 private key...",
    },
    {
      id: "action",
      label: "Action",
      type: "select",
      defaultValue: "encrypt",
      options: [
        { label: "Encrypt", value: "encrypt" },
        { label: "Decrypt", value: "decrypt" },
      ],
      connectable: false,
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
      connectable: false,
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
      connectable: false,
    },
  ],
};

export const RSA_SIGN_META: NodeKindMeta = {
  kind: "rsa_sign",
  label: "RSA Sign",
  category: "asymmetric",
  description: "Digital signature generation using a private key.",
  defaultOutput: "base64",
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "privateKey",
      label: "Private Key",
      connectable: true,
      acceptTypes: ["pem", "base64"],
      type: "password",
      placeholder: "Paste PKCS8 private key...",
    },
    {
      id: "algorithm",
      label: "Algorithm",
      type: "select",
      defaultValue: "RSASSA-PKCS1-v1_5",
      options: [
        { label: "RSASSA-PKCS1-v1_5", value: "RSASSA-PKCS1-v1_5" },
        { label: "RSA-PSS", value: "RSA-PSS" },
      ],
      connectable: false,
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
      connectable: false,
    },
  ],
};

export const RSA_VERIFY_META: NodeKindMeta = {
  kind: "rsa_verify",
  label: "RSA Verify",
  category: "asymmetric",
  description: "Digital signature verification using a public key.",
  defaultOutput: "utf8",
  supportedFormats: ["utf8", "bool"],
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "signature",
      label: "Signature",
      connectable: true,
      acceptTypes: ["base64", "hex"],
    },
    {
      id: "publicKey",
      label: "Public Key",
      connectable: true,
      acceptTypes: ["pem", "base64"],
      type: "textarea",
      placeholder: "Paste SPKI public key...",
    },
    {
      id: "algorithm",
      label: "Algorithm",
      type: "select",
      defaultValue: "RSASSA-PKCS1-v1_5",
      options: [
        { label: "RSASSA-PKCS1-v1_5", value: "RSASSA-PKCS1-v1_5" },
        { label: "RSA-PSS", value: "RSA-PSS" },
      ],
      connectable: false,
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
      connectable: false,
    },
  ],
};

export const SM2_KEYGEN_META: NodeKindMeta = {
  kind: "sm2_keygen",
  label: "SM2 Key Gen",
  category: "asymmetric",
  description:
    "Generate an SM2 key pair (Chinese national elliptic curve standard, GB/T 32918-2016).",
  defaultOutput: "hex",
  outputs: [
    { id: "publicKey", label: "Public Key" },
    { id: "privateKey", label: "Private Key" },
  ],
};

export const SM2_SIGN_META: NodeKindMeta = {
  kind: "sm2_sign",
  label: "SM2 Sign",
  category: "asymmetric",
  description: "Sign data using an SM2 private key (SM2 signature with SM3 hash).",
  defaultOutput: "hex",
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "privateKey",
      label: "Private Key",
      connectable: true,
      acceptTypes: ["hex", "base64"],
      type: "password",
      placeholder: "64-char hex SM2 private key...",
    },
  ],
};

export const SM2_VERIFY_META: NodeKindMeta = {
  kind: "sm2_verify",
  label: "SM2 Verify",
  category: "asymmetric",
  description: "Verify an SM2 signature using an SM2 public key.",
  defaultOutput: "utf8",
  supportedFormats: ["utf8", "hex", "base64", "bool"],
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "signature",
      label: "Signature",
      connectable: true,
      acceptTypes: ["hex", "base64"],
    },
    {
      id: "publicKey",
      label: "Public Key",
      connectable: true,
      acceptTypes: ["hex", "base64"],
    },
  ],
};

export const SM2_ENCRYPT_META: NodeKindMeta = {
  kind: "sm2_encrypt",
  label: "SM2 Encrypt",
  category: "asymmetric",
  description: "Encrypt data using an SM2 public key.",
  defaultOutput: "hex",
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    { id: "publicKey", label: "Public Key", connectable: true, acceptTypes: ["hex", "base64"] },
  ],
};

export const SM2_DECRYPT_META: NodeKindMeta = {
  kind: "sm2_decrypt",
  label: "SM2 Decrypt",
  category: "asymmetric",
  description: "Decrypt data using an SM2 private key.",
  defaultOutput: "utf8",
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "privateKey",
      label: "Private Key",
      connectable: true,
      acceptTypes: ["hex", "base64"],
      type: "password",
      placeholder: "64-char hex SM2 private key...",
    },
  ],
};

export const PBKDF2_META: NodeKindMeta = {
  kind: "pbkdf2",
  label: "PBKDF2",
  category: "kdf",
  description: "Password-Based Key Derivation Function 2.",
  defaultOutput: "hex",
  inputs: [
    {
      id: "password",
      label: "Password",
      connectable: true,
      acceptTypes: ["utf8"],
      type: "text",
      placeholder: "Enter password...",
    },
    {
      id: "salt",
      label: "Salt",
      connectable: true,
      acceptTypes: ["hex", "base64"],
      type: "text",
      placeholder: "Hex string...",
    },
    {
      id: "iterations",
      label: "Iterations",
      type: "number",
      defaultValue: 100000,
      connectable: false,
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
      connectable: false,
    },
    {
      id: "length",
      label: "Derived Length (bits)",
      type: "number",
      defaultValue: 256,
      connectable: false,
    },
  ],
};

export const HKDF_META: NodeKindMeta = {
  kind: "hkdf",
  label: "HKDF",
  category: "kdf",
  description: "HMAC-based Extract-and-Expand Key Derivation Function.",
  defaultOutput: "hex",
  inputs: [
    {
      id: "ikm",
      label: "IKM (Input Keying Material)",
      connectable: true,
      acceptTypes: ["hex", "base64"],
    },
    { id: "salt", label: "Salt", connectable: true, acceptTypes: ["hex", "base64"] },
    { id: "info", label: "Info", connectable: true, acceptTypes: ["hex", "base64"] },
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
      connectable: false,
    },
    {
      id: "length",
      label: "Derived Length (bits)",
      type: "number",
      defaultValue: 256,
      connectable: false,
    },
  ],
};

export const ARGON2_META: NodeKindMeta = {
  kind: "argon2",
  label: "Argon2",
  category: "kdf",
  description: "Memory-hard password hashing (PHC winner).",
  defaultOutput: "hex",
  inputs: [
    { id: "password", label: "Password", connectable: true, acceptTypes: ["utf8"] },
    { id: "salt", label: "Salt", connectable: true, acceptTypes: ["hex", "base64"] },
    {
      id: "type",
      label: "Type",
      type: "select",
      defaultValue: "id",
      options: [
        { label: "Argon2id", value: "id" },
        { label: "Argon2i", value: "i" },
        { label: "Argon2d", value: "d" },
      ],
      connectable: false,
    },
    { id: "t", label: "Iterations (t)", type: "number", defaultValue: 3, connectable: false },
    { id: "m", label: "Memory (KB)", type: "number", defaultValue: 65536, connectable: false },
    { id: "p", label: "Parallelism (p)", type: "number", defaultValue: 1, connectable: false },
    {
      id: "length",
      label: "Derived Length (bytes)",
      type: "number",
      defaultValue: 32,
      connectable: false,
    },
  ],
};

export const SCRYPT_META: NodeKindMeta = {
  kind: "scrypt",
  label: "Scrypt",
  category: "kdf",
  description: "Memory-hard key derivation function.",
  defaultOutput: "hex",
  inputs: [
    { id: "password", label: "Password", connectable: true, acceptTypes: ["utf8"] },
    { id: "salt", label: "Salt", connectable: true, acceptTypes: ["hex", "base64"] },
    { id: "N", label: "Cost (N)", type: "number", defaultValue: 16384, connectable: false },
    { id: "r", label: "Block Size (r)", type: "number", defaultValue: 8, connectable: false },
    { id: "p", label: "Parallelism (p)", type: "number", defaultValue: 1, connectable: false },
    {
      id: "length",
      label: "Derived Length (bytes)",
      type: "number",
      defaultValue: 32,
      connectable: false,
    },
  ],
};

export const BCRYPT_META: NodeKindMeta = {
  kind: "bcrypt",
  label: "bcrypt",
  category: "kdf",
  description: "Password hashing function (bcrypt). Output is $2b$ encoded hash string.",
  defaultOutput: "utf8",
  supportedFormats: ["utf8", "bool"],
  inputs: [
    { id: "password", label: "Password", connectable: true, acceptTypes: ["utf8"] },
    { id: "salt", label: "Salt", connectable: true, acceptTypes: ["utf8"] },
    {
      id: "hash",
      label: "Hash to Verify",
      connectable: true,
      acceptTypes: ["utf8"],
      type: "text",
      placeholder: "$2b$10$...",
      visible: (d) => (d["action"] as string) === "verify",
    },
    { id: "rounds", label: "Cost (rounds)", type: "number", defaultValue: 10, connectable: false },
    {
      id: "action",
      label: "Action",
      type: "select",
      defaultValue: "hash",
      options: [
        { label: "Hash", value: "hash" },
        { label: "Verify", value: "verify" },
      ],
      connectable: false,
    },
  ],
};

function makeHashMeta(kind: string, label: string, description: string): NodeKindMeta {
  return {
    kind,
    label,
    category: "hash",
    description,
    defaultOutput: "hex" as DataFormat,
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  };
}

export const SHA224_META = makeHashMeta(
  "sha224",
  "SHA-224",
  "SHA-224 digest (SHA-2 family, 224-bit output).",
);
export const SHA3224_META = makeHashMeta(
  "sha3224",
  "SHA3-224",
  "SHA3-224 digest (Keccak-based, 224-bit output).",
);
export const SHA1_META = makeHashMeta("sha1", "SHA-1", "SHA-1 digest.");
export const SHA256_META = makeHashMeta("sha256", "SHA-256", "SHA-256 digest.");
export const SHA384_META = makeHashMeta("sha384", "SHA-384", "SHA-384 digest.");
export const SHA512_META = makeHashMeta("sha512", "SHA-512", "SHA-512 digest.");
export const MD5_META = makeHashMeta("md5", "MD5", "Legacy MD5 digest.");
export const SHA3256_META = makeHashMeta("sha3256", "SHA3-256", "SHA3-256 digest.");
export const SHA3384_META = makeHashMeta("sha3384", "SHA3-384", "SHA3-384 digest.");
export const SHA3512_META = makeHashMeta("sha3512", "SHA3-512", "SHA3-512 digest.");
export const KECCAK256_META = makeHashMeta(
  "keccak256",
  "Keccak-256",
  "Keccak-256 digest (Ethereum standard).",
);
export const BLAKE2B_META = makeHashMeta(
  "blake2b",
  "BLAKE2B",
  "BLAKE2b hash (optimized for 64-bit platforms).",
);
export const BLAKE2S_META: NodeKindMeta = {
  kind: "blake2s",
  label: "BLAKE2S",
  category: "hash",
  description: "BLAKE2s hash (optimized for 8/32-bit platforms). Supports variable output length.",
  defaultOutput: "hex",
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "outputLength",
      label: "Output Length",
      type: "number",
      defaultValue: 32,
      connectable: false,
    },
  ],
};
export const BLAKE3_META = makeHashMeta(
  "blake3",
  "BLAKE3",
  "BLAKE3 hash (extremely fast, tree-structured).",
);
export const RIPEMD160_META = makeHashMeta(
  "ripemd160",
  "RIPEMD-160",
  "RIPEMD-160 digest (160-bit hash).",
);
export const SHAKE128_META = makeHashMeta("shake128", "SHAKE128", "SHAKE128 XOF (32-byte output).");
export const SHAKE256_META = makeHashMeta("shake256", "SHAKE256", "SHAKE256 XOF (64-byte output).");
export const SM3_META = makeHashMeta(
  "sm3",
  "SM3",
  "SM3 (Chinese national hash standard, GB/T 32905-2016).",
);
export const WHIRLPOOL_META = makeHashMeta(
  "whirlpool",
  "Whirlpool",
  "Whirlpool cryptographic hash (ISO/IEC 10118-3).",
);
export const SHA0_META = makeHashMeta("sha0", "SHA-0", "Legacy SHA-0 hash function.");

export const EC_KEYGEN_META: NodeKindMeta = {
  kind: "ec_keygen",
  label: "EC Key Gen",
  category: "asymmetric",
  description: "Generate an Elliptic Curve key pair.",
  defaultOutput: "pem",
  outputs: [
    { id: "publicKey", label: "Public Key" },
    { id: "privateKey", label: "Private Key" },
  ],
  inputs: [
    {
      id: "algorithm",
      label: "Algorithm",
      type: "select",
      defaultValue: "ECDSA",
      options: [
        { label: "ECDSA", value: "ECDSA" },
        { label: "ECDH", value: "ECDH" },
      ],
      connectable: false,
    },
    {
      id: "namedCurve",
      label: "Curve",
      type: "select",
      defaultValue: "P-256",
      options: [
        { label: "P-256", value: "P-256" },
        { label: "P-384", value: "P-384" },
        { label: "P-521", value: "P-521" },
      ],
      connectable: false,
    },
  ],
};

export const ECDSA_SIGN_META: NodeKindMeta = {
  kind: "ecdsa_sign",
  label: "ECDSA Sign",
  category: "asymmetric",
  description: "Sign data using an ECDSA private key.",
  defaultOutput: "base64",
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "privateKey",
      label: "Private Key",
      connectable: true,
      acceptTypes: ["base64", "pem"],
    },
    {
      id: "namedCurve",
      label: "Curve",
      type: "select",
      defaultValue: "P-256",
      options: [
        { label: "P-256", value: "P-256" },
        { label: "P-384", value: "P-384" },
        { label: "P-521", value: "P-521" },
      ],
      connectable: false,
    },
    {
      id: "hash",
      label: "Hash",
      type: "select",
      defaultValue: "SHA-256",
      options: [
        { label: "SHA-256", value: "SHA-256" },
        { label: "SHA-384", value: "SHA-384" },
        { label: "SHA-512", value: "SHA-512" },
      ],
      connectable: false,
    },
  ],
};

export const ECDSA_VERIFY_META: NodeKindMeta = {
  kind: "ecdsa_verify",
  label: "ECDSA Verify",
  category: "asymmetric",
  description: "Verify data signature using an ECDSA public key.",
  defaultOutput: "utf8",
  supportedFormats: ["utf8", "bool"],
  inputs: [
    { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
    {
      id: "signature",
      label: "Signature",
      connectable: true,
      acceptTypes: ["base64", "hex"],
    },
    {
      id: "publicKey",
      label: "Public Key",
      connectable: true,
      acceptTypes: ["base64", "pem"],
    },
    {
      id: "namedCurve",
      label: "Curve",
      type: "select",
      defaultValue: "P-256",
      options: [
        { label: "P-256", value: "P-256" },
        { label: "P-384", value: "P-384" },
        { label: "P-521", value: "P-521" },
      ],
      connectable: false,
    },
    {
      id: "hash",
      label: "Hash",
      type: "select",
      defaultValue: "SHA-256",
      options: [
        { label: "SHA-256", value: "SHA-256" },
        { label: "SHA-384", value: "SHA-384" },
        { label: "SHA-512", value: "SHA-512" },
      ],
      connectable: false,
    },
  ],
};

export const ECDH_META: NodeKindMeta = {
  kind: "ecdh",
  label: "ECDH Derive",
  category: "asymmetric",
  description: "Derive bits using ECDH (Elliptic Curve Diffie-Hellman).",
  defaultOutput: "hex",
  inputs: [
    {
      id: "privateKey",
      label: "My Private Key",
      connectable: true,
      acceptTypes: ["base64", "pem"],
    },
    {
      id: "publicKey",
      label: "Peer Public Key",
      connectable: true,
      acceptTypes: ["base64", "pem"],
    },
    {
      id: "namedCurve",
      label: "Curve",
      type: "select",
      defaultValue: "P-256",
      options: [
        { label: "P-256", value: "P-256" },
        { label: "P-384", value: "P-384" },
        { label: "P-521", value: "P-521" },
      ],
      connectable: false,
    },
    {
      id: "length",
      label: "Derived Length (bits)",
      type: "number",
      defaultValue: 256,
      connectable: false,
    },
  ],
};
