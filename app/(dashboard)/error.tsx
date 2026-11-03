"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-6 text-center">
      <div className="mx-auto mb-3 w-fit rounded-full bg-red-50 p-3 text-red-600">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Algo deu errado</h2>
      <p className="mt-1 text-sm text-slate-500">
        {error.message || "Nao foi possivel carregar esta pagina."}
      </p>
      <button type="button" className="btn-primary mt-4" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
