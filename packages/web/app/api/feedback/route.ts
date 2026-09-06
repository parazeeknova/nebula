import { sendFeedback } from "@/src/server/mailer";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export const POST = async (request: Request): Promise<Response> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "request body must be JSON" },
      { status: 400 }
    );
  }
  const { email, text } = body as { email?: unknown; text?: unknown };
  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json(
      { error: "feedback text must be a non-empty string" },
      { status: 400 }
    );
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return Response.json(
      { error: "a valid recipient email is required" },
      { status: 400 }
    );
  }
  try {
    await sendFeedback(email.trim(), text);
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 502 });
  }
};
