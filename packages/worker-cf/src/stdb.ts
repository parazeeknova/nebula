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
      schema?: { elements?: { name?: { some?: string } }[] };
      rows?: unknown[][];
    }[];
    const statement = data?.[0];
    const columns = (statement?.schema?.elements ?? []).map(
      (element) => element.name?.some ?? ""
    );
    const rows = statement?.rows ?? [];
    return rows.map((row) => {
      const record = {} as Record<string, unknown>;
      for (const [index, column] of columns.entries()) {
        if (column) {
          record[column] = row[index];
        }
      }
      return record as T;
    });
  }

  async call(reducer: string, args: unknown[]): Promise<void> {
    const res = await fetch(
      `${this.host}/v1/database/${this.db}/call/${reducer}`,
      {
        body: JSON.stringify(args),
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    if (!res.ok) {
      throw new Error(
        `stdb call ${reducer} ${res.status}: ${truncate(await res.text(), 300)}`
      );
    }
  }
}
