import React from "react";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import { createMetadata } from "@/lib/metadata";

const path = "/docs/windows-encrypted-messenger";
const title = "Encrypted Messaging for Windows";
const description =
  "Use EmberChamber's Windows desktop beta for longer private messaging sessions and trusted-circle conversations.";

export const metadata = createMetadata({
  title,
  description,
  path,
});

export default function WindowsMessengerDoc() {
  return (
    <DocsPage title={title} description={description} currentPath={path}>
      <section>
        <h2>Windows desktop client role</h2>
        <p>
          For users who spend their workdays at a desk, typing on a physical keyboard
          is crucial. The Windows client provides a dedicated surface for managing
          longer chats, reviewing space invitations, and coordinating group epochs
          without keeping a browser tab open.
        </p>
      </section>

      <section>
        <h2>Tauri desktop shell</h2>
        <p>
          The Windows build utilizes Tauri, a lightweight framework that bundles a native
          Rust backend with a secure web frontend. This architecture keeps the installer size
          extremely small, reduces system memory consumption compared to heavy Electron shells,
          and permits direct integration with Windows OS features.
        </p>
      </section>

      <section>
        <h2>Identical trust model</h2>
        <p>
          The Windows application operates under the exact same trust parameters as other
          EmberChamber surfaces:
        </p>
        <ul>
          <li>
            Decryption keys are generated locally and stored securely on your machine.
          </li>
          <li>
            Message logs are kept locally and are never readable by the hosted relay.
          </li>
          <li>
            Search indexing is performed locally, ensuring keywords never traverse
            the network.
          </li>
        </ul>
      </section>

      <section>
        <h2>Downloading the client</h2>
        <p>
          You can download the Windows installer (.msi or standalone .exe) from our
          official{" "}
          <Link href="/download" className="underline hover:text-brand-300">
            Download Page
          </Link>
          . Ensure that you verify the download against the posted hashes in the
          GitHub Release feed.
        </p>
      </section>

      <section>
        <h2>Current beta caveats</h2>
        <p>
          Please keep the following limitations in mind when using the Windows beta:
        </p>
        <ul>
          <li>
            <strong>No push notifications:</strong> The Windows desktop client does
            not support background push channels yet. To fetch new messages, the application
            window must be open and active.
          </li>
          <li>
            <strong>Attachment handling:</strong> Similar to Android, attachment encryption
            on the native desktop client is in a transitional phase. Use the web client if
            you require uniform client-side file encryption before upload.
          </li>
        </ul>
        <p>
          For questions, visit our{" "}
          <Link href="/support" className="underline hover:text-brand-300">
            Support Page
          </Link>
          .
        </p>
      </section>
    </DocsPage>
  );
}
