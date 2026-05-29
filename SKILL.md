# FlowForge Crypto Node Development Guide

## Architecture Overview

```
registerNodeDef("node_kind", NodeDef)
                  │
      ┌───────────┴───────────────┐
      │         NodeDef            │
      │  ┌──────────────────────┐  │
      │  │ NodeKindMeta (UI)     │  │
      │  │ NodeRunner (runtime)  │  │
      │  └──────────────────────┘  │
      └───────────────────────────┘
                  │
   NODE_REGISTRY  │  (live Record<string, NodeDef>)
   NODE_KIND_META │  (live Record<string, NodeKindMeta>)
```

### Core Types

| Type | File | Purpose |
|------|------|---------|
| `NodeDef` | `types.ts:82` | Pair of meta (UI) + runner (runtime) |
| `NodeKindMeta` | `types.ts:30` | Category, label, inputs, outputs, fields |
| `NodeInputMeta` | `types.ts:8` | Wire input handle: `id`, `label`, `visible?` |
| `NodeOutputMeta` | `types.ts:14` | Wire output handle: `id`, `label`, `visible?` |
| `NodeFieldMeta` | `types.ts:20` | Inspector panel field: `id`, `label`, `type`, etc. |
| `NodeRunner` | `types.ts:74` | `(node, inputs) → Uint8Array | Record<string, Uint8Array>` |
| `GraphNode` | `types.ts:51` | ReactFlow node with `data: NodeData` |

## Node Definition Standards

### `meta` Fields

```typescript
meta: {
  kind: string;           // unique identifier, kebab-case
  label: string;          // human-readable name
  category: string;       // one of: io | string | encoding | hash | cipher |
                          //         asymmetric | mac | kdf | entropy | protocol | legacy
  description: string;    // tooltip / palette description
  defaultOutput?: DataFormat;  // "utf8" | "hex" | "base64" | "pem" | "base32" | "base58"
  supportedFormats?: DataFormat[];
  inputs?: NodeInputMeta[];    // wire input handles
  outputs?: NodeOutputMeta[];  // wire output handles (keygen nodes only)
  fields?: NodeFieldMeta[];    // inspector panel fields
}
```

### `inputs` (Wire Handles)

Rules:
- **Data payload**: use `id: "data"`, no matching field → orphan, wire-only
- **Keys / secrets**: use semantic `id` (e.g. `"privateKey"`, `"publicKey"`, `"key"`, `"secret"`)
- **Config parameters**: do NOT put in inputs (use `fields` only)
- **Format annotation**: append to label in parentheses, e.g. `"Signature (base64)"`

Convention for format annotations:

| Input Type | Annotation |
|-----------|-----------|
| RSA/EC/EdDSA private key | `(PEM)` |
| RSA/EC/EdDSA public key | `(PEM)` |
| SM2 private/public key | `(hex)` |
| Symmetric key | `(Hex)` or `(base64)` |
| Signature (RSA, ECDSA, EdDSA) | `(base64)` |
| Signature (MAC, SM2, CMAC) | `(hex)` |
| Password / plaintext | `(utf8)` |
| Salt / IV / nonce | `(hex)` |
| OTP secret | `(base32)` |
| Data payload | no annotation |

### `fields` (Inspector Panel)

| Type | Usage | Value in Runner |
|------|-------|----------------|
| `"text"` | Short text input | `node.data["id"] as string` |
| `"password"` | Secret key entry | `node.data["id"] as string` → `getParamBytes()` |
| `"textarea"` | Multi-line (PEM keys) | `node.data["id"] as string` |
| `"select"` | Dropdown | `node.data["id"] as string` |
| `"number"` | Numeric | `parseInt(node.data["id"] as string, 10)` |

Field `visible` predicate uses `(d) => d["fieldId"] === "value"`.

### Input/Field Matching

An input handle **matches** a field when they share the same `id`. This gives the user two options:
1. Wire a value from another node (input handle)
2. Type a value in the inspector panel (field)

**getParamBytes(node, inputs, id)** implements the fallback:
```
inputs[id] (wire) → node.data[id] (field hex/b64/PEM) → throw
```

**When to add a matching field:**
- Keys / secrets that are short text (hex, base64, PEM)
- Passwords and salts
- Signatures for verify-mode nodes
- Not needed for: `data` payloads (too large), config-only fields like hash algorithm

### `outputs` (Wire Handles)

Most nodes use implicit `{ default: result }` — no `outputs` declaration needed.

Only **multi-output nodes** declare `outputs`:
- Key generators: `[{ id: "publicKey", label: "Public Key" }, { id: "privateKey", label: "Private Key" }]`
- Runner must return `Record<string, Uint8Array>` instead of a single `Uint8Array`

## Registration System

Every node must call **`registerNodeDef(kind, def)`** at module evaluation time.

```typescript
// nodes/my_algo.ts
import { registerNodeDef } from "../registry";

registerNodeDef("my_algo", {
  meta: { kind: "my_algo", label: "My Algo", category: "hash", ... },
  runner: async (node, inputs) => { ... },
});
```

The registry collects all definitions via side-effect imports:
```typescript
// registry.ts
import "./nodes/my_algo";  // triggers registerNodeDef()
```

**No need to modify registry.ts when adding a new node file.** Just import it.

## Adding a New Node — Step by Step

### 1. Choose the implementation pattern

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Direct library** | Simple operation, single library call | EdDSA: `ed25519.sign()` |
| **Provider + lookup** | Algorithm has multiple variants selected by field | Hash: `getProvider("SHA-256")` |
| **CryptoService** | Wraps WebCrypto | ECDSA: `CryptoService.sign()` |
| **Custom helper** | NodeDef factory for repeated pattern | `makeHashNode()`, `makeMacNode()` |

Prefer the simplest pattern. Provider is optional.

### 2. Create the node file

```typescript
// src/lib/crypto/nodes/my_algo.ts
import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { getParamBytes } from "../utils";

registerNodeDef("my_algo", {
  meta: {
    kind: "my_algo",
    label: "My Algorithm",
    category: "cipher",        // choose from defined categories
    description: "What it does.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data" },
      { id: "key", label: "Key (Hex)" },
    ],
    fields: [
      { id: "key", label: "Key (Hex)", type: "password" },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const key = getParamBytes(node as GraphNode, inputs, "key");
    // ... do something
    return result;  // Uint8Array or Record<string, Uint8Array>
  },
});
```

### 3. Register the file

```typescript
// registry.ts — add one line:
import "./nodes/my_algo";
```

### 4. Add new category (if needed)

```typescript
// registry.ts — CATEGORY_META:
export const CATEGORY_META: Record<string, CategoryMeta> = {
  my_new_cat: {
    label: "My Category",
    accent: "text-green-300",
    chip: "bg-green-500/15 text-green-300 border-green-500/40",
    dot: "bg-green-400",
  },
};
```

## Runner Implementation Patterns

### Single output (most nodes)
```typescript
runner: async (node, inputs): Promise<Uint8Array> => {
  return new Uint8Array([1, 2, 3]);
}
```

### Multi-output (keygen)
```typescript
runner: async (node, inputs): Promise<Record<string, Uint8Array>> => {
  return { publicKey, privateKey };
}
```

### Reading field values
```typescript
// String field
const hash = (node.data["hash"] as string) ?? "SHA-256";

// Number field
const length = parseInt((node.data["length"] as string) ?? "256", 10);

// Select field
const mode = (node.data["mode"] as string) ?? "encrypt";

// Bytes via param (wire or field)
const key = getParamBytes(node as GraphNode, inputs, "key");
```

### Error handling
```typescript
if (!keyBytes) throw new Error("Key is required");

try {
  return provider.encrypt(keyBytes, data);
} catch (e) {
  throw new Error(`Encrypt failed: ${(e as Error).message}`);
}
```

## Provider System (Optional Layer)

Providers wrap crypto algorithm implementations with a uniform interface. Defined in `service.ts`.

### Provider Interfaces

| Interface | Type | Methods |
|-----------|------|---------|
| `HashProvider` | `"hash"` | `digest(data)` |
| `CipherProvider` | `"cipher"` | `encrypt(key, iv, data)`, `decrypt(key, iv, data)` |
| `MacProvider` | `"mac"` | `sign(key, data)`, `verify(key, signature, data)` |
| `KdfProvider` | `"kdf"` | `derive(password, salt, length)` |
| `RsaProvider` | `"rsa"` | `encrypt(key, data)`, `decrypt(key, data)` |

### When to create a Provider
- When the same algorithm is used by multiple nodes (e.g. SHA-256 for hash + HMAC)
- When you want a lookup-by-name mechanism (`getProvider("AES-GCM")`)

### When NOT to create a Provider
- One-off operation that calls a single library function
- The runner is simpler without it (e.g. `ed25519.sign(data, key)`)

A Provider is always consumed via `getProvider(name)` inside a runner. Provider registration happens as a side-effect:

```typescript
registerProvider({
  type: "hash",
  name: "MyHash",
  async digest(data) { return myHash(data); },
});
```

## Category Reference

| Category | Label | Theme Color | Nodes |
|----------|-------|-----------|-------|
| `io` | I/O | sky | input, file, join, output, slice |
| `string` | String | purple | uppercase, lowercase, reverse, trim, length |
| `encoding` | Encoding | amber | base64, hex, url, base32, base58 |
| `hash` | Hash | emerald | sha1, sha256, sha384, sha512, md5, sha3*, keccak*, blake*, ripemd160, shake*, sm3 |
| `cipher` | Symmetric | rose | aes, sm4, chacha20poly1305, xchacha20poly1305, aesGcmSiv |
| `asymmetric` | Asymmetric | indigo | rsa_keygen, rsa, rsa_sign, rsa_verify, ec_keygen, ecdsa_sign, ecdsa_verify, ecdh, ed_keygen, ed_sign, ed_verify, x25519_derive, sm2_* |
| `mac` | MAC | cyan | hmac, poly1305, cmac |
| `kdf` | KDF | orange | pbkdf2, hkdf, argon2, scrypt, bcrypt |
| `entropy` | Entropy | lime | random, keyGen |
| `protocol` | Protocol | blue | totp, hotp, jwt_sign, jwt_verify |
| `legacy` | Legacy | zinc | des, tripledes |

## File Structure

```
src/lib/crypto/
├── types.ts          — All type definitions (NodeDef, NodeKindMeta, etc.)
├── registry.ts       — registerNodeDef(), NODE_REGISTRY, NODE_KIND_META, CATEGORY_META
├── service.ts        — DataFormat converters, Provider interfaces, registerProvider/getProvider, CryptoService
├── executor.ts       — executeGraph(), executeNode(), ExecutionError
├── executor.worker.ts— Web Worker wrapper
├── topoSort.ts       — Kahn's algorithm topological sort
├── factory.ts        — makeNode() for creating GraphNode instances
├── utils.ts          — getParamBytes(), parseAs(), safeDecode()
├── hash.ts           — SHA-0, Whirlpool implementations
├── hmac.ts           — hmacCore(), makeNobleHmacProvider()
├── share.ts          — Workflow share encoding
├── providers.ts      — (TODO) centralized provider registration
├── engine.ts         — DEPRECATED legacy barrel file
└── nodes/
    ├── io.ts         — input, file, join, output, slice
    ├── string.ts     — uppercase, lowercase, reverse, trim, length
    ├── encoding.ts   — base64, hex, url, base32, base58
    ├── hash.ts       — All hash nodes (via makeHashNode)
    ├── cipher.ts     — aes, sm4, chacha20poly1305, xchacha20poly1305, aesGcmSiv
    ├── rsa.ts        — rsa_keygen, rsa, rsa_sign, rsa_verify
    ├── mac.ts        — hmac, poly1305, cmac
    ├── kdf.ts        — pbkdf2, hkdf, argon2, scrypt, bcrypt
    ├── ecc.ts        — ec_keygen, ecdsa_sign, ecdsa_verify, ecdh
    ├── eddsa.ts      — ed_keygen, ed_sign, ed_verify, x25519_derive
    ├── sm.ts         — sm2_keygen, sm2_sign, sm2_verify, sm2_encrypt, sm2_decrypt
    ├── otp.ts        — totp, hotp
    ├── jwt.ts        — jwt_sign, jwt_verify
    ├── entropy.ts    — random
    ├── bitwise.ts    — xor, constantTimeCompare, keyGen
    └── legacy.ts     — des, tripledes
```
