import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    (profile as { full_name: string | null } | null)?.full_name ||
    user.email ||
    "Minha conta";

  return (
    <ToastProvider>
      <AppShell displayName={displayName}>{children}</AppShell>
    </ToastProvider>
  );
}
