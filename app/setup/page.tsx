import Link from "next/link";
import { countUsers } from "@/lib/auth";
import { BrandLockup } from "@/components/brand-mark";
import SetupForm from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const existing = await countUsers();

  if (existing > 0) {
    return (
      <main
        className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center"
        style={{ background: "var(--paper)" }}
      >
        <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
          Sistema ja configurado
        </h1>
        <p className="text-sm max-w-sm" style={{ color: "var(--text-dim)" }}>
          Ja existe pelo menos um administrador cadastrado. Peca acesso a ele ou
          va para a tela de login.
        </p>
        <Link href="/login" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          Ir para o login
        </Link>
      </main>
    );
  }

  return (
    <main
      className="flex-1 flex flex-col items-center justify-center p-8"
      style={{ background: "var(--paper)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <BrandLockup />
        </div>
        <div className="card p-6">
          <h1 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>
            Configuracao inicial
          </h1>
          <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
            Crie a primeira conta de administrador. Esta tela so funciona uma vez.
          </p>
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
