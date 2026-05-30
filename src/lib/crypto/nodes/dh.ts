import { registerNodeDef } from "../registry";
import type { GraphNode } from "../types";
import { getField, getParamBytes } from "../utils";

const DH_PRIMES: Record<string, { prime: bigint; generator: bigint }> = {
  "MODP-2048": {
    prime: BigInt(
      "0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF",
    ),
    generator: 2n,
  },
  "MODP-3072": {
    prime: BigInt(
      "0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF",
    ),
    generator: 2n,
  },
};

function bigIntToBytes(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(2, "0");
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const b of bytes) result = (result << 8n) + BigInt(b);
  return result;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

registerNodeDef("dh_keygen", {
  meta: {
    kind: "dh_keygen",
    label: "DH Key Gen",
    category: "asymmetric",
    description: "Generate a Diffie-Hellman key pair using MODP groups.",
    defaultOutput: "hex",
    outputs: [
      { id: "publicKey", label: "Public Key" },
      { id: "privateKey", label: "Private Key" },
    ],
    inputs: [
      {
        id: "group",
        label: "MODP Group",
        type: "select",
        defaultValue: "MODP-2048",
        options: [
          { label: "MODP-2048", value: "MODP-2048" },
          { label: "MODP-3072", value: "MODP-3072" },
        ],
        connectable: false,
      },
    ],
  },
  runner: (node) => {
    const groupName = getField(node, "group", "MODP-2048");
    const group = DH_PRIMES[groupName];
    if (!group) throw new Error(`Unknown DH group: ${groupName}`);
    const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
    const privateKey = bytesToBigInt(privateKeyBytes);
    const publicKey = modPow(group.generator, privateKey, group.prime);
    return { publicKey: bigIntToBytes(publicKey), privateKey: privateKeyBytes };
  },
});

registerNodeDef("dh_derive", {
  meta: {
    kind: "dh_derive",
    label: "DH Derive",
    category: "asymmetric",
    description: "Derive a shared secret using traditional Diffie-Hellman.",
    defaultOutput: "hex",
    inputs: [
      {
        id: "privateKey",
        label: "My Private Key",
        connectable: true,
        acceptTypes: ["hex", "base64"],
      },
      {
        id: "publicKey",
        label: "Peer Public Key",
        connectable: true,
        acceptTypes: ["hex", "base64"],
      },
      {
        id: "group",
        label: "MODP Group",
        type: "select",
        defaultValue: "MODP-2048",
        options: [
          { label: "MODP-2048", value: "MODP-2048" },
          { label: "MODP-3072", value: "MODP-3072" },
        ],
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const groupName = getField(node, "group", "MODP-2048");
    const group = DH_PRIMES[groupName];
    if (!group) throw new Error(`Unknown DH group: ${groupName}`);
    const skBytes = getParamBytes(node as GraphNode, inputs, "privateKey");
    const pkBytes = getParamBytes(node as GraphNode, inputs, "publicKey");
    if (!skBytes || !pkBytes) throw new Error("Both private and public keys are required");
    const shared = modPow(bytesToBigInt(pkBytes), bytesToBigInt(skBytes), group.prime);
    return bigIntToBytes(shared);
  },
});
