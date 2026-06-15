import React from "react";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import { createMetadata } from "@/lib/metadata";

const path = "/docs/encrypted-group-chat";
const title = "Encrypted Group Chat for Trusted Circles";
const description =
  "How EmberChamber approaches private small-group messaging, invite-only access, and new device-encrypted group history.";

export const metadata = createMetadata({
  title,
  description,
  path,
});

export default function EncryptedGroupChatDoc() {
  return (
    <DocsPage title={title} description={description} currentPath={path}>
      <section>
        <h2>Trusted-circle group messaging</h2>
        <p>
          Unlike public groups or channels that allow discovery, EmberChamber
          groups are strictly invite-only and designed for small, trusted circles.
          Group membership is managed on a closed basis: only existing group
          administrators or members can invite new participants, and there are no
          public links or access points that bypass this approval step.
        </p>
      </section>

      <section>
        <h2>New groups and device-encrypted history</h2>
        <p>
          In the latest active beta runtime, new groups are initialized with
          device-encrypted group history. When a message is sent to a group,
          it is encrypted for the active membership set using epoch keys
          managed on the devices in the circle. The relay routes the encrypted
          envelopes to the group members&apos; mailboxes but has no access to the
          keys necessary to read the historical record.
        </p>
      </section>

      <section>
        <h2>Membership coordination</h2>
        <p>
          When a member is added to or removed from a group, a new epoch is
          established. The client devices coordinate key rotation to ensure
          that:
        </p>
        <ul>
          <li>
            <strong>Forward secrecy:</strong> Newly added members cannot decrypt messages
            sent before they joined the group.
          </li>
          <li>
            <strong>Post-compromise security:</strong> Removed members cannot read
            new messages sent after their departure.
          </li>
        </ul>
      </section>

      <section>
        <h2>Relay role and limitations in groups</h2>
        <p>
          While the relay coordinates the membership roster (i.e. who is currently in
          the group) and hosts the public key lists for members, it cannot decrypt
          the message contents or attachments. However, the relay operator does see
          which accounts are in the group, when membership changes occur, and the volume
          and frequency of group message envelopes.
        </p>
      </section>

      <section>
        <h2>Legacy compatibility caveat</h2>
        <p>
          EmberChamber is transitioning its systems. Older groups or rooms created
          during early testing phases may still rely on legacy compatibility paths. In
          these legacy flows, group history is hosted in a centralized database on
          the relay to simplify message retrieval. We strongly recommend creating
          new groups to ensure your conversations use the device-encrypted history
          protocol.
        </p>
        <p>
          To get started, follow our{" "}
          <Link href="/start" className="underline hover:text-brand-300">
            Start Guide
          </Link>{" "}
          or{" "}
          <Link href="/download" className="underline hover:text-brand-300">
            Download the Client
          </Link>
          .
        </p>
      </section>
    </DocsPage>
  );
}
