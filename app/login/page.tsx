import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/veiculos");

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">SIGF</h1>
        <p className="text-slate-600 text-sm mb-6">Entrar no sistema de gestao de frota.</p>
        <LoginForm />
      </div>
    </main>
  );
}
