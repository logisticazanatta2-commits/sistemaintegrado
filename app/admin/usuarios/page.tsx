import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import UsersManager from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireAdmin();

  return (
    <AppShell user={user}>
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-4xl w-full mx-auto">
          <PageHeader
            title="Usuarios"
            description="Quem pode acessar o SIGF e com qual permissao."
          />
          <UsersManager currentUserId={user.id} />
        </div>
      </main>
    </AppShell>
  );
}
