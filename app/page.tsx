"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type QubicAccount = {
  identity: string;
  name?: string;
};

type QubicProviderError = Error & {
  code?: string;
};

type QubicProvider = {
  isQubic?: boolean;
  version?: string;
  connect: () => Promise<{ connected: true; origin: string }>;
  disconnect: () => Promise<{ disconnected: true }>;
  getAccount: () => Promise<QubicAccount | null>;
  signMessage: (params: unknown) => Promise<{
    signatureHex: string;
    digestHex: string;
  }>;
  signTransaction: (params: unknown) => Promise<{
    txId: string;
    targetTick: number;
    txBytesBase64: string;
    txBytesHex: string;
  }>;
  on?: (event: "accountChanged" | "disconnect", cb: (payload: unknown) => void) => (() => void) | void;
  off?: (event: "accountChanged" | "disconnect", cb: (payload: unknown) => void) => void;
};

type LogEntry = {
  id: string;
  ts: string;
  label: string;
  detail?: unknown;
};

declare global {
  interface Window {
    qubic?: QubicProvider;
  }
}

const truncate = (value: string, left = 8, right = 8) => {
  if (!value) return "";
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
};

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState<QubicProvider | null>(null);
  const [account, setAccount] = useState<QubicAccount | null>(null);
  const [lastError, setLastError] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState("hello qubic");
  const [toIdentity, setToIdentity] = useState("");
  const [amount, setAmount] = useState("1");
  const [targetTick, setTargetTick] = useState("");
  const [inputType, setInputType] = useState("0");
  const [inputBytes, setInputBytes] = useState("");
  const [signMessageResult, setSignMessageResult] = useState<unknown>(null);
  const [signTxResult, setSignTxResult] = useState<unknown>(null);
  const [busyAction, setBusyAction] = useState<string>("");

  const pushLog = useCallback((label: string, detail?: unknown) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ts: new Date().toLocaleTimeString(),
        label,
        detail,
      },
      ...prev,
    ].slice(0, 80));
  }, []);

  const refreshProvider = useCallback(async () => {
    if (typeof window === "undefined") return;
    const next = window.qubic ?? null;
    setProvider(next);
    if (!next) {
      setAccount(null);
      pushLog("provider:missing");
      return;
    }

    pushLog("provider:detected", { isQubic: next.isQubic, version: next.version });
    try {
      const current = await next.getAccount();
      setAccount(current);
      pushLog("getAccount:auto", current);
    } catch (error) {
      const e = error as QubicProviderError;
      pushLog("getAccount:auto:error", { code: e.code, message: e.message });
    }
  }, [pushLog]);

  useEffect(() => {
    setMounted(true);
    void refreshProvider();
  }, [refreshProvider]);

  useEffect(() => {
    if (!provider?.on) return;

    const onAccountChanged = (payload: unknown) => {
      pushLog("event:accountChanged", payload);
      if (payload && typeof payload === "object") {
        const record = payload as Partial<QubicAccount>;
        if (typeof record.identity === "string") {
          setAccount({ identity: record.identity, name: record.name });
          return;
        }
      }
      setAccount(null);
    };

    const onDisconnect = (payload: unknown) => {
      pushLog("event:disconnect", payload);
    };

    const unsubAccount = provider.on("accountChanged", onAccountChanged);
    const unsubDisconnect = provider.on("disconnect", onDisconnect);

    return () => {
      if (typeof unsubAccount === "function") unsubAccount();
      if (typeof unsubDisconnect === "function") unsubDisconnect();
      provider.off?.("accountChanged", onAccountChanged);
      provider.off?.("disconnect", onDisconnect);
    };
  }, [provider, pushLog]);

  const runAction = useCallback(
    async (label: string, task: () => Promise<void>) => {
      setLastError("");
      setBusyAction(label);
      try {
        await task();
      } catch (error) {
        const e = error as QubicProviderError;
        const formatted = `${e.code ?? "UNKNOWN"}: ${e.message ?? String(error)}`;
        setLastError(formatted);
        pushLog(`${label}:error`, { code: e.code, message: e.message });
      } finally {
        setBusyAction("");
      }
    },
    [pushLog],
  );

  const txPayload = useMemo(() => {
    const payload: Record<string, unknown> = {
      toIdentity: toIdentity.trim(),
      amount: amount.trim(),
      inputType: inputType.trim() === "" ? undefined : Number(inputType),
    };
    if (targetTick.trim()) payload.targetTick = Number(targetTick);
    if (inputBytes.trim()) payload.inputBytes = inputBytes.trim();
    return payload;
  }, [amount, inputBytes, inputType, targetTick, toIdentity]);

  const suspiciousMessagePreset = () => {
    setMessage(
      "approve login to https://example.com and authorize transfer. base64 payload follows...",
    );
  };

  const providerReady = Boolean(provider?.isQubic);
  const panelClass = "rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 md:p-4";
  const preClass =
    "mt-2 max-h-36 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 md:px-4">
        <header className={panelClass}>
          <h1 className="text-xl font-semibold tracking-tight">Qubic Wallet dApp Test App</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Use this page to test <code>window.qubic</code> provider integration.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${
                mounted ? "bg-zinc-800 text-zinc-200" : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {mounted ? "client mounted" : "hydrating"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${
                providerReady ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
              }`}
            >
              provider {providerReady ? "detected" : "missing"}
            </span>
            <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-medium text-cyan-300">
              {provider?.version ? `v${provider.version}` : "no version"}
            </span>
            <button
              type="button"
              onClick={() => void refreshProvider()}
              className="cursor-pointer rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-200 hover:bg-zinc-800"
            >
              refresh provider
            </button>
          </div>
        </header>

        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="min-w-0 space-y-4">
            <div className={panelClass}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Connection
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={!providerReady || !!busyAction}
                  onClick={() =>
                    void runAction("connect", async () => {
                      const result = await provider!.connect();
                      pushLog("connect:ok", result);
                      const nextAccount = await provider!.getAccount();
                      setAccount(nextAccount);
                    })
                  }
                  className="cursor-pointer rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === "connect" ? "connecting..." : "connect"}
                </button>
                <button
                  type="button"
                  disabled={!providerReady || !!busyAction}
                  onClick={() =>
                    void runAction("disconnect", async () => {
                      const result = await provider!.disconnect();
                      pushLog("disconnect:ok", result);
                    })
                  }
                  className="cursor-pointer rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === "disconnect" ? "disconnecting..." : "disconnect"}
                </button>
                <button
                  type="button"
                  disabled={!providerReady || !!busyAction}
                  onClick={() =>
                    void runAction("getAccount", async () => {
                      const result = await provider!.getAccount();
                      setAccount(result);
                      pushLog("getAccount:ok", result);
                    })
                  }
                  className="cursor-pointer rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === "getAccount" ? "loading..." : "getAccount"}
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Current account</p>
                {account ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{account.name ?? "Unnamed account"}</p>
                      <p className="font-mono text-xs text-zinc-500">
                        {truncate(account.identity, 10, 10)}
                      </p>
                    </div>
                    <p className="max-h-16 overflow-auto break-all font-mono text-xs text-zinc-300">
                      {account.identity}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">
                    No account available (not connected or not selected).
                  </p>
                )}
              </div>
            </div>

            <div className={panelClass}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  signMessage
                </h2>
                <button
                  type="button"
                  onClick={suspiciousMessagePreset}
                  className="cursor-pointer rounded-lg border border-amber-700/50 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/10"
                >
                  suspicious preset
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                placeholder="message to sign"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!providerReady || !!busyAction}
                  onClick={() =>
                    void runAction("signMessage", async () => {
                      const result = await provider!.signMessage({ message });
                      setSignMessageResult(result);
                      pushLog("signMessage:ok", result);
                    })
                  }
                  className="cursor-pointer rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === "signMessage" ? "waiting approval..." : "sign message"}
                </button>
                <button
                  type="button"
                  disabled={!providerReady || !!busyAction}
                  onClick={() =>
                    void runAction("signMessageHex", async () => {
                      const result = await provider!.signMessage({ hex: "0x68656c6c6f" });
                      setSignMessageResult(result);
                      pushLog("signMessageHex:ok", result);
                    })
                  }
                  className="cursor-pointer rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  sign hex payload
                </button>
              </div>
              {signMessageResult !== null && (
                <pre className={`${preClass} text-zinc-300`}>
                  {safeStringify(signMessageResult)}
                </pre>
              )}
            </div>

            <div className={panelClass}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
                signTransaction
              </h2>
              <div className="mt-3 grid gap-3">
                <input
                  value={toIdentity}
                  onChange={(e) => setToIdentity(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                  placeholder="Destination identity (60 uppercase chars)"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                    placeholder="amount"
                  />
                  <input
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value)}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                    placeholder="inputType (0)"
                  />
                  <input
                    value={targetTick}
                    onChange={(e) => setTargetTick(e.target.value)}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                    placeholder="targetTick (optional)"
                  />
                </div>
                <input
                  value={inputBytes}
                  onChange={(e) => setInputBytes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                  placeholder="inputBytes (optional hex/base64)"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!providerReady || !!busyAction}
                  onClick={() =>
                    void runAction("signTransaction", async () => {
                      const result = await provider!.signTransaction(txPayload);
                      setSignTxResult(result);
                      pushLog("signTransaction:ok", result);
                    })
                  }
                  className="cursor-pointer rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === "signTransaction" ? "waiting approval..." : "sign transaction"}
                </button>
              </div>
              <details className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
                <summary className="cursor-pointer text-xs font-medium text-zinc-400">
                  request payload preview
                </summary>
                <pre className={`${preClass} text-zinc-400`}>{safeStringify(txPayload)}</pre>
              </details>
              {signTxResult !== null && (
                <pre className={`${preClass} text-zinc-300`}>
                  {safeStringify(signTxResult)}
                </pre>
              )}
            </div>
          </div>

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-4">
            <div className={panelClass}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Quick checks
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                <li>1. Connect and approve in extension</li>
                <li>2. Switch account in wallet and verify event log</li>
                <li>3. Try sign message (normal + suspicious preset)</li>
                <li>4. Try sign transaction with valid destination</li>
                <li>5. Test reject / wrong passphrase / watch-only flows</li>
              </ul>
            </div>

            <div className={panelClass}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Runtime logs
                </h2>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="cursor-pointer rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                >
                  clear
                </button>
              </div>

              {lastError && (
                <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {lastError}
                </div>
              )}

              <div className="mt-2 max-h-[45vh] space-y-2 overflow-auto pr-1 xl:max-h-[calc(100vh-18rem)]">
                {logs.length === 0 ? (
                  <p className="text-sm text-zinc-500">No logs yet.</p>
                ) : (
                  logs.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-zinc-100">
                          {entry.label}
                        </p>
                        <span className="text-[11px] text-zinc-500">{entry.ts}</span>
                      </div>
                      {entry.detail !== undefined && (
                        <pre className="mt-2 max-h-32 overflow-auto text-xs text-zinc-400">
                          {safeStringify(entry.detail)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>

        <footer className="px-1 text-xs text-zinc-500">
          Share this page with teammates to validate provider behavior against the extension branch.
          Run on <code>http://localhost:3000</code> or any local http/https URL.
        </footer>
      </main>
    </div>
  );
}
