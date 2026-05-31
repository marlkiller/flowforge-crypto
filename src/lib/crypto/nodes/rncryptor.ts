import { registerNodeDef } from "../registry";
import { getProvider, type KdfProvider, type CipherProvider, type MacProvider } from "../service";
import { getParamBytes } from "../utils";

const VERSION = 0x03;
const OPTIONS = 0x01;
const ITERATIONS = 10000;
const KEY_LEN = 32; // AES-256

async function deriveKey(password: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  const provider = getProvider("PBKDF2") as KdfProvider;
  return provider.derive(password, salt, KEY_LEN * 8, { iterations: ITERATIONS, hash: "SHA-256" });
}

registerNodeDef("rncryptor_encrypt", {
  meta: {
    kind: "rncryptor_encrypt",
    label: "RNCryptor Encrypt",
    category: "protocol",
    description: "RNCryptor v3: PBKDF2 + AES-256-CBC + HMAC-SHA256.",
    defaultOutput: "base64",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "password",
        label: "Password",
        type: "password",
        connectable: true,
        acceptTypes: ["utf8"],
      },
    ],
  },
  runner: async (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const password = getParamBytes(node, inputs, "password") || new Uint8Array(0);

    const encSalt = crypto.getRandomValues(new Uint8Array(8));
    const hmacSalt = crypto.getRandomValues(new Uint8Array(8));
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const encKey = await deriveKey(password, encSalt);
    const hmacKey = await deriveKey(password, hmacSalt);

    const cipher = getProvider("AES-CBC") as CipherProvider;
    const ciphertext = await cipher.encrypt(encKey, iv, data);

    const header = new Uint8Array(2 + 8 + 8 + 16);
    header[0] = VERSION;
    header[1] = OPTIONS;
    header.set(encSalt, 2);
    header.set(hmacSalt, 10);
    header.set(iv, 18);

    const packetWithoutHmac = new Uint8Array(header.length + ciphertext.length);
    packetWithoutHmac.set(header, 0);
    packetWithoutHmac.set(ciphertext, header.length);

    const mac = getProvider("HMAC") as MacProvider;
    const hmacValue = await mac.sign(hmacKey, packetWithoutHmac, { hash: "SHA-256" });

    const finalPacket = new Uint8Array(packetWithoutHmac.length + hmacValue.length);
    finalPacket.set(packetWithoutHmac, 0);
    finalPacket.set(hmacValue, packetWithoutHmac.length);

    return finalPacket;
  },
});

registerNodeDef("rncryptor_decrypt", {
  meta: {
    kind: "rncryptor_decrypt",
    label: "RNCryptor Decrypt",
    category: "protocol",
    description: "Decrypt RNCryptor v3 packet.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Encrypted Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "password",
        label: "Password",
        type: "password",
        connectable: true,
        acceptTypes: ["utf8"],
      },
    ],
  },
  runner: async (node, inputs) => {
    const packet = inputs["data"] ?? new Uint8Array(0);
    const password = getParamBytes(node, inputs, "password") || new Uint8Array(0);

    if (packet.length < 2 + 8 + 8 + 16 + 32) {
      throw new Error("Invalid RNCryptor packet: too short");
    }

    const version = packet[0];
    if (version !== VERSION) {
      throw new Error(`Unsupported RNCryptor version: ${version}`);
    }

    const encSalt = packet.slice(2, 10);
    const hmacSalt = packet.slice(10, 18);
    const iv = packet.slice(18, 34);
    const ciphertext = packet.slice(34, packet.length - 32);
    const expectedHmac = packet.slice(packet.length - 32);

    const hmacKey = await deriveKey(password, hmacSalt);
    const mac = getProvider("HMAC") as MacProvider;
    const packetToVerify = packet.slice(0, packet.length - 32);
    const isValid = await mac.verify(hmacKey, expectedHmac, packetToVerify, { hash: "SHA-256" });

    if (!isValid) {
      throw new Error(
        "RNCryptor decryption failed: HMAC mismatch (wrong password or corrupted data)",
      );
    }

    const encKey = await deriveKey(password, encSalt);
    const cipher = getProvider("AES-CBC") as CipherProvider;
    return cipher.decrypt(encKey, iv, ciphertext);
  },
});
