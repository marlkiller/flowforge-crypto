import wp from "whirlpool-hash";
import { registerProvider } from "../service";

function whirlpoolCore(type?: string): (data: Uint8Array) => Uint8Array {
  return (data) => {
    const w = type ? new wp.Whirlpool({ type } as any) : new wp.Whirlpool();
    const input = Array.from(data).map((b) => String.fromCharCode(b)).join("");
    const bin = w.getHash(input);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  };
}

export const whirlpool = whirlpoolCore();
export const whirlpool0 = whirlpoolCore("0");
export const whirlpoolT = whirlpoolCore("t");

export function sha0(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const mLen = (((data.length + 8) >>> 6) + 1) << 6;
  const m = new Uint8Array(mLen);
  m.set(data);
  m[data.length] = 0x80;
  const dv = new DataView(m.buffer, m.byteOffset, m.byteLength);
  dv.setUint32(mLen - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(mLen - 4, bitLen & 0xffffffff, false);

  const h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const K = new Uint32Array([0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6]);
  const W = new Uint32Array(80);

  for (let off = 0; off < mLen; off += 64) {
    for (let t = 0; t < 16; t++) W[t] = dv.getUint32(off + t * 4, false);
    for (let t = 16; t < 80; t++) W[t] = W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16];

    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
    for (let t = 0; t < 80; t++) {
      const f = t < 20
        ? (b & c) | (~b & d)
        : t < 40
          ? b ^ c ^ d
          : t < 60
            ? (b & c) | (b & d) | (c & d)
            : b ^ c ^ d;
      const temp = ((((a << 5) | (a >>> 27)) + e + K[(t / 20) | 0] + W[t]) | 0) + f;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = temp | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e;
  }

  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer, out.byteOffset, out.byteLength);
  for (let i = 0; i < 5; i++) ov.setUint32(i * 4, h[i], false);
  return out;
}

registerProvider({ type: "hash", name: "Whirlpool", digest: async (d) => whirlpool(d) });
registerProvider({ type: "hash", name: "Whirlpool-0", digest: async (d) => whirlpool0(d) });
registerProvider({ type: "hash", name: "Whirlpool-T", digest: async (d) => whirlpoolT(d) });
registerProvider({ type: "hash", name: "SHA-0", digest: async (d) => sha0(d) });
