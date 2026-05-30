import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { getField, getProviderHash } from "../utils";
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from "../service";

function merkleTree(
  leaves: Uint8Array[],
  hashFn: (d: Uint8Array) => Promise<Uint8Array>,
): Promise<{ root: Uint8Array; tree: string[][] }> {
  return merkleTreeFromNodes(leaves, hashFn);
}

async function merkleTreeFromNodes(
  nodes: Uint8Array[],
  hashFn: (d: Uint8Array) => Promise<Uint8Array>,
): Promise<{ root: Uint8Array; tree: string[][] }> {
  if (nodes.length === 0) throw new Error("No leaves provided");
  if (nodes.length === 1) return { root: nodes[0], tree: [[bytesToHex(nodes[0])]] };

  const tree: string[][] = [nodes.map((n) => bytesToHex(n))];
  let level = nodes;
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = i + 1 < level.length ? level[i + 1]! : left;
      const combined = new Uint8Array(left.length + right.length);
      combined.set(left);
      combined.set(right, left.length);
      next.push(await hashFn(combined));
    }
    tree.push(next.map((n) => bytesToHex(n)));
    level = next;
  }
  return { root: level[0]!, tree };
}

registerNodeDef("merkleTree", {
  meta: {
    kind: "merkleTree",
    label: "Merkle Tree",
    category: "hash",
    description:
      "Build a Merkle tree from input data (one leaf per line). Returns root hash and full tree.",
    defaultOutput: "hex",
    outputs: [
      { id: "root", label: "Root" },
      { id: "tree", label: "Tree (JSON)" },
    ],
    inputs: [
      { id: "data", label: "Data (one leaf per line)", connectable: true, acceptTypes: ["raw"] },
      {
        id: "hash",
        label: "Hash",
        type: "select",
        connectable: false,
        defaultValue: "SHA-256",
        options: [
          { label: "SHA-256", value: "SHA-256" },
          { label: "SHA-224", value: "SHA-224" },
          { label: "SHA-384", value: "SHA-384" },
          { label: "SHA-512", value: "SHA-512" },
          { label: "SHA3-256", value: "SHA3-256" },
          { label: "BLAKE2b", value: "BLAKE2b" },
          { label: "BLAKE3", value: "BLAKE3" },
        ],
      },
    ],
  },
  runner: async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
    const raw = inputs["data"] ?? new Uint8Array(0);
    const text = bytesToUtf8(raw);
    const leaves = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => utf8ToBytes(l));

    if (leaves.length === 0) throw new Error("No leaves provided");

    const hashName = getField(node, "hash", "SHA-256");
    const hashFn = getProviderHash(hashName);
    const hashedLeaves = await Promise.all(leaves.map((l) => hashFn(l)));

    const { root, tree } = await merkleTree(hashedLeaves, hashFn);

    return {
      root,
      tree: utf8ToBytes(JSON.stringify(tree, null, 2)),
    };
  },
});

registerNodeDef("merkleProof", {
  meta: {
    kind: "merkleProof",
    label: "Merkle Proof",
    category: "hash",
    description: "Verify a Merkle proof: given leaf, proof siblings, and root, verify inclusion.",
    defaultOutput: "utf8",
    inputs: [
      { id: "leaf", label: "Leaf Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "proof",
        label: "Proof (hex siblings, comma-sep)",
        connectable: true,
        acceptTypes: ["raw"],
        type: "text",
        placeholder: "hex1,hex2,...",
      },
      {
        id: "root",
        label: "Expected Root (hex)",
        connectable: true,
        acceptTypes: ["hex"],
        type: "text",
        placeholder: "64-char hex...",
      },
      {
        id: "hash",
        label: "Hash",
        type: "select",
        connectable: false,
        defaultValue: "SHA-256",
        options: [
          { label: "SHA-256", value: "SHA-256" },
          { label: "SHA-224", value: "SHA-224" },
          { label: "SHA-384", value: "SHA-384" },
          { label: "SHA-512", value: "SHA-512" },
          { label: "SHA3-256", value: "SHA3-256" },
        ],
      },
    ],
  },
  runner: async (node: GraphNode, inputs: Record<string, Uint8Array>) => {
    const leafRaw = inputs["leaf"] ?? new Uint8Array(0);
    const proofRaw = inputs["proof"] ?? new Uint8Array(0);
    const rootRaw = inputs["root"] ?? new Uint8Array(0);

    const hashName = getField(node, "hash", "SHA-256");
    const hashFn = getProviderHash(hashName);

    const proofText = bytesToUtf8(proofRaw).trim();
    const proofSiblings = proofText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => hexToBytes(s));

    const expectedRoot = rootRaw;

    let computed = await hashFn(leafRaw);
    for (const sibling of proofSiblings) {
      const combined = new Uint8Array(computed.length + sibling.length);
      // Assume left-to-right ordering: smaller first
      if (bytesToHex(computed) < bytesToHex(sibling)) {
        combined.set(computed);
        combined.set(sibling, computed.length);
      } else {
        combined.set(sibling);
        combined.set(computed, sibling.length);
      }
      computed = await hashFn(combined);
    }

    const match = bytesToHex(computed) === bytesToHex(expectedRoot);
    return utf8ToBytes(match ? "Proof valid ✓" : "Proof invalid ✗");
  },
});
