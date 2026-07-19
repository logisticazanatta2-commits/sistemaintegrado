import AppHeader from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import UsersManager from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />
      <main className="flex-1 p-6 max-w-4xl w-full mx-auto" style={{ background: "var(--paper)" }}>
        <PageHeader
          title="Usuarios"
          description="Quem pode acessar o SIGF e com qual permissao."
        />
        <UsersManager currentUserId={user.id} />
      </main>
    </>
  );
}
