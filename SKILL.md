# FlowForge Crypto Architecture & Development Guide

## 1. Architecture Overview

FlowForge Crypto is built on a **Metadata-Driven, Decoupled Architecture**. It separates UI representation, cryptographic implementation, and graph execution into distinct layers.

### Layered Structure

- **UI Layer (`src/components`)**: React components (PascalCase) and Hooks (camelCase). Powered by React Flow.
- **Service Layer (`src/lib/crypto/service.ts`)**: Pure cryptographic engine. Operates on `Uint8Array`. Ignorant of UI nodes.
- **Provider Layer (`src/lib/crypto/providers/`)**: Modular algorithm implementations (e.g., WebCrypto, Noble, Forge).
- **Execution Layer (`src/lib/crypto/executor.ts`)**: Runs in a Web Worker to keep the UI responsive.
- **Metadata Layer (`src/lib/crypto/nodes/meta.ts`)**: Lightweight node definitions for lazy loading.

---

## 2. Coding Standards

### Naming Conventions

- **React Components**: `PascalCase.tsx` (e.g., `CryptoNode.tsx`, `PluginManager.tsx`)
- **React Hooks**: `camelCase.ts` (e.g., `useGraphExecution.ts`)
- **Utility/Logic Files**: `camelCase.ts` (e.g., `errorCapture.ts`, `topoSort.ts`)
- **Shadcn UI**: `kebab-case.tsx` (as per library convention)

### Core Data Type

Always prefer **`Uint8Array`** for binary data passing. Use `service.ts` converters for string/hex/base64 transformations.

---

## 3. Node Development Workflow

### Step 1: Define Metadata

For heavyweight nodes (those with large dependencies like RSA), add metadata to `src/lib/crypto/nodes/meta.ts`.

```typescript
export const MY_ALGO_META: NodeKindMeta = {
  kind: "my_algo",
  label: "My Algorithm",
  category: "cipher",
  description: "Secure encryption node.",
  inputs: [{ id: "data", label: "Data" }],
  fields: [{ id: "key", label: "Key (Hex)", type: "password", validate: validateHex(32) }],
};
```

### Step 2: Implement Runner

Implement the logic in `src/lib/crypto/nodes/`. If the node is lazy-loaded, ensure it exports a `NodeDef`.

```typescript
// src/lib/crypto/nodes/my_algo.ts
import { registerNodeDef } from "../registry";
import { MY_ALGO_META } from "./meta";

registerNodeDef("my_algo", {
  meta: MY_ALGO_META,
  runner: async (node, inputs) => {
    const data = inputs["data"];
    // ... logic
    return result;
  },
});
```

### Step 3: Registration (`src/lib/crypto/setup.ts`)

- **Lightweight nodes**: `import "./nodes/simple.ts";`
- **Heavyweight nodes**:
  ```typescript
  registerLazyNode("my_algo", MY_ALGO_META, () => import("./nodes/my_algo"));
  ```

---

## 4. Provider System

Providers abstract the implementation of an algorithm (e.g., switching between WebCrypto and a JS fallback).

- **Location**: `src/lib/crypto/providers/`
- **Registration**: Call `registerProvider()` in the module.
- **Consumption**: Use `getProvider("ALGO_NAME")` inside a Node Runner.

---

## 5. Execution Engine (Web Worker)

- **Worker File**: `src/lib/crypto/executor.worker.ts`
- **Execution Flow**:
  1. UI triggers `execute()` (with debounce).
  2. Plugin URLs are synced to Worker.
  3. Worker parallel-loads all required plugins.
  4. Worker executes graph in topological order.
  5. Results/Errors are posted back to the UI.

---

## 6. Plugin System (Extensibility)

Users can inject custom logic without modifying the core.

- **Format**: ESM module exporting a `nodeDef` or `provider`.
- **Injection**: Handled by `PluginManager.tsx` via URL or Inline Editor.
- **Sync**: Automatically synchronized to the Web Worker before execution.

---

## 7. Directory Structure (Optimized)

```
src/
├── components/
│   ├── ThemeProvider.tsx
│   ├── ThemeToggle.tsx
│   ├── graph/
│   │   ├── CryptoGraphEditor.tsx   — Orchestrator
│   │   ├── hooks/                  — useGraphExecution, useGraphInteraction
│   │   ├── parts/                  — Sidebar, GraphDialogs, WorkflowTab
│   │   └── store.ts                — Unified state management
│   └── ui/                         — Essential Shadcn components
├── lib/
│   ├── crypto/
│   │   ├── nodes/                  — Node implementations
│   │   ├── providers/              — Algorithm implementations (aes, rsaEcc, etc.)
│   │   ├── types/                  — index.ts (TS types), sm-crypto.d.ts (Shims)
│   │   ├── executor.ts             — Main thread engine
│   │   ├── executor.worker.ts      — Worker thread engine
│   │   ├── registry.ts             — Node/Metadata registry
│   │   ├── service.ts              — Core CryptoService
│   │   └── setup.ts                — Application bootstrapper
│   ├── errorCapture.ts             — SSR Error recovery
│   └── errorPage.ts                — Visual error templates
└── routes/
    ├── __root.tsx                  — App shell
    └── index.tsx                   — Editor entry
```
