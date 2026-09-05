"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

import type { RoomData } from "../lib/spacetimedb-server";
import { tables } from "../src/module_bindings";

interface RoomListProps {
  initialRooms: RoomData[];
}

// Placeholder UI over the real backend: lists rooms live.
// The teammate owning UI should replace this with the canvas view;
// it exists so `bun run typecheck` passes against the new bindings.
export const RoomList = ({ initialRooms }: RoomListProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  const { isActive: connected, getConnection } = useSpacetimeDB();
  const [rooms, isLoading] = useTable(tables.room);

  useEffect(() => {
    if (connected && !isLoading) {
      setIsHydrated(true);
    }
  }, [connected, isLoading]);

  const displayRooms = isHydrated ? [...rooms] : initialRooms;

  const handleRefresh = (event: FormEvent) => {
    event.preventDefault();
    getConnection()?.subscriptionBuilder().subscribe(tables.room);
  };

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        Status:{" "}
        <strong style={{ color: connected ? "green" : "red" }}>
          {connected ? "Connected" : "Connecting..."}
        </strong>
      </div>

      <form onSubmit={handleRefresh} style={{ marginBottom: "2rem" }}>
        <button
          disabled={!connected}
          style={{ padding: "0.5rem 1rem" }}
          type="submit"
        >
          Refresh
        </button>
      </form>

      <div>
        <h2>Rooms ({displayRooms.length})</h2>
        {displayRooms.length === 0 ? (
          <p>No rooms yet. Create one via the create_room reducer.</p>
        ) : (
          <ul>
            {displayRooms.map((room) => (
              <li key={String(room.roomId)}>{room.name}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};
