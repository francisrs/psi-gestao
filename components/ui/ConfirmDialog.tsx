"use client";

import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Excluir",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
