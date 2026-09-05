import { Providers } from "./providers";

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <Providers>{children}</Providers>
);

export default AppLayout;
