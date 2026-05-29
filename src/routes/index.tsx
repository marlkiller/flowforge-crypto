import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const CryptoGraphEditor = lazy(() => import("@/components/graph/CryptoGraphEditor"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CryptoFlow — Visual Crypto Pipeline Editor" },
      {
        name: "description",
        content: "Drag-and-drop node graph editor for crypto pipelines: Base64, AES, SHA-256.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  // Belt-and-suspenders: only render the React Flow editor in the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
        Loading editor…
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
          Loading editor…
        </div>
      }
    >
      <CryptoGraphEditor />
    </Suspense>
  );
}
