/** Try to pretty-print a string if it is JSON (object/array). */
export const prettifyJson = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (
    !(trimmed.startsWith("{") || trimmed.startsWith("[")) ||
    !(trimmed.endsWith("}") || trimmed.endsWith("]"))
  ) {
    return null;
  }
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return null;
  }
};

export type ContentSegment =
  | { kind: "text"; value: string }
  | { kind: "code"; lang: string; value: string };

const pushText = (segments: ContentSegment[], chunk: string) => {
  if (!chunk) {
    return;
  }
  const trimmed = chunk.trim();
  const pretty = prettifyJson(trimmed);
  // Only treat the chunk as JSON when the non-whitespace content is entirely JSON
  if (pretty && trimmed.length > 0 && chunk.trim() === trimmed) {
    const leadLen = chunk.length - chunk.trimStart().length;
    const trailLen = chunk.length - chunk.trimEnd().length;
    if (leadLen > 0) {
      segments.push({ kind: "text", value: chunk.slice(0, leadLen) });
    }
    segments.push({ kind: "code", lang: "json", value: pretty });
    if (trailLen > 0) {
      segments.push({
        kind: "text",
        value: chunk.slice(chunk.length - trailLen),
      });
    }
    return;
  }
  segments.push({ kind: "text", value: chunk });
};

/**
 * Split markdown-ish body into text and fenced code blocks.
 * JSON (fenced or bare) is pretty-printed.
 */
export const segmentContent = (body: string): ContentSegment[] => {
  const fenceRe = /```(?<lang>[\w+-]*)\n?(?<code>[\s\S]*?)```/gu;
  const segments: ContentSegment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(body)) !== null) {
    if (match.index > last) {
      pushText(segments, body.slice(last, match.index));
    }
    const lang = (match.groups?.lang ?? "").toLowerCase();
    let code = (match.groups?.code ?? "").replace(/\n$/u, "");
    const pretty = prettifyJson(code);
    if (pretty) {
      code = pretty;
    }
    segments.push({
      kind: "code",
      lang: pretty ? "json" : lang,
      value: code,
    });
    last = match.index + match[0].length;
  }

  if (last < body.length) {
    pushText(segments, body.slice(last));
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: body }];
};
