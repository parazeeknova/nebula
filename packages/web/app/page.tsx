import { WorkspaceShell } from "../components/workspace/workspace-shell";
import { SharedTablesProvider } from "../lib/shared-tables";

const Home = () => (
  <SharedTablesProvider>
    <WorkspaceShell />
  </SharedTablesProvider>
);

export default Home;
