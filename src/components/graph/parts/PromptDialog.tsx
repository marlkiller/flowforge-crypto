import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { NODE_KIND_META, getActiveCategories } from "@/lib/crypto/registry";
import type { NodeInputMeta, NodeOutputMeta } from "@/lib/crypto/types";
import { toast } from "sonner";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatInputs(inputs?: NodeInputMeta[]) {
  if (!inputs || inputs.length === 0) return "(none)";
  return inputs
    .map((i) => {
      let s = i.id;
      if (i.type) s += `:${i.type}`;
      if (i.connectable !== false && i.acceptTypes && i.acceptTypes.length > 0) {
        const types = i.acceptTypes.filter((t) => t !== "raw");
        if (types.length > 0) {
          s += `:${types.join("/")}`;
        }
      }
      if (i.connectable === false && i.type === "select" && i.options) {
        s += `(${i.options
          .slice(0, 7)
          .map((o) => o.value)
          .join("/")})`;
      }
      return s;
    })
    .join(", ");
}

function formatOutputs(outputs?: NodeOutputMeta[]) {
  if (!outputs || outputs.length === 0) return "default";
  return outputs.map((o) => o.id).join(", ");
}

export function PromptDialog({ open, onOpenChange }: PromptDialogProps) {
  const [copied, setCopied] = useState(false);

  const promptText = useMemo(() => {
    if (!open) return "";

    const header = `You are a FlowForge Crypto workflow generator.
Given an algorithm script (Python/Java), decompose it into a graph of existing FlowForge nodes
and output a workflow JSON that can be imported via File > Import.

## Available Nodes

Format: kind | label | inputs | outputs\n`;

    const order = getActiveCategories();

    const nodes = Object.values(NODE_KIND_META);
    nodes.sort((a, b) => {
      const ca = order.indexOf(a.category);
      const cb = order.indexOf(b.category);
      return ca !== cb ? ca - cb : a.label.localeCompare(b.label);
    });

    let catalog = "";
    let currentCategory = "";

    for (const node of nodes) {
      if (node.category !== currentCategory) {
        currentCategory = node.category;
        catalog += `\n=== ${currentCategory} ===\n`;
      }
      const inputs = formatInputs(node.inputs);
      const outputs = formatOutputs(node.outputs);
      catalog += `${node.kind} | ${node.label} | ${inputs} | ${outputs}\n`;
    }

    const footer = `
## Output JSON Format

\`\`\`json
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
\`\`\`

## Rules

1. Use \`input\` nodes as sources for fixed plaintext/keys, \`output\` nodes as sinks for results
2. For multi-output nodes (e.g. keygen), use \`sourceHandle: "publicKey"\` / \`sourceHandle: "privateKey"\` on edges
3. For single-output nodes, omit \`sourceHandle\`
4. targetHandle must match an input id on the target node (usually "data" for main input)
5. Position nodes left-to-right with ~300px x-spacing, ~100px y-spacing
6. Set select fields to appropriate values based on the algorithm (use first option as default)
7. Set \`animated: true\` on edges
8. For nodes with only connectable inputs, omit those inputs from \`data\` (they'll be wired)
9. **Set \`outputFormat: "hex"\` on data-producing nodes** (random, pbkdf2, aes, hmac, join, etc.) so the UI displays hex instead of garbled utf8. Without this, binary output shows as mojibake.
10. **Never use \`hex\` nodes between nodes** — wired inputs always use raw bytes. \`hex\` encode/decode is only for form fields (non-wired) or for display. Using a hex node on a wire will corrupt the data (doubled size, wrong format).
11. Output ONLY valid JSON, no explanation

## Node Detail Reference

These details are not visible in the catalog table above but are critical for correct JSON output:

### Join Node

- **Input handles**: \`in_1\`, \`in_2\`, ..., \`in_N\` (where N = \`count\` field value)
- Set \`targetHandle\` in edges to \`"in_1"\`, \`"in_2"\`, etc. — NOT to \`"0"\`, \`"1"\`, etc.

### Hex Node

- Has a non-connectable select field \`mode\` with options \`"encode"\` (bytes→hex string) and \`"decode"\` (hex string→bytes)
- **Always set \`"mode": "encode"\` or \`"mode": "decode"\`** — without it the node is a no-op
- **Do NOT use hex nodes on wires between other nodes** — wired inputs receive raw bytes directly, so hex encoding will corrupt the data. Hex nodes are only useful for converting form input/output strings.

### Slice Node

- \`start\` and \`end\` support **negative indices** (JavaScript \`TypedArray.slice()\` semantics). Use \`start: -32\` to extract the last 32 bytes.
- Omit \`end\` (or leave empty) to slice from \`start\` to the end of the data.
- **When your target field is NOT at the end** of the data, you MUST set \`end\` to isolate it. Example: in format \`[header:34][ciphertext:N][hmac:32]\`, use \`start: 34, end: -32\` for ciphertext (34 to end-minus-32), NOT just \`start: 34\` (which would include the HMAC).

### HMAC Node (Verify Mode)

- Set \`action: "verify"\` to compare a received HMAC against a computed one.
- The \`signature\` input handle appears only in verify mode — connect the received HMAC bytes here.
- Output is \`"Valid"\` or \`"Invalid"\` as UTF-8 bytes (set \`outputFormat: "utf8"\`).

### Template Node

- Like Join: has dynamic inputs \`in_1\`, \`in_2\`, ..., \`in_N\` (N = \`count\`).
- The \`template\` textarea is a string with \`{in_1}\`, \`{in_2}\`, ... placeholders replaced by wired input values (converted to UTF-8). Use this to build JSON or structured text from dynamic values.

### Checksum Node

- Computes a checksum over string data. Algorithm \`"transition"\` (Transition Checksum) is derived from reverse-engineering Snipaste's \`calculate_char_transition_char\`: iterates characters from index 1, accumulates \`abs(prev - cur)\` (clamped to 0xFF), returns \`str[total % len]\`.
- Other algorithms: \`"sum"\` (sum of char codes), \`"xor"\` (XOR of all bytes).

### Timestamp Node

- Generates the current time with no inputs needed.
- Default format (\`"iso"\`) outputs ISO 8601 string like \`"2026-01-02T10:42:39.869Z"\`.
- Other formats: \`"unix"\` (seconds), \`"unixMs"\` (milliseconds).

### BLAKE2s Node

- Now supports variable output length: set \`outputLength\` field to control digest size in bytes (default 32). For Snipaste machine code, use \`outputLength: 16\`.
- Both BLAKE2b and BLAKE2s are affected.

### PBKDF2 Node

- \`length\` field is in **bits**, not bytes. For 32 bytes of output, set \`length: 256\`.

### Important: Wired Inputs ALWAYS Use Raw Bytes

**Crucial rule**: When a node input is connected via a wire, \`HEX/B64\` accept types are **ignored** — raw bytes flow directly through wires. The \`HEX/B64\` format only applies when you type a hex string into a form field (non-wired).

This means:

- **Never use hex encode between nodes** — it will produce wrong results. E.g., PBKDF2 raw output (32 bytes) → wire → AES key input works correctly as AES-256. If you hex-encode it first, the AES key input would receive 64 ASCII hex bytes and reject it as "Invalid key length: 64 bytes".
- The **Join** node concatenates raw bytes directly.
- **Only use hex encoding for display/output** (set \`outputFormat: "hex"\` on the output node).

Example: Correct encrypt-then-HMAC wiring:

- Random Salt (8 raw bytes) → wire → PBKDF2 salt input **AND** → wire → Join (for header assembly)
- Random HMAC Salt (8 raw bytes) → wire → PBKDF2 salt input **AND** → wire → Join
- PBKDF2 output (32 raw bytes) → wire → AES key input (no hex encode)
- PBKDF2 output (32 raw bytes) → wire → HMAC key input (no hex encode)

## Task

If the script implements both encryption and decryption (or signing and verification), merge them into a **single workflow** where the encrypt/sign output wires directly into the decrypt/verify input — forming a complete cycle that can be verified in one execution. Do NOT split into separate workflows.

Analyze this algorithm script. Identify each cryptographic operation it performs. Map each operation to the corresponding FlowForge node above. Connect them into a DAG workflow that implements the full algorithm. Output the workflow JSON.
`;

    return header + catalog + footer;
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow Generator Prompt</DialogTitle>
          <DialogDescription>
            Copy this prompt and paste it into an LLM (like ChatGPT or Claude) along with your
            cryptography script to automatically generate a workflow JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative rounded-md border border-border bg-muted/30 p-4 font-mono text-xs overflow-y-auto whitespace-pre-wrap">
          {promptText}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <button className="px-4 py-2 rounded-md border border-border bg-background hover:bg-accent text-sm transition-colors">
              Close
            </button>
          </DialogClose>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Prompt"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
