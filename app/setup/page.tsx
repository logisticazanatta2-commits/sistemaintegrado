import Link from "next/link";
import { countUsers } from "@/lib/auth";
import SetupForm from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const existing = await countUsers();

  if (existing > 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-semibold">Sistema ja configurado</h1>
        <p className="text-slate-600 text-sm max-w-sm">
          Ja existe pelo menos um administrador cadastrado. Peca acesso a ele ou
          va para a tela de login.
        </p>
        <Link href="/login" className="text-slate-900 underline text-sm">
          Ir para o login
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Configuracao inicial</h1>
        <p className="text-slate-600 text-sm mb-6">
          Crie a primeira conta de administrador do SIGF. Esta tela so funciona
          uma vez.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
