import { useState, useMemo } from "react";
import { DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { graphStore } from "../store";
import {
  getAESStandardSeed,
  getRSAFullSuiteSeed,
  getHMACSeed,
  getKDFSeed,
  getECCSuiteSeed,
  getJWTSeed,
  getOTPSeed,
  getArgon2Seed,
  getRNCryptorV3Seed,
  getEd25519X25519SuiteSeed,
  getXChaCha20Seed,
  getAesGcmSivSeed,
  getBcryptSeed,
  getModernHashSeed,
  getModernMacSeed,
  getSM3Seed,
  getSM4Seed,
  getSM2SuiteSeed,
} from "@/demo/seeds";

export function DemoMenu() {
  const [query, setQuery] = useState("");
  const demos = useMemo(
    () => [
      { label: "AES (Standard)", seed: getAESStandardSeed() },
      { label: "RSA (Full Suite)", seed: getRSAFullSuiteSeed() },
      { label: "HMAC (SHA-256)", seed: getHMACSeed() },
      { label: "KDF (PBKDF2 + AES)", seed: getKDFSeed() },
      { label: "ECC (ECDSA Suite)", seed: getECCSuiteSeed() },
      { label: "JWT (Sign & Verify)", seed: getJWTSeed() },
      { label: "TOTP (Authenticator)", seed: getOTPSeed() },
      { label: "Argon2 (Password Hash)", seed: getArgon2Seed() },
      { label: "RNCryptor v3 (Standard)", seed: getRNCryptorV3Seed() },
      { label: "Ed25519/X25519 Suite", seed: getEd25519X25519SuiteSeed() },
      { label: "XChaCha20-Poly1305", seed: getXChaCha20Seed() },
      { label: "AES-GCM-SIV", seed: getAesGcmSivSeed() },
      { label: "bcrypt (Hash & Verify)", seed: getBcryptSeed() },
      { label: "Modern Hash Suite", seed: getModernHashSeed() },
      { label: "Modern MAC (Poly1305 + CMAC)", seed: getModernMacSeed() },
      { label: "SM3 (Hash)", seed: getSM3Seed() },
      { label: "SM4 (ECB)", seed: getSM4Seed() },
      { label: "SM2 (Full Suite)", seed: getSM2SuiteSeed() },
    ],
    [],
  );

  const filtered = useMemo(
    () => demos.filter((d) => d.label.toLowerCase().includes(query.toLowerCase())),
    [query, demos],
  );

  return (
    <DropdownMenuContent align="center" className="w-48">
      <div className="px-2 pt-2 pb-1">
        <Input
          placeholder="Search demos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 text-[11px]"
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-2 py-4 text-center text-[10px] opacity-40">No demos found</div>
        ) : (
          filtered.map((d) => (
            <DropdownMenuItem
              key={d.label}
              onClick={() => graphStore.setActiveGraph(d.seed)}
              className="text-[11px] cursor-pointer"
            >
              {d.label}
            </DropdownMenuItem>
          ))
        )}
      </div>
    </DropdownMenuContent>
  );
}
