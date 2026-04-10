"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function CopyButton({
  value,
  label,
  copiedLabel = "Copied",
  successMessage = "Copied to clipboard",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  successMessage?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMessage);
    } catch {
      toast.error("Copy failed. Select and copy manually.");
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="btn-ghost">
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}
