import VehiclesManager from "./vehicles-manager";

export const dynamic = "force-dynamic";

export default function VeiculosPage() {
  return (
    <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Cadastro de Veiculos</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Veiculos, equipamentos e particulares vinculados a frota.
      </p>
      <VehiclesManager />
    </main>
  );
}
