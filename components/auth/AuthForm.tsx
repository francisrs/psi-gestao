"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/supabase/client";
import { errorMessage } from "@/lib/utils";

interface Props {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (isSignup && !fullName.trim()) return setError("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Informe um e-mail valido.");
    if (password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      const supabase = createClient();

      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;

        if (data.session && data.user) {
          // Seguranca extra: garante o profile mesmo se o trigger do banco nao existir.
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email ?? email.trim(),
            full_name: fullName.trim(),
          });
          router.push("/dashboard");
          router.refresh();
        } else {
          setInfo(
            "Cadastro realizado! Confirme seu e-mail pelo link que enviamos e depois faca login."
          );
          setLoading(false);
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <div className="card w-full max-w-sm p-6">
      <h1 className="text-xl font-semibold text-slate-900">
        {isSignup ? "Criar conta" : "Entrar"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isSignup
          ? "Organize pacientes, sessoes e pagamentos em um so lugar."
          : "Acesse seu painel administrativo."}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {isSignup && (
          <div>
            <label htmlFor="a-name" className="label">
              Nome completo
            </label>
            <input
              id="a-name"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label htmlFor="a-email" className="label">
            E-mail
          </label>
          <input
            id="a-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="a-password" className="label">
            Senha
          </label>
          <input
            id="a-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
            {info}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isSignup ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        {isSignup ? (
          <>
            Ja tem conta?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda nao tem conta?{" "}
            <Link href="/signup" className="font-medium text-brand-700 hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
