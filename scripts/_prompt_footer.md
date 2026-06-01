## Output JSON Format

```json
{
  "version": 1,
  "workflows": [{
    "name": "<workflow name>",
    "nodes": [
      {
        "id": "n_1",
        "type": "crypto",
        "position": { "x": <number>, "y": <number> },
        "data": {
          "kind": "<node kind>",
          "label": "<display label>",
          "outputFormat": "hex",
          ...any form field values
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "n_1",
        "target": "n_2",
        "sourceHandle": "<output id for multi-output nodes, omitted for default>",
        "targetHandle": "<input id>",
        "animated": true
      }
    ]
  }]
}
```

## Rules

1. Use `input` nodes as sources for fixed plaintext/keys, `output` nodes as sinks for results
2. For multi-output nodes (e.g. keygen), use `sourceHandle: "publicKey"` / `sourceHandle: "privateKey"` on edges
3. For single-output nodes, omit `sourceHandle`
4. targetHandle must match an input id on the target node (usually "data" for main input)
5. Position nodes left-to-right with ~300px x-spacing, ~100px y-spacing
6. Set select fields to appropriate values based on the algorithm (use first option as default)
7. Set `animated: true` on edges
8. For nodes with only connectable inputs, omit those inputs from `data` (they'll be wired)
9. **Set `outputFormat: "hex"` on data-producing nodes** (random, pbkdf2, aes, hmac, join, etc.) so the UI displays hex instead of garbled utf8. Without this, binary output shows as mojibake.
10. **Never use `hex` nodes between nodes** — wired inputs always use raw bytes. `hex` encode/decode is only for form fields (non-wired) or for display. Using a hex node on a wire will corrupt the data (doubled size, wrong format).
11. Output ONLY valid JSON, no explanation

## Node Detail Reference

These details are not visible in the catalog table above but are critical for correct JSON output:

### Join Node

- **Input handles**: `in_1`, `in_2`, ..., `in_N` (where N = `count` field value)
- Set `targetHandle` in edges to `"in_1"`, `"in_2"`, etc. — NOT to `"0"`, `"1"`, etc.

### Hex Node

- Has a non-connectable select field `mode` with options `"encode"` (bytes→hex string) and `"decode"` (hex string→bytes)
- **Always set `"mode": "encode"` or `"mode": "decode"`** — without it the node is a no-op
- **Do NOT use hex nodes on wires between other nodes** — wired inputs receive raw bytes directly, so hex encoding will corrupt the data. Hex nodes are only useful for converting form input/output strings.

### Slice Node

- `start` and `end` support **negative indices** (JavaScript `TypedArray.slice()` semantics). Use `start: -32` to extract the last 32 bytes.
- Omit `end` (or leave empty) to slice from `start` to the end of the data.
- **When your target field is NOT at the end** of the data, you MUST set `end` to isolate it. Example: in format `[header:34][ciphertext:N][hmac:32]`, use `start: 34, end: -32` for ciphertext (34 to end-minus-32), NOT just `start: 34` (which would include the HMAC).

### HMAC Node (Verify Mode)

- Set `action: "verify"` to compare a received HMAC against a computed one.
- The `signature` input handle appears only in verify mode — connect the received HMAC bytes here.
- Output is `"Valid"` or `"Invalid"` as UTF-8 bytes (set `outputFormat: "utf8"`).

### PBKDF2 Node

- `length` field is in **bits**, not bytes. For 32 bytes of output, set `length: 256`.

### Important: Wired Inputs ALWAYS Use Raw Bytes

**Crucial rule**: When a node input is connected via a wire, `HEX/B64` accept types are **ignored** — raw bytes flow directly through wires. The `HEX/B64` format only applies when you type a hex string into a form field (non-wired).

This means:

- **Never use hex encode between nodes** — it will produce wrong results. E.g., PBKDF2 raw output (32 bytes) → wire → AES key input works correctly as AES-256. If you hex-encode it first, the AES key input would receive 64 ASCII hex bytes and reject it as "Invalid key length: 64 bytes".
- The **Join** node concatenates raw bytes directly.
- **Only use hex encoding for display/output** (set `outputFormat: "hex"` on the output node).

Example: Correct encrypt-then-HMAC wiring:

- Random Salt (8 raw bytes) → wire → PBKDF2 salt input **AND** → wire → Join (for header assembly)
- Random HMAC Salt (8 raw bytes) → wire → PBKDF2 salt input **AND** → wire → Join
- PBKDF2 output (32 raw bytes) → wire → AES key input (no hex encode)
- PBKDF2 output (32 raw bytes) → wire → HMAC key input (no hex encode)

## Task

If the script implements both encryption and decryption (or signing and verification), merge them into a **single workflow** where the encrypt/sign output wires directly into the decrypt/verify input — forming a complete cycle that can be verified in one execution. Do NOT split into separate workflows.

Analyze this algorithm script. Identify each cryptographic operation it performs. Map each operation to the corresponding FlowForge node above. Connect them into a DAG workflow that implements the full algorithm. Output the workflow JSON.
