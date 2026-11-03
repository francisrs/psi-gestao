import { redirect } from "next/navigation";

// O middleware envia usuarios sem sessao para /login;
// quem esta autenticado cai no dashboard.
export default function HomePage() {
  redirect("/dashboard");
}
