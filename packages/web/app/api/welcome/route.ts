import { sendWelcome } from "@/src/server/mailer";

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
  const { email, name } = body as { email?: unknown; name?: unknown };
  if (typeof name !== "string" || name.trim().length === 0) {
    return Response.json(
      { error: "name must be a non-empty string" },
      { status: 400 }
    );
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return Response.json(
      { error: "a valid email is required" },
      { status: 400 }
    );
  }
  try {
    await sendWelcome(email.trim(), name);
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 502 });
  }
};
