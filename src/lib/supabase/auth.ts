import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Checagem "otimista" de identidade — usa getClaims() (verificado), não
// getSession(). Usar perto dos dados/página, não só confiar no proxy.
export async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return userId;
}
