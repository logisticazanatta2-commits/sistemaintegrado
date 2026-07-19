import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { BrandMark } from "./brand-mark";
import LogoutButton from "./logout-button";
import NavLinks from "./nav-links";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Administrador",
  viewer: "Visualizador",
};

export default function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/veiculos" className="flex items-center shrink-0">
            <BrandMark size="sm" />
          </Link>
          <NavLinks role={user.role} />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {user.name}
            </div>
            <div className="text-xs" style={{ color: "var(--text-faint)" }}>
              {ROLE_LABEL[user.role]}
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
