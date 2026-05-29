# FlowForge Crypto

A visual, node-based cryptography workbench designed for developers and security researchers. Build, test, and debug cryptographic workflows through an intuitive drag-and-drop interface.

![Overview](./imgs/overview.png)

**🌐 Live Demo: [flowforge-crypto.pages.dev](https://flowforge-crypto.pages.dev/)**

## ✨ Features

- **Visual Graph Editor**: Design complex cryptographic pipelines using a node-based interface powered by [XYFlow](https://xyflow.com/).
- **Comprehensive Node Library**:
  - **I/O**: Input and Output nodes for data entry and result visualization.
  - **Hashing**: SHA-256, SHA-3, MD5, and more via specialized providers.
  - **Symmetric Ciphers**: AES (GCM/CBC), ChaCha20-Poly1305.
  - **Asymmetric**: RSA, ECC (Elliptic Curve Cryptography).
  - **Encoding**: Base64, Hex, Base58, Base32, UTF-8.
  - **KDF & MAC**: PBKDF2, Argon2, HMAC.
  - **Protocols & Utils**: JWT (JSON Web Tokens), OTP (TOTP/HOTP), String manipulation.
- **Real-time Execution**: Immediate computation as you modify parameters or connections.
- **Detailed Execution Logs**: Track every step of the cryptographic process with precise timing and status reports.
- **Modern Tech Stack**: Built with React 19, Vite, TanStack Router, and Shadcn UI.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🏗️ Architecture

The project follows a modular architecture:

- **Registry**: Centralized registration for all node types and their metadata.
- **Engine**: Handles the graph execution, topological sorting, and data flow.
- **Service Layer**: Provides a unified, type-safe wrapper around WebCrypto and third-party crypto libraries.
- **Components**: UI built with Shadcn components, customized for a professional dark-themed editor experience.

## 🛠️ Development

- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Static Export**: `npm run build:static`

## 📄 License

[Apache License 2.0](./LICENSE)
