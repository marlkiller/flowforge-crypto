import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isStaticExport = process.env.STATIC_EXPORT === "true";

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  worker: {
    format: "es",
  },
  plugins: [
    ...tanstackStart({
      server: {
        entry: "server",
      },
      ...(isStaticExport
        ? {
            spa: {
              enabled: true,
              maskPath: "/",
            },
          }
        : {}),
    }),
    react(),
    tailwindcss(),
    tsconfigPaths({
      projects: ["./tsconfig.json"],
    }),
  ],
});
