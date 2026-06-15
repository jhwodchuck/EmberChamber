import React from "react";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import { createMetadata } from "@/lib/metadata";

const path = "/docs/ubuntu-encrypted-messenger";
const title = "Encrypted Messaging for Ubuntu and Linux";
const description =
  "Use EmberChamber's Ubuntu/Linux beta builds for private trusted-circle messaging on desktop.";

export const metadata = createMetadata({
  title,
  description,
  path,
});

export default function UbuntuMessengerDoc() {
  return (
    <DocsPage title={title} description={description} currentPath={path}>
      <section>
        <h2>Linux / Ubuntu beta role</h2>
        <p>
          We believe desktop messaging should not force developers or operators
          into proprietary environments. EmberChamber provides native builds for
          Linux environments, allowing you to run the client alongside your
          existing open-source toolchain with full keyboard support and local key storage.
        </p>
      </section>

      <section>
        <h2>AppImage and .deb packaging</h2>
        <p>
          EmberChamber is compiled and packaged for Linux in two primary formats:
        </p>
        <ul>
          <li>
            <strong>.deb Package:</strong> Standard package format suitable for
            installation on Debian, Ubuntu, and derivative distributions via apt or dpkg.
          </li>
          <li>
            <strong>AppImage:</strong> A portable, single-file bundle that can be run
            on almost any modern Linux distribution without administrative installation
            rights.
          </li>
        </ul>
      </section>

      <section>
        <h2>Operator-friendly design</h2>
        <p>
          The Linux client is popular among server administrators and self-hosting
          operators. Because our client uses a Rust-based secure-state core, it
          is highly optimized, runs inside a standard user-space sandbox, and preserves
          local-first database discipline by storing session state in standardized
          directories (`~/.config/emberchamber`).
        </p>
      </section>

      <section>
        <h2>Download & installation</h2>
        <p>
          Linux builds are generated directly from our repository workflow pipelines. Get
          the latest `.deb` or `AppImage` package on the official{" "}
          <Link href="/download" className="underline hover:text-brand-300">
            Download Page
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Current beta limitations</h2>
        <p>
          Like the Windows companion, the Linux build is an early first-wave desktop target:
        </p>
        <ul>
          <li>
            <strong>No push notifications:</strong> Background push delivery is not
            available. The client application must remain open to listen for new incoming
            message tickets.
          </li>
          <li>
            <strong>Attachment handling:</strong> E2EE file transfers on native desktop
            clients are in active development. Raw byte upload tickets are used as a bridge, so
            prefer the web client if you require full client-side ciphertext wrappers for files.
          </li>
        </ul>
        <p>
          If you encounter packaging errors or require build logs, please open an issue in
          the official repository or contact{" "}
          <Link href="/support" className="underline hover:text-brand-300">
            Support
          </Link>
          .
        </p>
      </section>
    </DocsPage>
  );
}
