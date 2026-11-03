import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}

export function SummaryCard({ label, value, icon: Icon, hint }: Props) {
  return (
    <div className="card flex items-start justify-between p-4">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
    </div>
  );
}
