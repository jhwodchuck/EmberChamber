"use client";

import { useEffect, useState } from "react";
import {
  detectLocalRelayOverride,
  ensureSecureStorageHydrated,
  isDesktopShell,
} from "@/lib/secure-storage";

// Gates rendering until the desktop shell's OS keyring-backed secure state
// has been read into memory (see lib/secure-storage.ts). A no-op on the
// public web — isDesktopShell() is false there, so this resolves
// synchronously on the first render and never shows anything.
export function SecureStorageBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hydrated, setHydrated] = useState(() => !isDesktopShell());

  useEffect(() => {
    if (hydrated) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      ensureSecureStorageHydrated(),
      detectLocalRelayOverride(),
    ]).then(() => {
      if (!cancelled) {
        setHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  if (!hydrated) {
    return null;
  }

  return <>{children}</>;
}
