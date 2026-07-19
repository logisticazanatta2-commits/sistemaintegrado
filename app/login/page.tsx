import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BrandLockup } from "@/components/brand-mark";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/veiculos");

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
            Entrar
          </h1>
          <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
            Acesse com seu e-mail e senha.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
