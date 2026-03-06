# Qubic Wallet dApp Test

Shareable test dApp for validating the `window.qubic` provider exposed by the Qubic Wallet browser extension.

## What it tests

- Provider detection (`window.qubic`)
- `connect()`
- `disconnect()`
- `getAccount()`
- `signMessage()` (plain text + hex payload examples)
- `signTransaction()` (manual payload form)
- Provider events:
  - `accountChanged`
  - `disconnect`
- Runtime logs and error responses

## Run locally

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## Before testing

1. Build and load the wallet extension branch that includes dApp support.
2. Make sure the extension is enabled in Chrome.
3. Open the wallet at least once and unlock it.
4. Open this test dApp page and click `refresh provider` if needed.

## Suggested smoke test

1. `connect` and approve in the extension
2. `getAccount` and verify the selected identity is shown
3. `sign message` with normal text
4. `suspicious preset` then `sign message` (warning should appear in wallet)
5. Fill `signTransaction` and approve/reject
6. Switch account in the wallet and verify `accountChanged` appears in logs
7. `disconnect` and verify disconnect event/logs

## Notes

- This app is intentionally simple and uses only `window.qubic` (no SDK wrappers).
- It is SSR-safe for Next.js by detecting the provider only after mount.
- `signTransaction()` here signs only; broadcasting is up to the dApp/backend.
