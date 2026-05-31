import type { Env, MagicLinkMessage } from "../types";

export async function deliverMagicLinkEmail(
  env: Env,
  msg: MagicLinkMessage,
): Promise<void> {
  if (env.EMBERCHAMBER_EMAIL_PROVIDER === "log") {
    console.log(
      JSON.stringify({
        event: "magic_link_email",
        to: msg.to,
        completionUrl: msg.completionUrl,
        expiresAt: msg.expiresAt,
      }),
    );
    return;
  }

  if (!env.RESEND_API_KEY) {
    console.error("magic_link_email_skipped", {
      reason: "RESEND_API_KEY not configured",
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: msg.from,
      to: [msg.to],
      subject: "Your EmberChamber sign-in link",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-top:0">Sign in to EmberChamber</h2>
          <p>Tap the button below to sign in. This link expires at ${new Date(msg.expiresAt).toUTCString()}.</p>
          <a href="${msg.completionUrl}"
             style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Sign in
          </a>
          <p style="margin-top:24px;font-size:13px;color:#666">
            If you didn't request this, you can ignore this email. The link will expire on its own.
          </p>
        </div>
      `,
      text: `Sign in to EmberChamber\n\nVisit this link to complete sign-in:\n${msg.completionUrl}\n\nThis link expires at ${new Date(msg.expiresAt).toUTCString()}.\n\nIf you didn't request this, ignore this email.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(`Resend API error: ${response.status} ${body}`);
  }

  console.log(JSON.stringify({ event: "magic_link_email_sent", to: msg.to }));
}
