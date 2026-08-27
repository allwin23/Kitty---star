# Focus Lock — Browser Extension Shell (Phase 0)

Focus Lock is a cross-device distraction blocker coordinating a React Native mobile application, a Supabase Realtime synchronization backend, and a Chromium Manifest V3 browser extension.

This folder contains the **decoupled extension shell** created during **Phase 0**.

## 1. Project Organization
```text
extensions/focus-lock-extension/
├── manifest.json       # MV3 Manifest
├── package.json        # Build scripts
├── tsconfig.json       # TypeScript options
├── background/         # Service worker bootstrap
│   └── index.ts
├── blocking/           # Decoupled Rules and Adapters
│   ├── adapter.ts      # Browser abstractions
│   └── engine.ts       # Core business logic
├── docs/               # Technical specs & guides
│   ├── architecture.md
│   ├── development.md
│   ├── security.md
│   └── state-machine.md
├── shared/             # Common models
│   ├── constants.ts
│   └── types.ts
└── ui/                 # Popup files
    ├── popup.html
    └── popup.ts
```

## 2. Decoupled Interface Strategy
To ensure multi-browser compatibility (Chrome, Microsoft Edge, Brave) and decouple code from browser environments, all Chromium dependencies (`chrome.*`) are sequestered behind the `BrowserAdapter` interface inside [`blocking/adapter.ts`](blocking/adapter.ts). 

The primary coordinator, [`CoreFocusEngine`](blocking/engine.ts), functions independently of the runtime environment by consuming this adapter, enabling clean test mocks.

---

## 3. Getting Started
* For installation and build guidelines, refer to the [Development Guide](docs/development.md).
* For detailed state specifications, refer to the [State Machine Spec](docs/state-machine.md).
* For security parameters, refer to the [Security Architecture Spec](docs/security.md).
