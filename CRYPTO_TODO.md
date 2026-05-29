# Crypto Architecture Refactoring TODO

## Phase 1: Performance & Core Service 🚀
- [x] Optimize `toAB` in `service.ts` (Avoid redundant memory copies for WebCrypto).
- [x] Standardize `HashProvider` registration (Move all hash logic to providers).
- [x] Refactor `CryptoService` wrapper to be more direct and type-safe.

## Phase 2: Extensibility & Node Standardization 🧩
- [x] Standardize `hash.ts` nodes to use the Provider Registry.
- [x] Create `ParamHelper` to unify Key/IV/AAD parsing across nodes.
- [x] Refactor `registry.ts` to use a dynamic registration pattern.

## Phase 3: Performance Caching & DX ⚡
- [x] Implement Hex-to-Bytes caching in node runners to avoid re-parsing during execution.
- [ ] Add support for "Advanced" field grouping in `NodeKindMeta`.
- [ ] (Optional) Explore `DataValue` container for passing complex objects (e.g., `CryptoKey`).
