"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusCallout } from "@/components/status-callout";
import { completeMagicLink } from "@/lib/relay";
import { useAuthStore } from "@/lib/store";

const DEVICE_LABEL_STORAGE_KEY = "emberchamber.auth.v1.deviceLabel";

export function AuthCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const [state, setState] = useState<{
    status: "handoff" | "loading" | "success" | "error";
    message: string;
  }>({
    status: "loading",
    message: "Completing the magic link and creating a relay session for this browser…",
  });

  const completionToken = searchParams?.get("token") ?? "";
  const forceBrowser = searchParams?.get("browser") === "1";

  const prefersAppHandoff = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  const appDeepLink = completionToken
    ? `emberchamber://auth/complete?token=${encodeURIComponent(completionToken)}`
    : "emberchamber://auth/complete";

  useEffect(() => {
    if (!completionToken) {
      setState({
        status: "error",
        message: "This link is missing the completion token. Request a fresh magic link.",
      });
      return;
    }

    if (prefersAppHandoff && !forceBrowser) {
      setState({
        status: "handoff",
        message:
          "Open this link in the EmberChamber app to finish mobile sign-in. If the app does not launch, you can still finish in the browser.",
      });
      return;
    }

    let cancelled = false;

    setState({
      status: "loading",
      message: "Completing the magic link and creating a relay session for this browser…",
    });

    void (async () => {
      try {
        const deviceLabel =
          window.localStorage.getItem(DEVICE_LABEL_STORAGE_KEY) ?? "Browser companion";
        const session = await completeMagicLink({ completionToken, deviceLabel });
        if (cancelled) {
          return;
        }

        setSession(session);
        setState({
          status: "success",
          message: "Relay session confirmed. Redirecting you into the companion workspace…",
        });

        window.setTimeout(() => {
          router.replace("/app");
        }, 800);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to complete the magic link.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completionToken, forceBrowser, prefersAppHandoff, router, setSession]);

  return (
    <>
      <div className="mt-6">
        <StatusCallout
          tone={
            state.status === "error"
              ? "error"
              : state.status === "success"
                ? "success"
                : state.status === "handoff"
                  ? "info"
                  : "info"
          }
          title={
            state.status === "loading"
              ? "Completing magic link"
              : state.status === "success"
                ? "Session ready"
                : state.status === "handoff"
                  ? "Open the app"
                  : "Magic link failed"
          }
        >
          {state.message}
        </StatusCallout>
      </div>

      {state.status === "handoff" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={appDeepLink} className="btn-primary">
            Open in EmberChamber App
          </a>
          <Link
            href={`/auth/complete?token=${encodeURIComponent(completionToken)}&browser=1`}
            className="btn-ghost"
          >
            Finish in Browser Instead
          </Link>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Request another link
          </Link>
          <Link href="/support" className="btn-ghost">
            Get support
          </Link>
        </div>
      ) : null}
    </>
  );
}
