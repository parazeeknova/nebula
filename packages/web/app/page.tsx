import { fetchRooms } from "../lib/spacetimedb-server";
import { RoomList } from "./room-list";

const Home = async () => {
  let initialRooms: Awaited<ReturnType<typeof fetchRooms>> = [];

  try {
    initialRooms = await fetchRooms();
  } catch {
    // Server-side fetch is best-effort: the client takes over via subscription
    initialRooms = [];
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>SpacetimeDB Next.js App</h1>
      <RoomList initialRooms={initialRooms} />
    </main>
  );
};

export default Home;
