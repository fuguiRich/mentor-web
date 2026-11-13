import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "../components/layout/AppShell";
import { getTokens } from "../lib/auth/token-store";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (!getTokens()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
