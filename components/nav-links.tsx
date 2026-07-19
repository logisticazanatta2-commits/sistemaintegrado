"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

const LINKS = [
  { href: "/veiculos", label: "Veiculos" },
  { href: "/manutencao", label: "Manutencao" },
];

export default function NavLinks({ role }: { role: SessionUser["role"] }) {
  const pathname = usePathname();

  const links = role === "admin" ? [...LINKS, { href: "/admin/usuarios", label: "Usuarios" }] : LINKS;

  return (
    <nav className="flex items-center gap-1 text-sm">
      {links.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className="relative px-3 py-1.5 rounded-md font-medium transition-colors"
            style={{
              color: active ? "var(--accent-hover)" : "var(--text-dim)",
              background: active ? "var(--accent-bg)" : "transparent",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
