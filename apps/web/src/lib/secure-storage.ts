"use client";

// Storage adapter for security-sensitive local state (session tokens, the
// device's long-term identity key bundle). On the public web this is a thin
// wrapper over localStorage, unchanged from before. Inside the Tauri desktop
// shell it routes through the existing OS keyring-backed secure_state Rust
// commands (apps/desktop/src-tauri/src/secure_state.rs) instead, so private
// key material gets the same OS-native protection desktop already had.
//
// Detection matches the desktop shell's own convention exactly
// (apps/desktop/shell/index.html): the Tauri v2 IPC bridge is always present
// at globalThis.__TAURI_INTERNALS__.invoke regardless of the
// `withGlobalTauri` config flag.
//
// Reads must stay synchronous to be a drop-in replacement for the many
// existing synchronous localStorage call sites. On desktop this is done by
// hydrating one in-memory cache from the keyring exactly once, awaited by
// <SecureStorageBootstrap> before the rest of the app renders; every read
// after that point is a synchronous cache lookup. Writes persist back to the
// keyring asynchronously (fire-and-forget), the same pattern the previous
// desktop shell already used.

type TauriInvoke = (
  command: string,
  payload?: Record<string, unknown>,
) => Promise<unknown>;

function tauriInvoke(): TauriInvoke | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const invoke = (
    globalThis as {
      __TAURI_INTERNALS__?: { invoke?: unknown };
    }
  ).__TAURI_INTERNALS__?.invoke;

  return typeof invoke === "function" ? (invoke as TauriInvoke) : null;
}

export function isDesktopShell(): boolean {
  return tauriInvoke() !== null;
}

let cache: Record<string, unknown> | null = null;
let hydration: Promise<Record<string, unknown>> | null = null;

async function loadFromKeyring(): Promise<Record<string, unknown>> {
  const invoke = tauriInvoke();
  if (!invoke) {
    return {};
  }

  try {
    const snapshot = (await invoke("load_secure_state")) as {
      state?: unknown;
    } | null;
    const state = snapshot?.state;
    return state && typeof state === "object"
      ? (state as Record<string, unknown>)
      : {};
  } catch {
    // A keyring read failure should not block the app; fall back to an
    // empty state rather than throwing during startup.
    return {};
  }
}

// Awaited once by <SecureStorageBootstrap> before children render. A no-op
// outside the desktop shell.
export async function ensureSecureStorageHydrated(): Promise<void> {
  if (!isDesktopShell() || cache) {
    return;
  }

  hydration = hydration ?? loadFromKeyring();
  cache = await hydration;
}

function persist() {
  const invoke = tauriInvoke();
  if (!invoke || !cache) {
    return;
  }

  void invoke("save_secure_state", { state: cache }).catch(() => {
    // Best-effort persistence, matching the previous shell's behavior.
  });
}

export function getSecureItem(key: string): string | null {
  if (!isDesktopShell()) {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  }

  const value = (cache ?? {})[key];
  return typeof value === "string" ? value : null;
}

export function setSecureItem(key: string, value: string): void {
  if (!isDesktopShell()) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
    return;
  }

  cache = { ...(cache ?? {}), [key]: value };
  persist();
}

const LOCAL_RELAY_URL = "http://127.0.0.1:8787";
const LOCAL_RELAY_PROBE_TIMEOUT_MS = 800;

// Desktop bakes its relay URL into the static export at build time (see
// getRelayBaseUrl() in lib/relay.ts), which loses the previous shell's
// ability to fall back to a local dev relay without a rebuild — needed by
// the Ubuntu smoke lane (npm run ubuntu:ready) and local desktop dev. Called
// once by <SecureStorageBootstrap>, desktop-only; the public web build never
// calls this, so its behavior is unchanged.
export async function detectLocalRelayOverride(): Promise<void> {
  if (!isDesktopShell()) {
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      LOCAL_RELAY_PROBE_TIMEOUT_MS,
    );
    const response = await fetch(`${LOCAL_RELAY_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const { setRelayUrlOverride } = await import("@/lib/relay");
      setRelayUrlOverride(LOCAL_RELAY_URL);
    }
  } catch {
    // No local relay listening — keep the build-time default (production).
  }
}

export function removeSecureItem(key: string): void {
  if (!isDesktopShell()) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
    return;
  }

  const next = { ...(cache ?? {}) };
  delete next[key];
  cache = next;
  persist();
}
