import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getAjustesImagem, getSlotsImagem } from "@/lib/ajustes-imagem";
import { catalogoDeArtes, listarArtesOcultas } from "@/lib/artes";
import { ehAdmin, salvarAjusteImagem, limparAjusteImagem } from "@/app/actions/admin";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  await requireUserId();
  if (!(await ehAdmin())) notFound();

  const supabase = await createClient();
  const [ajustes, slots, artes, ocultas] = await Promise.all([
    getAjustesImagem(supabase),
    getSlotsImagem(supabase),
    catalogoDeArtes(supabase),
    listarArtesOcultas(supabase),
  ]);

  return (
    <AdminClient
      artes={artes}
      ocultas={ocultas}
      ajustes={ajustes}
      slots={slots}
      onSalvar={salvarAjusteImagem}
      onLimpar={limparAjusteImagem}
    />
  );
}
