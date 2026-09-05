import type { Infer } from "spacetimedb";

import { DbConnection, tables } from "../src/module_bindings";
import type { Room } from "../src/module_bindings/types";

const HOST = process.env.SPACETIMEDB_HOST ?? "wss://maincloud.spacetimedb.com";
const DB_NAME = process.env.SPACETIMEDB_DB_NAME ?? "nebula";

export type RoomData = Infer<typeof Room>;

// Fetches the initial list of rooms from SpacetimeDB.
// Designed for use in Next.js Server Components.
// Establishes a WebSocket connection, subscribes to the room table,
// waits for the initial data, then disconnects.
// Wraps the callback-based subscription API in a Promise (see oxlint override).
export const fetchRooms = (): Promise<RoomData[]> =>
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
            const rooms = [...conn.db.room.iter()];
            conn.disconnect();
            resolve(rooms);
          })
          .onError((ctx) => {
            clearTimeout(timeoutId);
            conn.disconnect();
            reject(ctx.event ?? new Error("Subscription error"));
          })
          .subscribe(tables.room);
      })
      .onConnectError((_ctx, error) => {
        clearTimeout(timeoutId);
        reject(error);
      })
      .build();
  });
