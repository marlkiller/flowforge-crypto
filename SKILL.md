# FlowForge Crypto

Visual crypto pipeline editor built with TanStack Start + React 19 + React Flow + Tailwind CSS v4.

## Commands

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server                           |
| `npm run typecheck` | TypeScript check (run before commit) |
| `npm run lint`      | ESLint                               |
| `npm run format`    | Prettier                             |
| `npm run build`     | Production build                     |

## Quick Start — Add a New Node

```typescript
// src/lib/crypto/nodes/rot13.ts
import { registerNodeDef } from "../registry";

registerNodeDef("rot13", {
  meta: {
    kind: "rot13",
    label: "ROT13",
    category: "data",
    description: "Apply ROT13 substitution.",
    defaultOutput: "utf8",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) => {
    const input = new TextDecoder().decode(inputs["data"] ?? new Uint8Array(0));
    const out = input.replace(/[a-zA-Z]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) + (c <= "Z" ? 13 : -13)),
    );
    return new TextEncoder().encode(out);
  },
});
```

Then in `src/lib/crypto/setup.ts`, add `import "./nodes/rot13";` to the immediate section.

---

## Conventions

### Code style

- **No comments** unless explaining why, not what
- **Named function declarations** (`export function Foo`), never `export default`
- **Tailwind v4** inline only — no CSS modules, no styled-components
- **`cn()`** from `@/lib/utils` for conditional class merging
- **`import type { X }`** for type-only imports
- **`@/` alias** for cross-module, `./` for siblings

### Architecture

- `src/lib/crypto/nodes/<name>.ts` — one file per node kind (or related group)
- `src/lib/crypto/setup.ts` — single entry point that imports all node files; never import node files elsewhere
- `src/lib/crypto/providers/` — algorithm implementations (WebCrypto, noble, etc.)
- `src/lib/crypto/types/index.ts` — `NodeKindMeta`, `NodeData`, `NodeDef`, `NodeRunner`, `GraphNode`

## Meta Structure

The `meta: NodeKindMeta` object defines what appears in the UI. There is no separate `fields` concept — everything is an `input`, differentiated by `connectable`:

```typescript
interface NodeKindMeta {
  kind: string; // unique id, e.g. "aes", "sha256"
  label: string; // display name
  category: string; // see CATEGORY_META in registry.ts — actual values: io, ui, data, encoding, format, checksum, hash, cipher, public-key, signature, key-exchange, mac, kdf, entropy, protocol, secret-sharing, certificate, pqc, analysis
  description: string; // tooltip
  defaultOutput?: "utf8" | "hex" | "base64" | "pem" | "base32" | "base58";
  inputs?: NodeInputMeta[]; // all ports + form controls
  outputs?: { id: string; label: string; type?: DataType; visible?: (data) => boolean }[];
}

interface NodeInputMeta {
  id: string;
  label: string; // display name (type hint omitted — shown via acceptTypes badge)
  type?: "text" | "password" | "select" | "textarea" | "number"; // set = form control
  connectable?: boolean; // true = has Handle port (default: true)
  acceptTypes?: string[]; // displayed as badge: e.g. "B64/PEM" (base64→B64, pem→PEM, hex→HEX, utf8→UTF8, base32→B32, base58→B58)
  placeholder?: string;
  defaultValue?: string | number;
  options?: { label: string; value: string }[]; // for "select" type
  visible?: (data: Record<string, unknown>) => boolean; // conditional show
  validate?: (value: any) => string | null; // return error msg or null
  group?: string;
  sensitive?: boolean;
  tooltip?: string;
}
```

### Common meta patterns

| Pattern                               | Example                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| No inputs (generator)                 | `entropy/random` — only `defaultOutput`                                                               |
| Single connectable input              | hash nodes — `{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }`                 |
| Form-only inputs (connectable: false) | encoding mode select — `{ id: "mode", type: "select", connectable: false, ... }`                      |
| Connectable + form mixed              | `aes` key/iv — `{ id: "key", connectable: true, acceptTypes: ["HEX", "B64"], type: "password", ... }` |
| Handle + form (shared id)             | cipher key — single entry with both `connectable: true` and `type: "password"`                        |
| Multiple named outputs                | `rsa_keygen` — `outputs: [{ id: "publicKey" }, { id: "privateKey" }]`                                 |
| Conditional visibility                | `iv` visible only when `mode !== "ECB"` via `visible` callback                                        |

## Runner Signature

```typescript
type NodeRunner = (
  node: GraphNode, // use getField(node, "fieldId") to read field values
  inputs: Record<string, any>, // Values are auto-unwrapped to Uint8Array/string via Proxy
) =>
  | Promise<DataValue | Record<string, DataValue> | Uint8Array | Record<string, Uint8Array>>
  | DataValue
  | Record<string, DataValue>
  | Uint8Array
  | Record<string, Uint8Array>;
```

Visual-only nodes (note, group) can use `() => ({})` as a no-op runner — they produce no output.

**Backward Compatibility**: The `inputs` object is a Proxy. Accessing `inputs["id"]` will return the raw `Uint8Array` (or string/bool) value. To access the full container (e.g. to check the incoming type), use `inputs.__raw["id"]`.

### Data Types & Port Styles

Handles (ports) are styled based on the `DataType` defined in `acceptTypes` (inputs) or `type/outputFormat` (outputs).

| Type              | Color   | Shape   |
| ----------------- | ------- | ------- |
| `raw`             | Blue    | Circle  |
| `utf8` / `string` | Green   | Circle  |
| `hex` / `base64`  | Yellow  | Circle  |
| `cryptokey`       | Fuchsia | Diamond |
| `bool`            | Rose    | Square  |
| `json`            | Cyan    | Circle  |

### Utilities

| Function                                       | Usage                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `getField(node, "id", "default")`              | Read string field from `node.data`                                |
| `getNumberField(node, "id", 0)`                | Read number field from `node.data`                                |
| `getParamBytes(node, inputs, "id", required?)` | Read bytes — from wired input first, fallback to hex/base64 field |
| `validateHex(len?)`                            | Returns a validator for hex fields                                |

## Eager vs Lazy Loading

- **Eager** — code downloaded on page load, node works immediately. Use for lightweight nodes (XOR, IO, encoding). Write `registerNodeDef(kind, { meta, runner })` in the node file, `import "./nodes/<name>"` in setup.ts.
- **Lazy** — only meta loaded upfront; runner downloaded on first use. Use when your node imports external crypto libraries (RSA, ECC, KDF, Argon2, etc.). Write `registerLazyNode(kind, meta, () => import("./nodes/<name>"))` in setup.ts, no `registerNodeDef` call in the node file.

**Default to eager.** If the bundle grows noticeably, switch to lazy. Check by running `npm run build` and watching `dist/assets/` sizes.

## Adding a New Algorithm Node

1. Create `src/lib/crypto/nodes/<algo>.ts`
2. For each operation (encrypt, decrypt, sign, verify, keygen, derive), register a separate node kind
3. Call `registerNodeDef("<kind>", { meta: {...}, runner: async (node, inputs) => {...} })`
4. If the node is heavy, skip step 2 — instead add `registerLazyNode("<kind>", meta, () => import("./nodes/<algo>"))` in `setup.ts`
5. In `setup.ts`, either `import "./nodes/<algo>"` (eager) or add the `registerLazyNode(...)` call (lazy)
6. **MANDATORY**: Add a real-world scenario preset in `src/presets/presets.ts`. Do not just test a single node; build a **Business Loop** (e.g., Keygen → Encrypt → Decrypt, or Digital Envelope, or Handshake simulation where both sender and receiver logic are fully implemented) to serve as an educational template.
7. Add icon in `Sidebar.tsx` `PRESET_ICONS` map if needed
8. Add entry to `ALL_PRESETS` with `label`, `seed`, `keywords`
9. Run `npm run typecheck`

## Adding a Preset Template (Scenario / Educational)

1. Add generator in `src/presets/presets.ts` using `makeNode()` + edges
2. **Focus on Business Loops**: Templates are educational tools! Go beyond basic lifecycles. Ensure every flow is fully cyclical (if data is encrypted/signed by a sender, it MUST be decrypted/verified by a receiver in the same graph). Build composite workflows like "Hybrid Encryption (Digital Envelope)", "HTTPS Handshake", or "JWT Sign & Verify".
3. Add explanatory `input` nodes or default text that helps the user understand _why_ the data flows this way.
4. Add icon in `Sidebar.tsx` `PRESET_ICONS` map
5. Add entry to `ALL_PRESETS` with `label`, `seed`, `keywords`
6. Run `npm run typecheck`

## Example: Simple Node (XOR)

`src/lib/crypto/nodes/bitwise.ts`:

```typescript
import { registerNodeDef } from "../registry";

registerNodeDef("xor", {
  meta: {
    kind: "xor",
    label: "XOR",
    category: "analysis",
    description: "Byte-wise XOR of two inputs.",
    defaultOutput: "hex",
    inputs: [
      { id: "a", label: "Input A", connectable: true, acceptTypes: ["raw"] },
      { id: "b", label: "Input B", connectable: true, acceptTypes: ["raw"] },
    ],
  },
  runner: (_, inputs) => {
    const a = inputs["a"] ?? new Uint8Array(0);
    const b = inputs["b"] ?? new Uint8Array(0);
    const len = Math.max(a.length, b.length);
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = (a[i] ?? 0) ^ (b[i] ?? 0);
    return out;
  },
});
```

## Example: Complex Node (AES with conditional inputs/fields)

`src/lib/crypto/nodes/cipher.ts`:

```typescript
import { registerNodeDef } from "../registry";
import { getProvider, type CipherProvider } from "../service";
import { getField, getParamBytes, validateHex } from "../utils";

registerNodeDef("aes", {
  meta: {
    kind: "aes",
    label: "AES",
    category: "cipher",
    description: "AES encrypt/decrypt.",
    defaultOutput: "hex",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "key",
        label: "Key",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "password",
        placeholder: "32/48/64 hex...",
        validate: validateHex([16, 24, 32]),
      },
      {
        id: "iv",
        label: "IV",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "All modes = 32 hex chars",
        visible: (d) => d["cipherMode"] !== "ECB",
      },
      {
        id: "aad",
        label: "AAD",
        connectable: true,
        acceptTypes: ["HEX", "B64"],
        type: "text",
        placeholder: "optional hex for GCM...",
        visible: (d) => d["cipherMode"] === "GCM",
      },
      {
        id: "action",
        label: "Action",
        type: "select",
        options: [
          { label: "Encrypt", value: "encrypt" },
          { label: "Decrypt", value: "decrypt" },
        ],
        connectable: false,
      },
      {
        id: "cipherMode",
        label: "Mode",
        type: "select",
        options: [
          { label: "CBC", value: "CBC" },
          { label: "GCM", value: "GCM" } /* ... */,
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const action = getField(node, "action", "encrypt");
    const mode = getField(node, "cipherMode", "CBC");
    const key = getParamBytes(node, inputs, "key")!;
    const data = inputs["data"] ?? new Uint8Array(0);
    const provider = getProvider(`AES-${mode}`) as CipherProvider;
    return action === "encrypt" ? provider.encrypt(key, iv, data) : provider.decrypt(key, iv, data);
  },
});
```

## Testing in the UI

1. Open the dev server with `npm run dev`
2. Drag a newly registered node from the sidebar palette onto the canvas
3. Configure its fields in the inspector panel
4. Wire inputs from `input` nodes with `hex`/`utf8` data
5. Connect an `output` node to see the result
6. Check the browser console if the node errors — errors from `runner` appear on the node and in console

## Verification

- **Always** run `npm run typecheck` after any change
- No test suite exists — manual verification in the browser UI required
