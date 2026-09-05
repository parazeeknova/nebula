import { schema, table, t } from "spacetimedb/server";

const person = table(
  { name: "person", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
  }
);

const spacetimedb = schema({ person });

export default spacetimedb;

export const init = spacetimedb.init(() => {
  // Called when the module is initially published
});

export const onConnect = spacetimedb.clientConnected(() => {
  // Called every time a new client connects
});

export const onDisconnect = spacetimedb.clientDisconnected(() => {
  // Called every time a client disconnects
});

export const add = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error("Name must not be empty");
    }
    ctx.db.person.insert({ id: 0n, name: trimmed });
  }
);

export const sayHello = spacetimedb.reducer((ctx) => {
  for (const row of ctx.db.person.iter()) {
    console.info(`Hello, ${row.name}!`);
  }
  console.info("Hello, World!");
});
