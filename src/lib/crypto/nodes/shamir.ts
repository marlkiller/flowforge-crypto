import { registerNodeDef } from "../registry";
import { utf8ToBytes, bytesToUtf8 } from "../service";
import { getNumberField } from "../utils";

const _prime = 257;

function _evalPoly(coeffs: number[], x: number): number {
  let result = 0;
  let xpow = 1;
  for (const c of coeffs) {
    result = (result + c * xpow) % _prime;
    xpow = (xpow * x) % _prime;
  }
  return result;
}

function _lagrangeInterpolate(shares: [number, number][], x: number): number {
  let result = 0;
  for (let i = 0; i < shares.length; i++) {
    const [xi, yi] = shares[i];
    let num = 1,
      den = 1;
    for (let j = 0; j < shares.length; j++) {
      if (i === j) continue;
      const xj = shares[j][0];
      num = (num * (_prime - xj + x)) % _prime;
      den = (den * (_prime - xj + xi)) % _prime;
    }
    const invDen = _modInverse(den);
    result = (result + yi * num * invDen) % _prime;
  }
  return result % _prime;
}

function _modInverse(a: number): number {
  let t = 0,
    newt = 1,
    r = _prime,
    newr = a;
  while (newr !== 0) {
    const q = Math.floor(r / newr);
    [t, newt] = [newt, t - q * newt];
    [r, newr] = [newr, r - q * newr];
  }
  return (t + _prime) % _prime;
}

function _splitByte(byteVal: number, total: number, threshold: number): number[][] {
  const coeffs = [byteVal];
  for (let i = 1; i < threshold; i++) {
    coeffs.push(Math.floor(Math.random() * _prime));
  }
  const shares: number[][] = [];
  for (let i = 1; i <= total; i++) {
    shares.push([i, _evalPoly(coeffs, i)]);
  }
  return shares;
}

function _joinBytes(shares: [number, number][][], threshold: number): Uint8Array {
  const byteLen = shares[0].length;
  const result = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    const pointShares: [number, number][] = shares.map((s) => [s[i][0], s[i][1]]);
    const val = _lagrangeInterpolate(pointShares.slice(0, threshold), 0);
    result[i] = val;
  }
  return result;
}

registerNodeDef("shamirSplit", {
  meta: {
    kind: "shamirSplit",
    label: "Shamir Split",
    category: "protocol",
    description: "Split a secret into shares using Shamir's Secret Sharing over GF(257).",
    defaultOutput: "utf8",
    outputs: [{ id: "shares", label: "All Shares (JSON)" }],
    inputs: [
      { id: "secret", label: "Secret", connectable: true, acceptTypes: ["raw"] },
      {
        id: "totalShares",
        label: "Total Shares (N)",
        type: "number",
        defaultValue: 5,
        connectable: false,
      },
      {
        id: "threshold",
        label: "Threshold (K)",
        type: "number",
        defaultValue: 3,
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const secret = inputs["secret"] ?? utf8ToBytes("secret");
    if (secret.length === 0) throw new Error("Secret cannot be empty");
    const total = getNumberField(node, "totalShares", 5);
    const threshold = getNumberField(node, "threshold", 3);
    if (threshold < 2) throw new Error("Threshold must be at least 2");
    if (total < threshold) throw new Error("Total shares must be >= threshold");
    if (threshold > _prime) throw new Error("Threshold too large");
    const byteShares: number[][][] = [];
    for (let i = 0; i < total; i++) {
      byteShares.push([]);
    }
    for (let b = 0; b < secret.length; b++) {
      const s = _splitByte(secret[b], total, threshold);
      for (let i = 0; i < total; i++) {
        byteShares[i].push(s[i]);
      }
    }
    const shareList = byteShares.map((s, idx) => ({
      id: idx + 1,
      data: Array.from(s.map(([x, y]) => [x, y])),
    }));
    return { shares: utf8ToBytes(JSON.stringify(shareList)) };
  },
});

registerNodeDef("shamirJoin", {
  meta: {
    kind: "shamirJoin",
    label: "Shamir Join",
    category: "protocol",
    description: "Reconstruct a secret from Shamir shares (JSON format).",
    defaultOutput: "utf8",
    inputs: [
      { id: "shares", label: "Shares (JSON)", connectable: true, acceptTypes: ["raw"] },
      {
        id: "threshold",
        label: "Threshold (K)",
        type: "number",
        defaultValue: 3,
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const sharesJson = bytesToUtf8(inputs["shares"] ?? new Uint8Array(0));
    if (!sharesJson) throw new Error("Shares data is required");
    const threshold = getNumberField(node, "threshold", 3);
    let shares: { id: number; data: number[][] }[];
    try {
      shares = JSON.parse(sharesJson);
    } catch {
      throw new Error("Invalid shares JSON");
    }
    if (!Array.isArray(shares) || shares.length < threshold) {
      throw new Error(`Need at least ${threshold} shares`);
    }
    const sharePoints: [number, number][][] = shares
      .slice(0, threshold)
      .map((s) => s.data.map(([x, y]) => [x, y] as [number, number]));
    const secret = _joinBytes(sharePoints, threshold);
    return secret;
  },
});
