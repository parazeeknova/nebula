export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 8000;

interface TtsRequest {
  text?: unknown;
}

export const POST = async (request: Request): Promise<Response> => {
  let body: TtsRequest;
  try {
    body = (await request.json()) as TtsRequest;
  } catch {
    return Response.json(
      { error: "request body must be JSON" },
      { status: 400 }
    );
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length === 0) {
    return Response.json(
      { error: "text must be a non-empty string" },
      { status: 400 }
    );
  }

  const apiKey = process.env.SMALLEST_API_KEY ?? "";
  if (apiKey.length === 0) {
    return Response.json(
      { error: "SMALLEST_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const payload = {
    model: process.env.SMALLEST_MODEL ?? "lightning_v3.1",
    output_format: "wav",
    sample_rate: 24_000,
    text: text.slice(0, MAX_TEXT),
    voice_id: process.env.SMALLEST_VOICE ?? "magnus",
  } as const;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.smallest.ai/waves/v1/tts", {
      body: JSON.stringify(payload),
      headers: {
        Accept: "audio/wav",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `smallest.ai request failed: ${message}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      {
        error: `smallest.ai error ${upstream.status}: ${detail.slice(0, 300)}`,
      },
      { status: 502 }
    );
  }

  const audio = Buffer.from(await upstream.arrayBuffer());
  return new Response(new Uint8Array(audio), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "audio/wav",
    },
  });
};
