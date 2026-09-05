export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = async (request: Request): Promise<Response> => {
  const apiKey = process.env.SMALLEST_API_KEY ?? "";
  if (apiKey.length === 0) {
    return Response.json(
      { error: "SMALLEST_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let audio: ArrayBuffer;
  try {
    audio = await request.arrayBuffer();
  } catch {
    return Response.json(
      { error: "could not read audio body" },
      { status: 400 }
    );
  }
  if (audio.byteLength === 0) {
    return Response.json({ error: "empty audio body" }, { status: 400 });
  }

  const model = process.env.SMALLEST_STT_MODEL ?? "pulse-pro";
  const language = process.env.SMALLEST_LANGUAGE ?? "en";
  const url = `https://api.smallest.ai/waves/v1/stt/?model=${encodeURIComponent(model)}&language=${encodeURIComponent(language)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      body: new Uint8Array(audio),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "audio/wav",
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

  const raw = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    return Response.json(
      { error: `smallest.ai error ${upstream.status}: ${raw.slice(0, 300)}` },
      { status: 502 }
    );
  }

  let json: { transcription?: unknown };
  try {
    json = JSON.parse(raw) as { transcription?: unknown };
  } catch {
    return Response.json(
      { error: "smallest.ai returned an invalid response" },
      { status: 502 }
    );
  }
  const transcription =
    typeof json.transcription === "string" ? json.transcription : "";
  return Response.json({ transcription });
};
