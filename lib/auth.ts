import { redirect } from "next/navigation";
import { createClient } from "@/supabase/server";

/** Para Server Components: retorna o cliente e o usuario, ou redireciona ao login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return { supabase, user };
}
