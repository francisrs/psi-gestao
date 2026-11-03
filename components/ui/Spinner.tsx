import { Loader2 } from "lucide-react";

export function Spinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
      role="status"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
