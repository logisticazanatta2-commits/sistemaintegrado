"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { IconDashboard, IconLogout, IconTruck, IconUsers, IconWrench } from "./icons";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Administrador",
  viewer: "Visualizador",
};

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/veiculos", label: "Veiculos", icon: IconTruck },
  { href: "/manutencao", label: "Manutencao", icon: IconWrench },
];

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const links =
    user.role === "admin"
      ? [...LINKS, { href: "/admin/usuarios", label: "Usuarios", icon: IconUsers }]
      : LINKS;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--line)" }}
    >
      <Link
        href="/dashboard"
        className="flex flex-col gap-2.5 px-5 py-5"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <img src="/logo-zanatta.png" alt="Zanatta Estufas Agricolas" style={{ height: 24, width: "auto" }} />
        <img src="/logo-vdh.png" alt="Van der Hoeven Estufas Agricolas" style={{ height: 24, width: "auto" }} />
      </Link>

      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                color: active ? "var(--accent-hover)" : "var(--text-dim)",
                background: active ? "var(--accent-bg)" : "transparent",
              }}
            >
              <Icon />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="leading-tight">
          <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {user.name}
          </div>
          <div className="text-xs" style={{ color: "var(--text-faint)" }}>
            {ROLE_LABEL[user.role]}
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--text-dim)" }}
        >
          <IconLogout />
          {loggingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </aside>
  );
}
