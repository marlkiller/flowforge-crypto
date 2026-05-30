import { registerNodeDef } from "../registry";
import { getProvider, type HashProvider } from "../service";
import type { GraphNode, NodeDef, NodeKindMeta } from "../types";
import {
  SHA1_META,
  SHA256_META,
  SHA384_META,
  SHA512_META,
  MD5_META,
  SHA3256_META,
  SHA3384_META,
  SHA3512_META,
  KECCAK256_META,
  BLAKE2B_META,
  BLAKE2S_META,
  BLAKE3_META,
  RIPEMD160_META,
  SHAKE128_META,
  SHAKE256_META,
  SM3_META,
  WHIRLPOOL_META,
  SHA0_META,
} from "./meta";

function makeHashNode(algo: string, meta: NodeKindMeta): NodeDef {
  return {
    meta,
    runner: (_: GraphNode, inputs: Record<string, Uint8Array>) => {
      const provider = getProvider(algo) as HashProvider;
      if (!provider) throw new Error(`Hash provider for ${algo} not found`);
      return provider.digest(inputs["data"] ?? new Uint8Array(0));
    },
  };
}

registerNodeDef("sha1", makeHashNode("SHA-1", SHA1_META));
registerNodeDef("sha256", makeHashNode("SHA-256", SHA256_META));
registerNodeDef("sha384", makeHashNode("SHA-384", SHA384_META));
registerNodeDef("sha512", makeHashNode("SHA-512", SHA512_META));
registerNodeDef("md5", makeHashNode("MD5", MD5_META));
registerNodeDef("sha3256", makeHashNode("SHA3-256", SHA3256_META));
registerNodeDef("sha3384", makeHashNode("SHA3-384", SHA3384_META));
registerNodeDef("sha3512", makeHashNode("SHA3-512", SHA3512_META));
registerNodeDef("keccak256", makeHashNode("Keccak-256", KECCAK256_META));
registerNodeDef("blake2b", makeHashNode("BLAKE2b", BLAKE2B_META));
registerNodeDef("blake2s", makeHashNode("BLAKE2s", BLAKE2S_META));
registerNodeDef("blake3", makeHashNode("BLAKE3", BLAKE3_META));
registerNodeDef("ripemd160", makeHashNode("RIPEMD-160", RIPEMD160_META));
registerNodeDef("shake128", makeHashNode("SHAKE128", SHAKE128_META));
registerNodeDef("shake256", makeHashNode("SHAKE256", SHAKE256_META));
registerNodeDef("sm3", makeHashNode("SM3", SM3_META));
registerNodeDef("whirlpool", makeHashNode("Whirlpool", WHIRLPOOL_META));
registerNodeDef("sha0", makeHashNode("SHA-0", SHA0_META));
