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
    message: "Completing the email link and signing this browser in…",
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

  // Attempt an immediate deep-link redirect on mobile. If the app is installed
  // Android/iOS will open it and the user never sees this page. If it is not
  // installed (or the scheme is not registered yet) the browser stays put and
  // after 1.5 s we reveal the manual "Open in App" button so the user is not
  // left on a blank loading screen.
  useEffect(() => {
    if (!completionToken || !prefersAppHandoff || forceBrowser) {
      return;
    }

    setState({
      status: "loading",
      message: "Opening EmberChamber…",
    });

    // Fire the deep-link. The browser will hand off to the app if installed.
    window.location.href = appDeepLink;

    const fallbackTimer = window.setTimeout(() => {
      setState({
        status: "handoff",
        message:
          "The app did not open automatically. Tap below to launch EmberChamber, or finish sign-in in this browser.",
      });
    }, 1500);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [appDeepLink, completionToken, forceBrowser, prefersAppHandoff]);

  useEffect(() => {
    if (!completionToken) {
      setState({
        status: "error",
        message: "This link is missing the completion token. Request a fresh email link.",
      });
      return;
    }

    // Mobile users are handled by the deep-link effect above.
    if (prefersAppHandoff && !forceBrowser) {
      return;
    }

    let cancelled = false;

    setState({
      status: "loading",
      message: "Completing the email link and signing this browser in…",
    });

    void (async () => {
      try {
        const deviceLabel = window.localStorage.getItem(DEVICE_LABEL_STORAGE_KEY) ?? "Web browser";
        const session = await completeMagicLink({ completionToken, deviceLabel });
        if (cancelled) {
          return;
        }

        setSession(session);
        setState({
          status: "success",
          message: "This browser is signed in. Redirecting you into the web workspace…",
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
          message: error instanceof Error ? error.message : "Unable to complete the email link.",
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
              ? "Signing in"
              : state.status === "success"
                ? "Browser ready"
                : state.status === "handoff"
                  ? "Open the app"
                  : "Email link failed"
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
