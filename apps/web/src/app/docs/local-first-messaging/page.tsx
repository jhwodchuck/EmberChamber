import React from "react";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import { createMetadata } from "@/lib/metadata";

const path = "/docs/local-first-messaging";
const title = "Local-First Messaging and Device-Local Search";
const description =
  "How EmberChamber keeps private message history and search centered on the device instead of turning conversations into a server-side archive.";

export const metadata = createMetadata({
  title,
  description,
  path,
});

export default function LocalFirstDoc() {
  return (
    <DocsPage title={title} description={description} currentPath={path}>
      <section>
        <h2>What local-first means in EmberChamber</h2>
        <p>
          In a centralized messaging model, the server acts as the authoritative
          repository of your history. If you buy a new device, it downloads the
          entire archive from the cloud. EmberChamber flips this: your device is
          the source of truth. The hosted relay only queues encrypted messages
          temporarily until they are downloaded and acknowledged by the clients
          in the conversation.
        </p>
      </section>

      <section>
        <h2>Private message history on the device</h2>
        <p>
          Once messages are delivered and decrypted on your local device, they
          are stored in a local database (such as SQLite on native platforms or
          client-side indexed storage in the browser). The relay does not keep a
          permanent copy of your decrypted or encrypted message history. If you
          close a session or log out of a web companion client without a backup
          ready, those messages are gone from that client forever.
        </p>
      </section>

      <section>
        <h2>Device-local private-content search</h2>
        <p>
          Because the relay does not store or read the plaintext of your
          conversations, searching message content must happen entirely on your
          device. Your client builds a local search index that runs queries
          locally. Your search keywords never travel over the network to the
          relay, ensuring that what you look up remains private to your physical
          screen.
        </p>
      </section>

      <section>
        <h2>Why this is different from cloud archives</h2>
        <p>
          Mainstream messengers build searchable index databases on their servers
          to make search fast across multiple devices. This means that if their
          infrastructure is compromised, your complete historical message context
          can be extracted. EmberChamber prevents this server-side compromise by
          design: there is simply no central historical archive to steal.
        </p>
      </section>

      <section>
        <h2>Recovery tradeoffs</h2>
        <p>
          A local-first architecture prioritizes security, which introduces key
          tradeoffs. If you lose all your devices, there is no server-side recovery
          flow to restore your history. You must configure trusted backup devices
          or rely on key bootstrap backups. Currently, our trusted-device
          recovery flow is in active beta testing, and recovery is intentionally
          restricted to ensure that server operators cannot bypass encryption key
          controls.
        </p>
      </section>

      <section>
        <h2>Relay metadata and boundaries</h2>
        <p>
          While your messages are local-first, the relay is not empty. The relay
          still knows when your device connects, which spaces you participate in,
          and who you exchange ciphertext envelopes with. For a deeper breakdown
          of metadata visibility, read our{" "}
          <Link
            href="/docs/relay-boundary"
            className="underline hover:text-brand-300"
          >
            Relay Boundary Document
          </Link>{" "}
          and our{" "}
          <Link href="/privacy" className="underline hover:text-brand-300">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </DocsPage>
  );
}
