"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/supabase/client";
import { markSessionAsPaid } from "@/services/sessions";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/utils";

export function MarkPaidButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await markSessionAsPaid(createClient(), sessionId);
      notify("success", "Pagamento registrado.");
      router.refresh();
    } catch (e) {
      notify("error", errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <button type="button" className="btn-secondary px-3 py-1.5" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Check className="h-4 w-4" aria-hidden />
      )}
      Marcar como pago
    </button>
  );
}
