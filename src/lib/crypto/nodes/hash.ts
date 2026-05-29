import type { NodeDef } from "../types";
import { getProvider, type HashProvider } from "../service";

function makeHashNode(algo: string, label: string, description: string): NodeDef {
  return {
    meta: {
      kind: algo.toLowerCase().replace("-", ""),
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
  sha1: makeHashNode("SHA-1", "SHA-1", "SHA-1 digest."),
  sha256: makeHashNode("SHA-256", "SHA-256", "SHA-256 digest."),
  sha384: makeHashNode("SHA-384", "SHA-384", "SHA-384 digest."),
  sha512: makeHashNode("SHA-512", "SHA-512", "SHA-512 digest."),
  md5: makeHashNode("MD5", "MD5", "Legacy MD5 digest."),
  sha3_256: makeHashNode("SHA3-256", "SHA3-256", "SHA3-256 digest."),
  sha3_384: makeHashNode("SHA3-384", "SHA3-384", "SHA3-384 digest."),
  sha3_512: makeHashNode("SHA3-512", "SHA3-512", "SHA3-512 digest."),
  keccak256: makeHashNode("Keccak-256", "Keccak-256", "Keccak-256 digest (Ethereum standard)."),
};
