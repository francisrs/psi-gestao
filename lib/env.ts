/**
 * Le as variaveis publicas do Supabase.
 * Os acessos a process.env.NEXT_PUBLIC_* precisam ser literais para que o
 * Next.js os injete no bundle do navegador.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nao configuradas. Copie .env.example para .env.local e preencha."
    );
  }

  return { url, anonKey };
}
