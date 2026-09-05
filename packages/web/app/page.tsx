import { fetchPeople } from "../lib/spacetimedb-server";
import { PersonList } from "./person-list";

const Home = async () => {
  let initialPeople: Awaited<ReturnType<typeof fetchPeople>> = [];

  try {
    initialPeople = await fetchPeople();
  } catch {
    // Server-side fetch is best-effort: the client takes over via subscription
    initialPeople = [];
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>SpacetimeDB Next.js App</h1>
      <PersonList initialPeople={initialPeople} />
    </main>
  );
};

export default Home;
