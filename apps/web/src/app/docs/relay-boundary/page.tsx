import React from "react";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import { createMetadata } from "@/lib/metadata";

const path = "/docs/relay-boundary";
const title = "What the EmberChamber Relay Can and Cannot See";
const description =
  "A plain-English breakdown of EmberChamber's relay boundary, including ciphertext delivery, metadata, local history, and beta limitations.";

export const metadata = createMetadata({
  title,
  description,
  path,
});

export default function RelayBoundaryDoc() {
  return (
    <DocsPage title={title} description={description} currentPath={path}>
      <section>
        <h2>What is a relay?</h2>
        <p>
          Unlike a pure peer-to-peer system that requires both devices to be
          online simultaneously to exchange packets, EmberChamber routes messages
          through a hosted edge relay. The relay acts as a mailbox, holding
          incoming messages until your device connects and pulls them down.
        </p>
      </section>

      <section>
        <h2>Why is the relay necessary?</h2>
        <p>
          Mobile operating systems put background apps to sleep to save battery, making
          pure peer-to-peer synchronization highly unreliable on mobile. The
          hosted relay ensures that your direct messages, group updates, and
          invites are safely queued and delivered as soon as you open the app or receive
          a push notification ticket.
        </p>
      </section>

      <section>
        <h2>What the relay CAN see</h2>
        <p>
          We do not claim &quot;zero metadata&quot; because that is operationally impossible
          for a routed delivery network. The relay coordinates, and therefore observes,
          the following:
        </p>
        <ul>
          <li>
            <strong>Account Identifiers:</strong> Your account registration address,
            associated public keys, and device names.
          </li>
          <li>
            <strong>Social Graph Details:</strong> Which spaces or rooms you belong
            to, who invited you, and who you invite.
          </li>
          <li>
            <strong>Delivery Metadata:</strong> The time ciphertext envelopes are queued
            and acknowledged, and the IP address your device uses to connect to the
            endpoints.
          </li>
          <li>
            <strong>Temporary Ciphertext:</strong> The encrypted content payloads,
            which remain stored in delivery queues until they are pulled.
          </li>
        </ul>
      </section>

      <section>
        <h2>What the relay CANNOT read</h2>
        <p>
          Because message payloads are encrypted end-to-end on the clients before
          reaching the network, the relay is technically unable to read:
        </p>
        <ul>
          <li>The plaintext content of your direct messages.</li>
          <li>The title, text, or content of device-local search terms.</li>
          <li>The plaintext conversations and history of new groups.</li>
        </ul>
      </section>

      <section>
        <h2>Current beta limitations and caveats</h2>
        <p>
          EmberChamber is in a public beta stage. You should understand our
          temporary operational boundaries:
        </p>
        <ul>
          <li>
            <strong>Attachments Caveat:</strong> While web companion attachments
            are encrypted client-side before upload to cloud storage, native
            attachment flows (on mobile and desktop) currently upload raw bytes
            through temporary tickets. We are actively migrating native attachments
            to the browser E2EE standard.
          </li>
          <li>
            <strong>Legacy Compatibility Paths:</strong> Older groups and rooms may
            still utilize legacy compatibility schemas where history is stored on
            the relay to facilitate synchronization. Make sure your active circles
            transition to our new device-encrypted groups to bypass hosted history
            reads.
          </li>
        </ul>
        <p>
          If you want to read more about how groups coordinate keys, check the{" "}
          <Link
            href="/docs/encrypted-group-chat"
            className="underline hover:text-brand-300"
          >
            Encrypted Group Chat Guide
          </Link>
          .
        </p>
      </section>
    </DocsPage>
  );
}
