"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/sessions", label: "Sessoes", icon: CalendarDays },
  { href: "/financial", label: "Financeiro", icon: Wallet },
];

interface Props {
  displayName: string;
  children: ReactNode;
}

export function AppShell({ displayName, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // fecha o menu mobile ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-slate-200 p-3">
      <p className="truncate px-3 pb-2 text-xs text-slate-500">{displayName}</p>
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-6 py-5 text-lg font-semibold text-brand-700">
          PsiGestao
        </div>
        {nav}
        {footer}
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="text-lg font-semibold text-brand-700">PsiGestao</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-lg font-semibold text-brand-700">
                PsiGestao
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
