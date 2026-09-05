import { truncate } from "./truncate";

export class Stdb {
  private readonly host: string;
  private readonly db: string;
  private readonly token: string;

  constructor(host: string, db: string, token: string) {
    this.host = host;
    this.db = db;
    this.token = token;
  }

  private async post(path: string, body: string): Promise<unknown> {
    const res = await fetch(`${this.host}${path}`, {
      body,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(
        `stdb ${path} ${res.status}: ${truncate(await res.text(), 300)}`
      );
    }
    return (await res.json()) as unknown;
  }

  async rows<T>(query: string): Promise<T[]> {
    const data = (await this.post(`/v1/database/${this.db}/sql`, query)) as {
      rows?: Record<string, unknown>[];
    }[];
    return (data?.[0]?.rows ?? []) as T[];
  }

  async call(reducer: string, args: unknown[]): Promise<void> {
    await this.post(
      `/v1/database/${this.db}/call/${reducer}`,
      JSON.stringify(args)
    );
  }
}
