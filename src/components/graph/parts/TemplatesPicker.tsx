import { useState, useEffect, useCallback } from "react";
import { X, Sparkles } from "lucide-react";
import { graphStore } from "../store";
import {
  getAESStandardSeed,
  getRSAFullSuiteSeed,
  getHMACSeed,
  getKDFSeed,
  getECCSuiteSeed,
  getJWTSeed,
  getOTPSeed,
  getXChaCha20Seed,
  getSM4Seed,
} from "@/presets/seeds";

const PICKER_DISMISSED_KEY = "cryptoflow-picker-dismissed";

const demos = [
  { label: "AES (Standard)", seed: getAESStandardSeed() },
  { label: "RSA (Full Suite)", seed: getRSAFullSuiteSeed() },
  { label: "HMAC (SHA-256)", seed: getHMACSeed() },
  { label: "KDF (PBKDF2 + AES)", seed: getKDFSeed() },
  { label: "ECC (ECDSA Suite)", seed: getECCSuiteSeed() },
  { label: "JWT (Sign & Verify)", seed: getJWTSeed() },
  { label: "TOTP (Authenticator)", seed: getOTPSeed() },
  { label: "XChaCha20-Poly1305", seed: getXChaCha20Seed() },
  { label: "SM4 (ECB)", seed: getSM4Seed() },
];

export function TemplatesPicker() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(PICKER_DISMISSED_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    localStorage.setItem(PICKER_DISMISSED_KEY, "true");
  }, []);

  const loadDemo = useCallback(
    (seed: { name: string; nodes: any[]; edges: any[] }) => {
      graphStore.setActiveGraph(seed);
      graphStore.renameWorkflow(graphStore.getActive().id, seed.name);
      dismiss();
    },
    [dismiss],
  );

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-[420px] max-w-[90vw] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Welcome to FlowForge Crypto</h2>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="px-5 pt-3 text-[11px] text-muted-foreground">
          Get started with a demo workflow, or close to begin from scratch.
        </p>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {demos.map((d) => (
            <button
              key={d.label}
              onClick={() => loadDemo(d.seed)}
              className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border/50 flex justify-end">
          <button
            onClick={dismiss}
            className="px-4 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start from Scratch
          </button>
        </div>
      </div>
    </div>
  );
}
