import { WorkspaceShell } from "../../../components/workspace/workspace-shell";
import { SharedTablesProvider } from "../../../lib/shared-tables";

const AppPage = () => (
  <SharedTablesProvider>
    <WorkspaceShell />
  </SharedTablesProvider>
);

export default AppPage;
