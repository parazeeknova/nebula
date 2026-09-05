import type { Infer } from "spacetimedb";

import { DbConnection, tables } from "../src/module_bindings";
import type { Person } from "../src/module_bindings/types";

const HOST = process.env.SPACETIMEDB_HOST ?? "wss://maincloud.spacetimedb.com";
const DB_NAME = process.env.SPACETIMEDB_DB_NAME ?? "neb";

export type PersonData = Infer<typeof Person>;

// Fetches the initial list of people from SpacetimeDB.
// Designed for use in Next.js Server Components.
// Establishes a WebSocket connection, subscribes to the person table,
// waits for the initial data, then disconnects.
// Wraps the callback-based subscription API in a Promise (see oxlint override).
export const fetchPeople = (): Promise<PersonData[]> =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("SpacetimeDB connection timeout"));
    }, 10_000);

    DbConnection.builder()
      .withUri(HOST)
      .withDatabaseName(DB_NAME)
      .onConnect((conn) => {
        conn
          .subscriptionBuilder()
          .onApplied(() => {
            clearTimeout(timeoutId);
            const people = [...conn.db.person.iter()];
            conn.disconnect();
            resolve(people);
          })
          .onError((ctx) => {
            clearTimeout(timeoutId);
            conn.disconnect();
            reject(ctx.event ?? new Error("Subscription error"));
          })
          .subscribe(tables.person);
      })
      .onConnectError((_ctx, error) => {
        clearTimeout(timeoutId);
        reject(error);
      })
      .build();
  });
