"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { createClient } from "@/supabase/client";
import { deletePatient } from "@/services/patients";
import { PatientForm } from "@/components/patients/PatientForm";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { BILLING_LABELS, errorMessage, formatCurrency } from "@/lib/utils";
import type { Patient } from "@/types/domain";

interface Props {
  userId: string;
  patients: Patient[];
  initialQuery: string;
}

export function PatientsView({ userId, patients, initialQuery }: Props) {
  const router = useRouter();
  const { notify } = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // busca com debounce: atualiza a URL e o Server Component refaz a consulta
  useEffect(() => {
    if (query === initialQuery) return;
    const timer = setTimeout(() => {
      const term = query.trim();
      router.replace(term ? `/patients?q=${encodeURIComponent(term)}` : "/patients");
    }, 300);
    return () => clearTimeout(timer);
  }, [query, initialQuery, router]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditing(patient);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deletePatient(createClient(), deleting.id);
      notify("success", "Paciente excluido.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      notify("error", errorMessage(e));
    } finally {
      setDeleteLoading(false);
    }
  }

  const hasFilter = initialQuery.trim() !== "";

  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Cadastro e informacoes de cobranca."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Novo paciente
          </button>
        }
      />

      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          className="input pl-9"
          placeholder="Buscar por nome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar paciente por nome"
        />
      </div>

      <div className="card overflow-hidden">
        {patients.length === 0 ? (
          <EmptyState
            title={hasFilter ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            description={
              hasFilter
                ? "Tente buscar por outro nome."
                : "Cadastre seu primeiro paciente para comecar."
            }
            action={
              !hasFilter && (
                <button type="button" className="btn-primary" onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Novo paciente
                </button>
              )
            }
          />
        ) : (
          <>
            {/* Tabela (tablet/desktop) */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Cobranca</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/patients/${p.id}`} className="hover:text-brand-700 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{p.phone || "-"}</div>
                      <div className="text-xs text-slate-400">{p.email || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{BILLING_LABELS[p.billing_type]}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(p.session_price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn-ghost" onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDeleting(p)} aria-label={`Excluir ${p.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cards (mobile) */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {patients.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link href={`/patients/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {p.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {BILLING_LABELS[p.billing_type]} · {formatCurrency(p.session_price)}
                    </p>
                    {(p.phone || p.email) && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {[p.phone, p.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="btn-ghost" onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDeleting(p)} aria-label={`Excluir ${p.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? "Editar paciente" : "Novo paciente"} onClose={closeForm}>
          <PatientForm
            userId={userId}
            patient={editing}
            onCancel={closeForm}
            onSaved={() => {
              closeForm();
              router.refresh();
            }}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir paciente"
          message={`Excluir ${deleting.name}? Todas as sessoes deste paciente tambem serao removidas. Esta acao nao pode ser desfeita.`}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
