import { getJob } from "@/src/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> => {
  const { id } = await params;
  try {
    const job = await getJob(id);
    if (!job) {
      return Response.json({ error: "job not found" }, { status: 404 });
    }
    return Response.json(job);
  } catch (error) {
    return Response.json({ error: errorText(error) }, { status: 502 });
  }
};
