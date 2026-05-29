// Legacy re-export for backward compatibility
// This file acts as a bridge until all imports are updated to use the new modular structure

// Core Graph Execution Engine - DEPRECATED: Use the modular imports below
// import { executeGraph } from "@/lib/crypto/executor";
// import * as ENGINE from "@/lib/crypto";

export { executeGraph } from "./executor";
export * from "./types";
export * from "./registry";
export * from "./topoSort";
export * from "./executor";
