const AUTH_CONTINUATION_STORAGE_KEY = "emberchamber.auth.v1.next";
const AUTH_CONTINUATION_BASE_URL = "https://emberchamber.invalid";

function isAllowedAuthContinuationPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname === "/invite" || pathname.startsWith("/invite/");
}

export function normalizeAuthContinuationPath(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(trimmed, AUTH_CONTINUATION_BASE_URL);
    if (url.origin !== AUTH_CONTINUATION_BASE_URL || !isAllowedAuthContinuationPath(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function readStoredAuthContinuationPath() {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeAuthContinuationPath(window.localStorage.getItem(AUTH_CONTINUATION_STORAGE_KEY));
}

export function clearStoredAuthContinuationPath() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_CONTINUATION_STORAGE_KEY);
}

export function syncStoredAuthContinuationPath(value?: string | null) {
  if (typeof window === "undefined") {
    return null;
  }

  const normalized = normalizeAuthContinuationPath(value);
  if (normalized) {
    window.localStorage.setItem(AUTH_CONTINUATION_STORAGE_KEY, normalized);
    return normalized;
  }

  clearStoredAuthContinuationPath();
  return null;
}
