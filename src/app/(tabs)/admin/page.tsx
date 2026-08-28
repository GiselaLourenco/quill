import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getAjustesImagem, getSlotsImagem } from "@/lib/ajustes-imagem";
import { listarArtes } from "@/lib/artes";
import { ehAdmin, salvarAjusteImagem, limparAjusteImagem } from "@/app/actions/admin";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  await requireUserId();
  if (!(await ehAdmin())) notFound();

  const supabase = await createClient();
  const [ajustes, slots] = await Promise.all([
    getAjustesImagem(supabase),
    getSlotsImagem(supabase),
  ]);

  return (
    <AdminClient
      artes={listarArtes()}
      ajustes={ajustes}
      slots={slots}
      onSalvar={salvarAjusteImagem}
      onLimpar={limparAjusteImagem}
    />
  );
}
