import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeAttachmentTransferState,
  getAttachmentActionLabel,
  openManagedAttachment,
  resolveAttachmentUri,
  type AttachmentTransferState,
  type ManagedAttachment,
} from "../lib/attachmentManager";

type AttachmentAction = "preview" | "open";

export function useAttachmentManager(attachment: ManagedAttachment | null) {
  const [status, setStatus] = useState<AttachmentTransferState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastResolvedAt, setLastResolvedAt] = useState<string | null>(null);
  const lastActionRef = useRef<AttachmentAction | null>(null);

  useEffect(() => {
    setStatus("idle");
    setError(null);
    setResolvedUri(null);
    setAttemptCount(0);
    setLastResolvedAt(null);
    lastActionRef.current = null;
  }, [attachment?.id]);

  const setTransferState = useCallback(
    (nextStatus: AttachmentTransferState) => {
      setStatus(nextStatus);
      if (nextStatus !== "failed") {
        setError(null);
      }
    },
    [],
  );

  const runTransfer = useCallback(
    async (action: AttachmentAction) => {
      if (!attachment) {
        return null;
      }

      lastActionRef.current = action;
      setAttemptCount((current) => current + 1);

      try {
        const nextUri =
          action === "preview"
            ? await resolveAttachmentUri(attachment, setTransferState)
            : await openManagedAttachment(attachment, setTransferState);
        setResolvedUri(nextUri);
        setLastResolvedAt(new Date().toISOString());
        return nextUri;
      } catch (nextError) {
        setStatus("failed");
        setError(
          nextError instanceof Error
            ? nextError.message
            : action === "preview"
              ? "Unable to load this attachment."
              : "Unable to open this attachment.",
        );
        return null;
      }
    },
    [attachment, setTransferState],
  );

  const prepareForPreview = useCallback(async () => {
    return runTransfer("preview");
  }, [runTransfer]);

  const openExternally = useCallback(async () => {
    return runTransfer("open");
  }, [runTransfer]);

  const retry = useCallback(async () => {
    if (!lastActionRef.current) {
      return null;
    }

    return runTransfer(lastActionRef.current);
  }, [runTransfer]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResolvedUri(null);
    setAttemptCount(0);
    setLastResolvedAt(null);
    lastActionRef.current = null;
  }, []);

  return {
    actionLabel: attachment ? getAttachmentActionLabel(attachment) : "",
    attemptCount,
    canRetry: status === "failed" && lastActionRef.current != null,
    error,
    isBusy: status === "downloading" || status === "decrypting",
    lastResolvedAt,
    openExternally,
    prepareForPreview,
    reset,
    resolvedUri,
    retry,
    status,
    statusLabel: describeAttachmentTransferState(status),
  };
}
