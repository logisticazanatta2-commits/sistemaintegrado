import AppHeader from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";
import UsersManager from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />
      <main className="flex-1 p-6 max-w-4xl w-full mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Usuarios</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Quem pode acessar o SIGF e com qual permissao.
        </p>
        <UsersManager currentUserId={user.id} />
      </main>
    </>
  );
}
