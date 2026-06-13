import base58_lib from "base-x";

// 64 字符的核心字母表 + 第 65 字符为填充符
export const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
export const BASE64_URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export const BASE64_GEDCOM_ALPHABET =
  ".0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_=";

// Base32: 32 字符 + 第 33 字符为填充符
export const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=";
export const BASE32_HEX_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
export const BASE32_CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const BASE32_ZBASE32_ALPHABET = "ybndrfg8ejkmcpqxot1uwisza345h769";

export const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const BASE58_FLICKR_ALPHABET = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const B64_PRESETS: Record<string, string> = {
  url_safe: BASE64_URL_ALPHABET,
  gedcom: BASE64_GEDCOM_ALPHABET,
};

export const B32_PRESETS: Record<string, string> = {
  rfc4648_hex: BASE32_HEX_ALPHABET,
  crockford: BASE32_CROCKFORD_ALPHABET,
  zbase32: BASE32_ZBASE32_ALPHABET,
};

export const B58_PRESETS: Record<string, string> = {
  flickr: BASE58_FLICKR_ALPHABET,
};

export function validateAlphabetSize(expectedSize: number) {
  return (val: any): string | null => {
    if (!val || typeof val !== "string") return null;
    const s = val.trim();
    if (!s) return null;
    if (s.length !== expectedSize)
      return `Must be exactly ${expectedSize} characters (got ${s.length})`;
    if (new Set(s).size !== expectedSize) return "Characters must be unique";
    return null;
  };
}

// ─── Base64 ───────────────────────────────────────────────────────

export function customB64Encode(bytes: Uint8Array, alphabet: string): string {
  const hasPad = alphabet.length === 65;
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;

    result += alphabet[(triple >> 18) & 0x3f];
    result += alphabet[(triple >> 12) & 0x3f];
    result += i + 1 < bytes.length ? alphabet[(triple >> 6) & 0x3f] : hasPad ? alphabet[64] : "";
    result += i + 2 < bytes.length ? alphabet[triple & 0x3f] : hasPad ? alphabet[64] : "";
  }
  return result;
}

export function customB64Decode(str: string, alphabet: string): Uint8Array {
  const hasPad = alphabet.length === 65;
  let clean = str.replace(/\s+/g, "");
  if (hasPad) {
    const p = (4 - (clean.length % 4)) % 4;
    if (p > 0 && p < 4) clean += alphabet[64].repeat(p);
  }

  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const e0 = alphabet.indexOf(clean[i]);
    const e1 = alphabet.indexOf(clean[i + 1]);
    const e2 = i + 2 < clean.length ? alphabet.indexOf(clean[i + 2]) : -1;
    const e3 = i + 3 < clean.length ? alphabet.indexOf(clean[i + 3]) : -1;
    const triple = ((e0 & 0x3f) << 18) | ((e1 & 0x3f) << 12) | ((e2 & 0x3f) << 6) | (e3 & 0x3f);

    bytes.push((triple >> 16) & 0xff);
    if (e2 >= 0 && e2 < 64) bytes.push((triple >> 8) & 0xff);
    if (e3 >= 0 && e3 < 64) bytes.push(triple & 0xff);
  }
  return new Uint8Array(bytes);
}

// ─── Base32 ───────────────────────────────────────────────────────

export function customB32Encode(bytes: Uint8Array, alphabet: string): string {
  const hasPad = alphabet.length === 33;
  let result = "";

  for (let i = 0; i < bytes.length; i += 5) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const b3 = i + 3 < bytes.length ? bytes[i + 3] : 0;
    const b4 = i + 4 < bytes.length ? bytes[i + 4] : 0;
    const n = bytes.length - i;

    result += alphabet[(b0 >> 3) & 0x1f];
    result += alphabet[((b0 << 2) | (b1 >> 6)) & 0x1f];

    if (n >= 2) {
      result += alphabet[(b1 >> 1) & 0x1f];
      result += alphabet[((b1 << 4) | (b2 >> 4)) & 0x1f];
    } else {
      if (hasPad) result += alphabet[32].repeat(3);
      continue;
    }

    if (n >= 3) {
      result += alphabet[((b2 << 1) | (b3 >> 7)) & 0x1f];
    } else {
      if (hasPad) result += alphabet[32].repeat(3);
      continue;
    }

    if (n >= 4) {
      result += alphabet[(b3 >> 2) & 0x1f];
      result += alphabet[((b3 << 3) | (b4 >> 5)) & 0x1f];
    } else {
      if (hasPad) result += alphabet[32].repeat(2);
      continue;
    }

    result += alphabet[b4 & 0x1f];
  }

  return result;
}

export function customB32Decode(str: string, alphabet: string): Uint8Array {
  const hasPad = alphabet.length === 33;
  let clean = str.replace(/\s+/g, "");
  if (hasPad) {
    const p = (8 - (clean.length % 8)) % 8;
    if (p > 0 && p < 8) clean += alphabet[32].repeat(p);
  }

  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 8) {
    const e = Array.from({ length: 8 }, (_, j) =>
      i + j < clean.length ? alphabet.indexOf(clean[i + j]) : -1,
    );
    let n = 0;
    for (let j = 0; j < 8; j++) {
      if (e[j] >= 0 && e[j] < 32) n++;
      else break;
    }

    if (n >= 2) bytes.push((e[0] << 3) | (e[1] >> 2));
    if (n >= 4) bytes.push(((e[1] & 0x03) << 6) | (e[2] << 1) | (e[3] >> 4));
    if (n >= 5) bytes.push(((e[3] & 0x0f) << 4) | (e[4] >> 1));
    if (n >= 7) bytes.push(((e[4] & 0x01) << 7) | (e[5] << 2) | (e[6] >> 3));
    if (n >= 8) bytes.push(((e[6] & 0x07) << 5) | e[7]);
  }
  return new Uint8Array(bytes);
}

// ─── Base58 (base-x) ──────────────────────────────────────────────

const b58Cache = new Map<string, ReturnType<typeof base58_lib>>();

function getB58Codec(alphabet: string) {
  let codec = b58Cache.get(alphabet);
  if (!codec) {
    codec = base58_lib(alphabet);
    b58Cache.set(alphabet, codec);
  }
  return codec;
}

export function customB58Encode(bytes: Uint8Array, alphabet: string): string {
  return getB58Codec(alphabet).encode(bytes);
}

export function customB58Decode(str: string, alphabet: string): Uint8Array {
  return getB58Codec(alphabet).decode(str.replace(/\s+/g, ""));
}
