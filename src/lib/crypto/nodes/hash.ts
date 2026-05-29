import type { NodeDef } from "../types";
import { getProvider, type HashProvider } from "../service";

function makeHashNode(algo: string, kind: string, label: string, description: string): NodeDef {
  return {
    meta: {
      kind,
      label,
      category: "hash",
      description,
      defaultOutput: "hex",
      inputs: [{ id: "data", label: "Data" }],
    },
    runner: (node, inputs) => {
      const provider = getProvider(algo) as HashProvider;
      if (!provider) throw new Error(`Hash provider for ${algo} not found`);
      return provider.digest(inputs["data"] ?? new Uint8Array(0));
    },
  };
}

export const hashNodes: Record<string, NodeDef> = {
  sha1: makeHashNode("SHA-1", "sha1", "SHA-1", "SHA-1 digest."),
  sha256: makeHashNode("SHA-256", "sha256", "SHA-256", "SHA-256 digest."),
  sha384: makeHashNode("SHA-384", "sha384", "SHA-384", "SHA-384 digest."),
  sha512: makeHashNode("SHA-512", "sha512", "SHA-512", "SHA-512 digest."),
  md5: makeHashNode("MD5", "md5", "MD5", "Legacy MD5 digest."),
  sha3256: makeHashNode("SHA3-256", "sha3256", "SHA3-256", "SHA3-256 digest."),
  sha3384: makeHashNode("SHA3-384", "sha3384", "SHA3-384", "SHA3-384 digest."),
  sha3512: makeHashNode("SHA3-512", "sha3512", "SHA3-512", "SHA3-512 digest."),
  keccak256: makeHashNode(
    "Keccak-256",
    "keccak256",
    "Keccak-256",
    "Keccak-256 digest (Ethereum standard).",
  ),
  blake2b: makeHashNode(
    "BLAKE2b",
    "blake2b",
    "BLAKE2b",
    "BLAKE2b hash (optimized for 64-bit platforms).",
  ),
  blake2s: makeHashNode(
    "BLAKE2s",
    "blake2s",
    "BLAKE2s",
    "BLAKE2s hash (optimized for 8/32-bit platforms).",
  ),
  blake3: makeHashNode(
    "BLAKE3",
    "blake3",
    "BLAKE3",
    "BLAKE3 hash (extremely fast, tree-structured).",
  ),
  ripemd160: makeHashNode(
    "RIPEMD-160",
    "ripemd160",
    "RIPEMD-160",
    "RIPEMD-160 digest (160-bit hash).",
  ),
  shake128: makeHashNode("SHAKE128", "shake128", "SHAKE128", "SHAKE128 XOF (32-byte output)."),
  shake256: makeHashNode("SHAKE256", "shake256", "SHAKE256", "SHAKE256 XOF (64-byte output)."),
  sm3: makeHashNode(
    "SM3",
    "sm3",
    "SM3",
    "SM3 (Chinese national hash standard, GB/T 32905-2016).",
  ),
};
