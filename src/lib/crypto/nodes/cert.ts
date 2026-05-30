import { registerNodeDef } from "../registry";
import { utf8ToBytes, bytesToUtf8, bytesToB64, b64ToBytes } from "../service";
import { getField } from "../utils";
import * as forge from "node-forge";

registerNodeDef("x509Parse", {
  meta: {
    kind: "x509Parse",
    label: "X.509 Parse",
    category: "protocol",
    description: "Parse an X.509 certificate in PEM format and display its fields.",
    defaultOutput: "utf8",
    inputs: [
      {
        id: "pem",
        label: "Certificate (PEM)",
        connectable: true,
        acceptTypes: ["utf8"],
        type: "textarea",
        placeholder: "Paste PEM certificate...",
      },
    ],
  },
  runner: (node, inputs) => {
    const pemText = inputs["pem"]
      ? bytesToUtf8(inputs["pem"])
      : getField(node, "pem", "");
    if (!pemText?.trim()) throw new Error("PEM certificate input is required");
    const cert = forge.pki.certificateFromPem(pemText);
    const lines: string[] = [];
    lines.push(`Subject: ${cert.subject.attributes.map((a: any) => `${a.name}=${a.value}`).join(", ")}`);
    lines.push(`Issuer: ${cert.issuer.attributes.map((a: any) => `${a.name}=${a.value}`).join(", ")}`);
    lines.push(`Serial: ${cert.serialNumber}`);
    lines.push(`Valid From: ${cert.validity.notBefore}`);
    lines.push(`Valid To: ${cert.validity.notAfter}`);
    lines.push(`Version: ${cert.version}`);
    const sigAlg = (cert as any).signatureOid || "unknown";
    lines.push(`Signature Algorithm: ${sigAlg}`);
    const pubKey = cert.publicKey as any;
    if (pubKey) {
      if (pubKey.n) {
        const nHex = pubKey.n.toString(16);
        lines.push(`Public Key: RSA (${nHex.length * 4} bits)`);
      } else if (pubKey.curve) {
        lines.push(`Public Key: EC (${pubKey.curve})`);
      }
      if (pubKey.e) {
        lines.push(`Exponent: ${pubKey.e}`);
      }
    }
    const extLines: string[] = [];
    if (cert.extensions) {
      for (const ext of cert.extensions) {
        if (ext.name === "subjectAltName") {
          const names = (ext as any).altNames?.map((a: any) => a.value).join(", ") || "";
          extLines.push(`  Subject Alt Names: ${names}`);
        } else if (ext.name === "basicConstraints") {
          extLines.push(`  CA: ${(ext as any).cA}`);
        } else {
          extLines.push(`  ${ext.name}: ${JSON.stringify(ext.value ?? ext)}`);
        }
      }
    }
    if (extLines.length > 0) {
      lines.push(`Extensions (${cert.extensions?.length ?? 0}):`);
      lines.push(...extLines);
    }
    const asn1 = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const fp = forge.md.sha256.create().update(asn1).digest().toHex();
    lines.push(`\nFingerprint (SHA-256): ${fp}`);
    return utf8ToBytes(lines.join("\n"));
  },
});

registerNodeDef("pemDerConvert", {
  meta: {
    kind: "pemDerConvert",
    label: "PEM ↔ DER",
    category: "encoding",
    description: "Convert between PEM and DER certificate/key formats.",
    defaultOutput: "utf8",
    inputs: [
      {
        id: "input",
        label: "Input",
        connectable: true,
        acceptTypes: ["utf8"],
        type: "textarea",
        placeholder: "Paste PEM or DER (hex/base64)...",
      },
      {
        id: "direction",
        label: "Direction",
        type: "select",
        defaultValue: "pemToDer",
        options: [
          { label: "PEM → DER (hex)", value: "pemToDer" },
          { label: "DER (hex) → PEM", value: "derToPem" },
          { label: "PEM → DER (base64)", value: "pemToDerB64" },
          { label: "DER (hex) → DER (base64)", value: "derHexToB64" },
        ],
        connectable: false,
      },
      {
        id: "pemLabel",
        label: "PEM Label",
        type: "text",
        defaultValue: "CERTIFICATE",
        connectable: false,
        visible: (d) => (d["direction"] as string)?.startsWith("der"),
      },
    ],
  },
  runner: (node, inputs) => {
    const direction = getField(node, "direction", "pemToDer");
    const inputText = inputs["input"]
      ? bytesToUtf8(inputs["input"])
      : getField(node, "input", "");
    if (!inputText?.trim()) throw new Error("Input is required");

    if (direction === "pemToDer") {
      const cleaned = inputText
        .replace(/-----BEGIN [^-]+-----/g, "")
        .replace(/-----END [^-]+-----/g, "")
        .replace(/\s+/g, "");
      const der = b64ToBytes(cleaned);
      return utf8ToBytes(Array.from(der).map((b) => b.toString(16).padStart(2, "0")).join(""));
    }

    if (direction === "pemToDerB64") {
      const cleaned = inputText
        .replace(/-----BEGIN [^-]+-----/g, "")
        .replace(/-----END [^-]+-----/g, "")
        .replace(/\s+/g, "");
      return utf8ToBytes(cleaned);
    }

    if (direction === "derToPem") {
      const derBytes = new Uint8Array(
        inputText.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [],
      );
      const b64 = bytesToB64(derBytes);
      const pemLabel = getField(node, "pemLabel", "CERTIFICATE");
      const lines = b64.match(/.{1,64}/g) || [];
      return utf8ToBytes(`-----BEGIN ${pemLabel}-----\n${lines.join("\n")}\n-----END ${pemLabel}-----`);
    }

    if (direction === "derHexToB64") {
      const derBytes = new Uint8Array(
        inputText.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [],
      );
      return utf8ToBytes(bytesToB64(derBytes));
    }

    return utf8ToBytes("Unknown conversion direction");
  },
});

registerNodeDef("jwkConvert", {
  meta: {
    kind: "jwkConvert",
    label: "JWK Convert",
    category: "encoding",
    description: "Display JWK details or convert between formats (using jose).",
    defaultOutput: "utf8",
    inputs: [
      {
        id: "keyData",
        label: "Key (PEM/JWK JSON)",
        connectable: true,
        acceptTypes: ["utf8"],
        type: "textarea",
        placeholder: "PEM public/private key or JWK JSON...",
      },
      {
        id: "direction",
        label: "Direction",
        type: "select",
        defaultValue: "pemToJwk",
        options: [
          { label: "PEM → JWK", value: "pemToJwk" },
          { label: "JWK → PEM (SPKI)", value: "jwkToPem" },
          { label: "Analyze JWK", value: "analyzeJwk" },
        ],
        connectable: false,
      },
    ],
  },
  runner: async (node, inputs) => {
    const direction = getField(node, "direction", "pemToJwk");
    const jose = await import("jose");

    function derBytesToPem(raw: Uint8Array, label: string): string {
      const b64 = bytesToB64(raw);
      const lines = b64.match(/.{1,64}/g) || [];
      return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
    }

    function rawInputText(): string {
      const wireBytes = inputs["keyData"];
      const fieldStr = getField(node, "keyData", "");
      if (wireBytes && wireBytes.length > 0) return bytesToUtf8(wireBytes).trim();
      if (fieldStr?.trim()) return fieldStr.trim();
      throw new Error("Key data is required");
    }

    function rawDerToPem(): string {
      const wireBytes = inputs["keyData"]!;
      return derBytesToPem(wireBytes, "PUBLIC KEY");
    }

    if (direction === "pemToJwk") {
      let pem: string;
      const wireBytes = inputs["keyData"];
      if (wireBytes && wireBytes.length > 0) {
        const head = String.fromCharCode(wireBytes[0], wireBytes[1], wireBytes[2], wireBytes[3], wireBytes[4], wireBytes[5], wireBytes[6], wireBytes[7], wireBytes[8], wireBytes[9], wireBytes[10]);
        pem = head.startsWith("-----BEGIN ") ? bytesToUtf8(wireBytes).trim() : rawDerToPem();
      } else {
        const fieldStr = getField(node, "keyData", "");
        if (!fieldStr?.trim()) throw new Error("Key data is required");
        pem = fieldStr.trim();
      }
      let lastError = "";
      let isPrivate = pem.includes("PRIVATE KEY");
      const algsToTry: Array<{ alg: string; private: boolean }> = [];
      const baseAlgs = /RSA/.test(pem) ? ["RS256", "RS384", "RS512"] : /EC|ECDSA/.test(pem) ? ["ES256", "ES384", "ES512"] : ["RS256", "ES256", "RS384", "ES384"];
      for (const a of baseAlgs) {
        algsToTry.push({ alg: a, private: isPrivate });
        if (!isPrivate) algsToTry.push({ alg: a, private: true });
      }
      let cryptoKey: any = null;
      for (const { alg, private: usePkcs8 } of algsToTry) {
        try {
          cryptoKey = usePkcs8 ? await jose.importPKCS8(pem, alg) : await jose.importSPKI(pem, alg);
          break;
        } catch (e: any) {
          lastError = e.message || e.code || String(e);
        }
      }
      if (!cryptoKey) {
        throw new Error(
          `PEM to JWK failed — could not determine key algorithm. Last error: ${lastError}. ` +
          `Ensure the PEM/key data is a valid SPKI/PKCS8 key (RSA or EC).`,
        );
      }
      const jwk = await jose.exportJWK(cryptoKey);
      return utf8ToBytes(JSON.stringify(jwk, null, 2));
    }

    if (direction === "jwkToPem") {
      let jwk: any;
      try { jwk = JSON.parse(rawInputText()); } catch {
        throw new Error("Invalid JWK JSON");
      }
      try {
        const key = await jose.importJWK(jwk);
        const spki = await jose.exportSPKI(key as any);
        return utf8ToBytes(spki);
      } catch (e: any) {
        throw new Error(`JWK to PEM conversion failed: ${e.message}`);
      }
    }

    if (direction === "analyzeJwk") {
      let jwk: any;
      try { jwk = JSON.parse(rawInputText()); } catch {
        throw new Error("Invalid JWK JSON");
      }
      const lines: string[] = [];
      lines.push(`Key Type (kty): ${jwk.kty ?? "N/A"}`);
      if (jwk.alg) lines.push(`Algorithm (alg): ${jwk.alg}`);
      if (jwk.crv) lines.push(`Curve (crv): ${jwk.crv}`);
      if (jwk.kid) lines.push(`Key ID (kid): ${jwk.kid}`);
      if (jwk.use) lines.push(`Use (use): ${jwk.use}`);
      if (jwk.key_ops) lines.push(`Key Ops: ${(jwk.key_ops as string[]).join(", ")}`);
      if (jwk.n) lines.push(`RSA Modulus (n): ${jwk.n.substring(0, 40)}... (${jwk.n.length * 6} bits est.)`);
      if (jwk.x) lines.push(`EC X: ${jwk.x.substring(0, 20)}...`);
      if (jwk.y) lines.push(`EC Y: ${jwk.y.substring(0, 20)}...`);
      if (jwk.d) lines.push(`Private Key (d): present`);
      lines.push(`\nFull JWK fields: ${Object.keys(jwk).join(", ")}`);
      return utf8ToBytes(lines.join("\n"));
    }

    return utf8ToBytes("Unknown conversion");
  },
});

registerNodeDef("sshKeyParse", {
  meta: {
    kind: "sshKeyParse",
    label: "SSH Key Parse",
    category: "protocol",
    description: "Parse an SSH public key (authorized_keys format) and display its details.",
    defaultOutput: "utf8",
    inputs: [
      {
        id: "keyData",
        label: "SSH Public Key",
        connectable: true,
        acceptTypes: ["utf8"],
        type: "textarea",
        placeholder: "ssh-ed25519 AAAAC3... comment",
      },
    ],
  },
  runner: (node, inputs) => {
    const inputText = inputs["keyData"]
      ? bytesToUtf8(inputs["keyData"])
      : getField(node, "keyData", "");
    if (!inputText?.trim()) throw new Error("SSH public key is required");
    const parts = inputText.trim().split(/\s+/);
    if (parts.length < 2) throw new Error("Invalid SSH key format (need at least type + b64 data)");
    const keyType = parts[0];
    const b64Data = parts[1];
    const comment = parts.slice(2).join(" ") || "(no comment)";
    const lines: string[] = [];
    lines.push(`Key Type: ${keyType}`);
    lines.push(`Comment: ${comment}`);
    try {
      const raw = b64ToBytes(b64Data);
      const decoder = new TextDecoder();
      let offset = 0;
      const readLen = (): number => {
        const len = (raw[offset] << 24) | (raw[offset + 1] << 16) | (raw[offset + 2] << 8) | raw[offset + 3];
        offset += 4;
        return len;
      };
      const readStr = (): string => {
        const len = readLen();
        const str = decoder.decode(raw.slice(offset, offset + len));
        offset += len;
        return str;
      };
      const embeddedType = readStr();
      lines.push(`Embedded Type: ${embeddedType}`);
      if (embeddedType === "ssh-rsa") {
        readStr();
        const n = raw.slice(offset);
        lines.push(`Modulus (n): ${n.length * 8} bits est.`);
      } else if (embeddedType === "ssh-ed25519") {
        const pubKey = raw.slice(offset);
        const hex = Array.from(pubKey).map((b) => b.toString(16).padStart(2, "0")).join("");
        lines.push(`Public Key (hex): ${hex}`);
        lines.push(`Key Length: ${pubKey.length} bytes`);
      } else if (embeddedType.startsWith("ecdsa-")) {
        const curve = readStr();
        readStr();
        lines.push(`Curve: ${curve}`);
      }
      lines.push(`Raw data length: ${raw.length} bytes`);
    } catch (e) {
      lines.push(`Parse error: ${(e as Error).message}`);
    }
    return utf8ToBytes(lines.join("\n"));
  },
});
