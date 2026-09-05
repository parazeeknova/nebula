"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Identity } from "spacetimedb";
import { SpacetimeDBProvider } from "spacetimedb/react";

import { DbConnection } from "../src/module_bindings";
import type { ErrorContext } from "../src/module_bindings";

const HOST =
  process.env.NEXT_PUBLIC_SPACETIMEDB_HOST ?? "wss://maincloud.spacetimedb.com";
const DB_NAME = process.env.NEXT_PUBLIC_SPACETIMEDB_DB_NAME ?? "neb";
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

const handleConnect = (
  _conn: DbConnection,
  _identity: Identity,
  token: string
) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
};

const handleDisconnect = () => {
  // Presence is derived from `useSpacetimeDB().isActive`
};

const handleConnectError = (_ctx: ErrorContext, _error: Error) => {
  // Connection errors are surfaced through `useSpacetimeDB().isActive`
};

export const Providers = ({ children }: { children: ReactNode }) => {
  const connectionBuilder = useMemo(
    () =>
      DbConnection.builder()
        .withUri(HOST)
        .withDatabaseName(DB_NAME)
        .withToken(
          typeof window === "undefined"
            ? undefined
            : (window.localStorage.getItem(TOKEN_KEY) ?? undefined)
        )
        .onConnect(handleConnect)
        .onDisconnect(handleDisconnect)
        .onConnectError(handleConnectError),
    []
  );

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  );
};
