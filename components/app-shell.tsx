import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/auth";
import Sidebar from "./sidebar";

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full" style={{ background: "var(--paper)" }}>
      <Sidebar user={user} />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
