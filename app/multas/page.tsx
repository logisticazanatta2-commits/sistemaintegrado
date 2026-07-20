import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireUserOrPublic } from "@/lib/auth";
import FinesManager from "./fines-manager";

export const dynamic = "force-dynamic";

export default async function MultasPage() {
  const user = await requireUserOrPublic();

  return (
    <AppShell user={user}>
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl w-full mx-auto">
          <PageHeader
            title="Gestao de Multas e Infracoes"
            description="Do recebimento da notificacao ate indicacao de condutor, pagamento, desconto e recurso."
          />
          <FinesManager canEdit={user.role === "admin"} />
        </div>
      </main>
    </AppShell>
  );
}
