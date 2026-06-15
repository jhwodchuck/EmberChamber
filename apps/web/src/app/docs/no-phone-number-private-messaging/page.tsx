import React from "react";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import { createMetadata } from "@/lib/metadata";

const path = "/docs/no-phone-number-private-messaging";
const title = "Private Messaging Without Phone Number Discovery";
const description =
  "How EmberChamber uses invite-only access and private email bootstrap instead of public phone-number discovery.";

export const metadata = createMetadata({
  title,
  description,
  path,
});

export default function NoPhoneNumberDoc() {
  return (
    <DocsPage title={title} description={description} currentPath={path}>
      <section>
        <h2>Why messengers link phone numbers</h2>
        <p>
          Most mainstream messaging applications utilize your phone number as a
          primary identifier. While this design allows apps to easily scan your
          address book to show who is already online, it exposes your social
          graph, leaks account existence to anyone who saves your number, and
          links your digital conversations directly to a SIM card and real-world
          identity.
        </p>
      </section>

      <section>
        <h2>EmberChamber&apos;s invite-only model</h2>
        <p>
          EmberChamber replaces public phone-number scanning with an invite-only
          onboarding loop. To join a circle, an existing member must generate an
          invite code for you. You cannot sign up voluntarily without a valid,
          attested invite token.
        </p>
      </section>

      <section>
        <h2>Private email bootstrap</h2>
        <p>
          Instead of carrier-assigned phone numbers, EmberChamber utilizes email
          addresses during onboarding. This serves two roles:
        </p>
        <ul>
          <li>
            <strong>Session bootstrap:</strong> Delivering security magic links
            without relying on cellular SMS channels which are vulnerable to SIM
            swapping.
          </li>
          <li>
            <strong>Multi-device recovery:</strong> Enabling device linkage
            re-verification under a self-attested 18+ boundary.
          </li>
        </ul>
        <p>
          Your email address is not searchable by other users in the system and
          is never used for public profile lookup.
        </p>
      </section>

      <section>
        <h2>No public user discovery surface</h2>
        <p>
          EmberChamber has no public user directory, search bar, or profile query
          endpoints. You are completely invisible to other members unless they
          share an active direct message channel or are joined in the same group
          chat.
        </p>
      </section>

      <section>
        <h2>What this does and does not protect</h2>
        <p>
          This approach protects you from bulk address book scanning, random
          spam invites, and identity correlation by third parties. However, it
          is not a shield against all metadata collection. The hosted edge
          relay still coordinates session tokens and email association, meaning
          the relay operator can verify that your account exists and is linked
          to a particular invite chain.
        </p>
        <p>
          For more details on the data boundaries, review our{" "}
          <Link href="/privacy" className="underline hover:text-brand-300">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/trust-and-safety"
            className="underline hover:text-brand-300"
          >
            Trust & Safety
          </Link>{" "}
          principles.
        </p>
      </section>
    </DocsPage>
  );
}
