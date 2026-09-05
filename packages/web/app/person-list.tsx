"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";

import type { PersonData } from "../lib/spacetimedb-server";
import { reducers, tables } from "../src/module_bindings";

interface PersonListProps {
  initialPeople: PersonData[];
}

export const PersonList = ({ initialPeople }: PersonListProps) => {
  const [name, setName] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  const { isActive: connected } = useSpacetimeDB();
  const [people, isLoading] = useTable(tables.person);
  const addPersonReducer = useReducer(reducers.add);

  useEffect(() => {
    if (connected && !isLoading) {
      setIsHydrated(true);
    }
  }, [connected, isLoading]);

  const displayPeople = isHydrated ? people : initialPeople;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length === 0 || !connected) {
      return;
    }
    addPersonReducer({ name });
    setName("");
  };

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        Status:{" "}
        <strong style={{ color: connected ? "green" : "red" }}>
          {connected ? "Connected" : "Connecting..."}
        </strong>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <input
          disabled={!connected}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter name"
          style={{ marginRight: "0.5rem", padding: "0.5rem" }}
          type="text"
          value={name}
        />
        <button
          disabled={!connected}
          style={{ padding: "0.5rem 1rem" }}
          type="submit"
        >
          Add Person
        </button>
      </form>

      <div>
        <h2>People ({displayPeople.length})</h2>
        {displayPeople.length === 0 ? (
          <p>No people yet. Add someone above!</p>
        ) : (
          <ul>
            {displayPeople.map((person) => (
              <li key={String(person.id ?? person.name)}>{person.name}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};
