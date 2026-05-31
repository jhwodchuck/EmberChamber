import { requireAuth } from "../middleware/auth";
import { contactCardSchema } from "../schemas";
import { dbFirst } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { conversationTitleForAccount } from "../services/utils";
import type { Env } from "../types";
import type { ContactCard } from "@emberchamber/protocol";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (
    request.method === "POST" &&
    pathname === "/v1/contacts/card/resolve"
  ) {
    await requireAuth(request, env);
    const body = contactCardSchema.parse(await readJson(request));
    const decoded = JSON.parse(atob(body.cardToken)) as ContactCard;
    const account = await dbFirst<{ id: string }>(
      env.DB,
      "SELECT id FROM accounts WHERE id = ?1",
      decoded.accountId,
    );

    if (!account) {
      throw new HttpError(
        404,
        "Contact card not found",
        "CONTACT_NOT_FOUND",
      );
    }

    return json(decoded);
  }

  if (request.method === "GET" && pathname === "/v1/me/contact-card") {
    const auth = await requireAuth(request, env);
    const account = await dbFirst<{ display_name: string }>(
      env.DB,
      "SELECT display_name FROM accounts WHERE id = ?1",
      auth.accountId,
    );

    const card: ContactCard = {
      accountId: auth.accountId,
      label:
        account?.display_name ??
        conversationTitleForAccount(auth.accountId),
    };

    return json({
      ...card,
      cardToken: btoa(JSON.stringify(card)),
    });
  }

  return null;
}
