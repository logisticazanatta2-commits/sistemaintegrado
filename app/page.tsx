import Link from "next/link";
import { redirect } from "next/navigation";
import { countUsers, getCurrentUser } from "@/lib/auth";
import { BrandLockup } from "@/components/brand-mark";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
  const hasUsers = (await countUsers()) > 0;

  return (
    <main
      className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center"
      style={{ background: "var(--paper)" }}
    >
      <BrandLockup />
      <Link href={hasUsers ? "/login" : "/setup"} className="btn btn-primary">
        {hasUsers ? "Entrar" : "Configurar sistema"}
      </Link>
    </main>
  );
}
