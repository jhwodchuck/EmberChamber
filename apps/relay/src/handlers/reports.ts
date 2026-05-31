import { requireAuth } from "../middleware/auth";
import { reportSchema } from "../schemas";
import { dbRun } from "../lib/d1";
import { json, readJson } from "../lib/http";
import { scheduleCleanup } from "../services/cleanup";
import type { Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/v1/reports") {
    const auth = await requireAuth(request, env);
    const body = reportSchema.parse(await readJson(request));
    const reportId = crypto.randomUUID();
    await dbRun(
      env.DB,
      `INSERT INTO reports (
         id,
         reporter_account_id,
         target_conversation_id,
         target_account_id,
         target_attachment_id,
         reason,
         disclosed_payload_json,
         evidence_message_ids_json,
         created_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      reportId,
      auth.accountId,
      body.targetConversationId ?? null,
      body.targetAccountId ?? null,
      body.targetAttachmentId ?? null,
      body.reason,
      JSON.stringify(body.disclosedPayload),
      JSON.stringify(body.evidenceMessageIds ?? []),
      new Date().toISOString(),
    );
    await scheduleCleanup(env, "report_create");

    return json({ reportId, status: "open" }, { status: 201 });
  }

  return null;
}
