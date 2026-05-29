import { cpSync, existsSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error("dist/ not found. Run `vite build` first.");
  process.exit(1);
}

const clientDir = join(dist, "client");
const serverFile = join(dist, "server", "server.js");

// 1. Move client assets to root assets/
const distAssets = join(dist, "assets");
if (existsSync(distAssets)) rmSync(distAssets, { recursive: true });

const clientAssets = join(clientDir, "assets");
if (existsSync(clientAssets)) {
  cpSync(clientAssets, distAssets, { recursive: true });
  console.log("✓ Copied client assets → dist/assets/");
}
rmSync(clientDir, { recursive: true });

// 2. Create _worker.js wrapper
const wrapper = `import server from "./server/server.js";
export default server;
`;
writeFileSync(join(dist, "_worker.js"), wrapper, "utf-8");
console.log("✓ Created dist/_worker.js");

// 3. Create _routes.json to exclude static assets from worker
const routes = { version: 1, include: ["/*"], exclude: ["/assets/*"] };
writeFileSync(join(dist, "_routes.json"), JSON.stringify(routes), "utf-8");
console.log("✓ Created dist/_routes.json");

// Verify
const files = readdirSync(dist);
console.log(`\ndist/ contents: ${files.join(", ")}`);
