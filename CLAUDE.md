# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Test dApp for validating the `window.qubic` provider exposed by the Qubic Wallet browser extension. It exercises: connect/disconnect, getAccount, signMessage (text + hex), signTransaction, and provider events (accountChanged, disconnect).

## Tech Stack

- **Next.js 16** (App Router) with React 19, TypeScript 5
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **Bun** as the package manager and runtime
- No test framework configured

## Commands

```bash
bun install        # install dependencies
bun dev            # start dev server at http://localhost:3000
bun run build      # production build
bun run lint       # run ESLint (flat config, next/core-web-vitals + next/typescript)
```

## Architecture

This is a single-page app. All UI lives in `app/page.tsx` as a `"use client"` component. `app/layout.tsx` provides the root layout with Geist fonts and global CSS.

The app interacts directly with `window.qubic` (typed as `QubicProvider` in page.tsx) — no SDK wrappers. Provider detection is SSR-safe: it reads `window.qubic` only after client mount.

Path alias `@/*` maps to the project root.
