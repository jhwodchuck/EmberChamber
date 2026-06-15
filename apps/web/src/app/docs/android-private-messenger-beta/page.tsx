import React from "react";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import { createMetadata } from "@/lib/metadata";

const path = "/docs/android-private-messenger-beta";
const title = "Android Private Messenger Beta";
const description =
  "Use EmberChamber on Android as the primary beta client for invite-only encrypted messaging.";

export const metadata = createMetadata({
  title,
  description,
  path,
});

export default function AndroidPrivateMessengerDoc() {
  return (
    <DocsPage title={title} description={description} currentPath={path}>
      <section>
        <h2>The primary daily client</h2>
        <p>
          The Android application is EmberChamber&apos;s primary native surface.
          Because mobile devices are carried everywhere, the Android client is designed
          to stay connected to the edge relay, receive real-time push tickets, and
          provide a responsive, portable portal to your trusted circles.
        </p>
      </section>

      <section>
        <h2>APK installation expectations</h2>
        <p>
          During the active beta testing phase, EmberChamber is distributed
          directly as an installable APK package from our GitHub Releases feed
          rather than the Google Play Store. To install the app:
        </p>
        <ol>
          <li>
            Download the latest APK file from our official{" "}
            <Link href="/download" className="underline hover:text-brand-300">
              Download Page
            </Link>{" "}
            or GitHub Releases.
          </li>
          <li>
            Enable &quot;Install from Unknown Sources&quot; in your Android security
            settings for your browser or file manager.
          </li>
          <li>Open the downloaded APK and confirm the installation.</li>
        </ol>
      </section>

      <section>
        <h2>Local SQLite storage and cache</h2>
        <p>
          Unlike the web companion which relies on temporary in-memory database mocks
          or basic IndexedDB caching, the Android client utilizes a native SQLite database.
          This local database stores your keys, contact trust records, DM history, and
          group updates. All message content searches are queried directly against this
          local SQLite cache, keeping your search index completely off the network.
        </p>
      </section>

      <section>
        <h2>Onboarding & invitations</h2>
        <p>
          Onboarding on Android requires a valid invite code from an existing member.
          Once input, the app initiates an email bootstrap, sending a secure magic link
          to verify your identity. You will be prompted to perform a self-attested 18+
          affirmation to finalize account activation.
        </p>
      </section>

      <section>
        <h2>Current beta status</h2>
        <p>
          Android is our most feature-complete native client, but it is still a beta
          product:
        </p>
        <ul>
          <li>
            <strong>Push Notifications:</strong> Push channels are wired and functional
            on mobile and the relay. Note that production delivery requires
            operator keys to be fully configured in the relay control plane.
          </li>
          <li>
            <strong>Attachment Encryption:</strong> Native attachment E2EE is in
            active development. Large files or media uploads might bypass standard
            ciphertext wrapping compared to the browser.
          </li>
        </ul>
        <p>
          Report any bugs or performance issues on Android through our{" "}
          <Link href="/support" className="underline hover:text-brand-300">
            Support Channel
          </Link>
          .
        </p>
      </section>
    </DocsPage>
  );
}
