# Focus Lock — Development Guide

Follow this guide to set up the development workspace, build the extension, and test its features.

## 1. Setup Instructions

1. **Install Dependencies:**
   Navigate to the extension directory and run `npm install`:
   ```bash
   cd extensions/focus-lock-extension
   npm install
   ```

2. **Configure Environment:**
   Copy the example environment template and fill in your Supabase endpoint values:
   ```bash
   cp .env.example .env
   ```

---

## 2. Compiling and Loading the Extension

1. **Build Output:**
   To compile TypeScript source files into the output `/dist` directory, run:
   ```bash
   npm run build
   ```

2. **Install Unpacked in Browser (Chrome/Edge/Brave):**
   * Open `chrome://extensions/` (or `edge://extensions/` / `brave://extensions/`).
   * Enable **Developer mode** toggle in the top-right.
   * Click **Load unpacked** in the top-left.
   * Select the `/extensions/focus-lock-extension/` directory (the folder containing `manifest.json`).

---

## 3. Testing Foundation

* **Unit Testing:** Tests live in a `__tests__` folder inside `/extensions/focus-lock-extension/` (to be expanded in subsequent phases).
* **Mocking Browser APIs:** When writing unit tests for `CoreFocusEngine`, inject a mock implementation of the `BrowserAdapter` interface rather than referencing standard `chrome` namespaces, keeping tests extremely lightweight and browser-independent.
