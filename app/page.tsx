import Link from "next/link";
import { countUsers, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const hasUsers = user ? true : (await countUsers()) > 0;

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SIGF</h1>
        <p className="text-slate-600 mt-1">Sistema Integrado de Gestao de Frota</p>
      </div>
      {user ? (
        <Link
          href="/veiculos"
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Ir para Cadastro de Veiculos
        </Link>
      ) : (
        <Link
          href={hasUsers ? "/login" : "/setup"}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          {hasUsers ? "Entrar" : "Configurar sistema"}
        </Link>
      )}
    </main>
  );
}
