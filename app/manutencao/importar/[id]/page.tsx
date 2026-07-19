import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import ImportReview from "./import-review";

export const dynamic = "force-dynamic";

export default async function ImportarPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;

  return (
    <AppShell user={user}>
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl w-full mx-auto">
          <PageHeader
            title="Revisar importacao"
            description="Confira e ajuste os dados extraidos do PDF antes de lancar no historico de manutencao."
          />
          <ImportReview importId={Number(id)} />
        </div>
      </main>
    </AppShell>
  );
}
