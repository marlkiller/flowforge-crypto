import { registerNodeDef } from "../registry";
import { bytesToUtf8, utf8ToBytes, bytesToHex } from "../service";
import { CryptoService } from "../service";

function byteFrequency(data: Uint8Array): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let i = 0; i < data.length; i++) {
    freq[data[i]] = (freq[data[i]] ?? 0) + 1;
  }
  return freq;
}

function shannonEntropy(data: Uint8Array): number {
  const len = data.length;
  if (len === 0) return 0;
  const freq = byteFrequency(data);
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

registerNodeDef("frequencyAnalysis", {
  meta: {
    kind: "frequencyAnalysis",
    label: "Frequency Analysis",
    category: "analysis",
    description: "Count byte frequency distribution of input data.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "topN",
        label: "Show Top N",
        type: "number",
        defaultValue: 16,
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const topN = (node.data["topN"] as number) ?? 16;
    const freq = byteFrequency(data);
    const sorted = Object.entries(freq)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, topN);
    const lines = sorted.map(([byte, count]) => {
      const b = parseInt(byte);
      const ch = b >= 32 && b <= 126 ? String.fromCharCode(b) : ".";
      const pct = ((Number(count) / data.length) * 100).toFixed(2);
      return `0x${b.toString(16).padStart(2, "0")} (${ch}): ${count} (${pct}%)`;
    });
    const total = `Total bytes: ${data.length}, Unique bytes: ${Object.keys(freq).length}`;
    return utf8ToBytes([total, ...lines].join("\n"));
  },
});

registerNodeDef("entropyCalc", {
  meta: {
    kind: "entropyCalc",
    label: "Entropy Calculator",
    category: "analysis",
    description: "Calculate Shannon entropy of input data (0-8 bits/byte).",
    defaultOutput: "utf8",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const entropy = shannonEntropy(data);
    const maxEntropy = data.length > 0 ? 8 : 0;
    const pct = data.length > 0 ? ((entropy / maxEntropy) * 100).toFixed(1) : "0";
    const assessment =
      entropy > 7.5
        ? "Likely encrypted/compressed"
        : entropy > 5
          ? "High entropy"
          : entropy > 3
            ? "Medium entropy"
            : "Low entropy (structured data)";
    return utf8ToBytes(
      `Shannon Entropy: ${entropy.toFixed(4)} bits/byte\n` +
        `Max possible: ${maxEntropy} bits/byte\n` +
        `Ratio: ${pct}%\nAssessment: ${assessment}`,
    );
  },
});

registerNodeDef("ecbDetect", {
  meta: {
    kind: "ecbDetect",
    label: "ECB Block Detect",
    category: "analysis",
    description: "Detect ECB mode encryption by looking for repeated 16-byte blocks.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "blockSize",
        label: "Block Size",
        type: "number",
        defaultValue: 16,
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const blockSize = (node.data["blockSize"] as number) ?? 16;
    if (data.length < blockSize || blockSize < 1) {
      return utf8ToBytes("Data too short for block analysis");
    }
    const blocks = new Map<string, number[]>();
    for (let i = 0; i + blockSize <= data.length; i += blockSize) {
      const block = data.slice(i, i + blockSize);
      const hex = bytesToHex(block);
      if (!blocks.has(hex)) blocks.set(hex, []);
      blocks.get(hex)!.push(i / blockSize);
    }
    const duplicates = [...blocks.entries()].filter(([, pos]) => pos.length > 1);
    const totalBlocks = Math.floor(data.length / blockSize);
    const uniqueBlocks = blocks.size;
    if (duplicates.length === 0) {
      return utf8ToBytes(
        `Total blocks: ${totalBlocks}\nUnique blocks: ${uniqueBlocks}\n` +
          `Repeated blocks: 0\nVerdict: No ECB-like repeating blocks detected`,
      );
    }
    const lines = duplicates
      .slice(0, 20)
      .map(
        ([hex, pos]) =>
          `Block ${hex.substring(0, 8)}... appears ${pos.length}x at positions [${pos.join(", ")}]`,
      );
    return utf8ToBytes(
      `Total blocks: ${totalBlocks}\nUnique blocks: ${uniqueBlocks}\n` +
        `Repeated blocks: ${duplicates.length}\n` +
        `Verdict: ECB mode likely\n\n${lines.join("\n")}` +
        (duplicates.length > 20 ? `\n... and ${duplicates.length - 20} more` : ""),
    );
  },
});

registerNodeDef("encodingGuesser", {
  meta: {
    kind: "encodingGuesser",
    label: "Encoding Guesser",
    category: "analysis",
    description: "Try to auto-detect encoding format of input bytes.",
    defaultOutput: "utf8",
    inputs: [{ id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] }],
  },
  runner: (_, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const text = bytesToUtf8(data);
    const results: string[] = [];
    const trimmed = text.trim();
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
      results.push("HEX: Valid hex string");
    }
    try {
      const decoded = atob(trimmed.replace(/\s/g, ""));
      if (decoded.length > 0) results.push(`Base64: Decodes to ${decoded.length} bytes`);
    } catch {
      /* ignore */
    }
    if (/^[A-Z2-7]+=*$/.test(trimmed.toUpperCase()) && trimmed.length % 8 === 0) {
      results.push("Base32: Looks like valid Base32");
    }
    if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
      results.push("Base58: Looks like valid Base58 (Bitcoin)");
    }
    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length % 4 === 0) {
      results.push("Base64: Standard base64 pattern");
    }
    try {
      JSON.parse(text);
      results.push("JSON: Valid JSON");
    } catch {
      /* ignore */
    }
    if (data.length <= 8) {
      const num = parseInt(text);
      if (!isNaN(num)) results.push(`Number: ${num}`);
    }
    if (results.length === 0) {
      results.push("No known encoding detected (likely raw binary or unknown format)");
    }
    results.unshift(`Input: ${data.length} bytes`);
    return utf8ToBytes(results.join("\n"));
  },
});

registerNodeDef("hashCollision", {
  meta: {
    kind: "hashCollision",
    label: "Hash Collision Viz",
    category: "analysis",
    description: "Visualize hash collision by truncating and comparing hashes.",
    defaultOutput: "utf8",
    inputs: [
      { id: "dataA", label: "Input A", connectable: true, acceptTypes: ["raw"] },
      { id: "dataB", label: "Input B", connectable: true, acceptTypes: ["raw"] },
      {
        id: "truncateBytes",
        label: "Truncate to (bytes)",
        type: "number",
        defaultValue: 8,
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const a = inputs["dataA"] ?? new Uint8Array(0);
    const b = inputs["dataB"] ?? new Uint8Array(0);
    const truncate = (node.data["truncateBytes"] as number) ?? 8;
    const hashA = await CryptoService.digest("SHA-256", a);
    const hashB = await CryptoService.digest("SHA-256", b);
    const truncA = hashA.slice(0, truncate);
    const truncB = hashB.slice(0, truncate);
    const match = truncA.length === truncB.length && truncA.every((v, i) => v === truncB[i]);
    let bits = "";
    for (let i = 0; i < truncA.length; i++) {
      for (let b2 = 7; b2 >= 0; b2--) {
        const bitA = (truncA[i] >> b2) & 1;
        const bitB = (truncB[i] >> b2) & 1;
        bits += bitA === bitB ? (bitA ? "1" : "0") : "X";
      }
    }
    return utf8ToBytes(
      `SHA-256(A): ${Array.from(hashA.slice(0, truncate))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}\n` +
        `SHA-256(B): ${Array.from(hashB.slice(0, truncate))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}\n` +
        `Truncated to: ${truncate} bytes\n` +
        `Full match: ${match ? "YES - COLLISION" : "No collision"}\n` +
        `Bit diff (1=same, X=different): ${bits}`,
    );
  },
});
