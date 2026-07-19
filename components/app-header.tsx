import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import LogoutButton from "./logout-button";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Administrador",
  viewer: "Visualizador",
};

export default function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/veiculos" className="font-semibold text-slate-900">
            SIGF
          </Link>
          <Link href="/veiculos" className="text-slate-600 hover:text-slate-900">
            Veiculos
          </Link>
          <Link href="/manutencao" className="text-slate-600 hover:text-slate-900">
            Manutencao
          </Link>
          {user.role === "admin" && (
            <Link href="/admin/usuarios" className="text-slate-600 hover:text-slate-900">
              Usuarios
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {user.name}{" "}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 ml-1">
              {ROLE_LABEL[user.role]}
            </span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
