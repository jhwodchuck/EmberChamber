"use client";

import { Toaster } from "react-hot-toast";
import { SecureStorageBootstrap } from "@/components/secure-storage-bootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SecureStorageBootstrap>{children}</SecureStorageBootstrap>
      <Toaster
        position="top-right"
        toastOptions={{
          ariaProps: {
            role: "status",
            "aria-live": "polite",
          },
          style: {
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          },
        }}
      />
    </>
  );
}
